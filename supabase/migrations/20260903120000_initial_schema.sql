-- Step 1: initial warehouse-tools schema.
-- Picqer IDs are used as primary keys so later GET-syncs can upsert by id.

-- ---------------------------------------------------------------------------
-- shops (Picqer fulfilment customers)
-- ---------------------------------------------------------------------------
create table public.shops (
  id bigint primary key,
  name text not null,
  active boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- products (Picqer catalog + balancing state)
-- ---------------------------------------------------------------------------
create table public.products (
  id bigint primary key,
  shop_id bigint not null references public.shops (id) on delete restrict,
  productcode text not null,
  barcode text,
  name text not null,
  product_type text not null default 'normal',
  active boolean not null default true,
  pick_velocity numeric not null default 0,
  current_stock numeric not null default 0,
  free_stock numeric not null default 0,
  idwarehouse bigint,
  abc_class text,
  balance_need boolean not null default false,
  balance_reason text,
  balance_reason_label text,
  last_balanced_at timestamptz,
  balance_cooldown_until timestamptz,
  temporary_stock_threshold numeric,
  picqer_updated_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_abc_class_check
    check (abc_class is null or abc_class in ('A', 'B', 'C')),
  constraint products_balance_reason_check
    check (
      balance_reason is null
      or balance_reason in (
        'time_oos',
        'stock_amount',
        'time_based',
        'inbound_surplus'
      )
    )
);

create index products_shop_id_idx on public.products (shop_id);
create index products_balance_need_idx on public.products (balance_need)
  where balance_need = true;
create index products_productcode_idx on public.products (productcode);
create index products_barcode_idx on public.products (barcode);

-- ---------------------------------------------------------------------------
-- settings: product override > shop override > global defaults
-- Nullable columns on shop/product rows mean "inherit from the parent level".
-- ---------------------------------------------------------------------------
create table public.global_settings (
  id smallint primary key default 1,
  class_a_min_velocity numeric not null default 30,
  class_b_min_velocity numeric not null default 10,
  balance_threshold_days numeric not null default 3,
  stock_amount_threshold integer not null default 5,
  max_days_without_balance integer not null default 90,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint global_settings_singleton check (id = 1)
);

insert into public.global_settings (id) values (1);

create table public.shop_settings (
  shop_id bigint primary key references public.shops (id) on delete cascade,
  class_a_min_velocity numeric,
  class_b_min_velocity numeric,
  balance_threshold_days numeric,
  stock_amount_threshold integer,
  max_days_without_balance integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_settings (
  product_id bigint primary key references public.products (id) on delete cascade,
  class_a_min_velocity numeric,
  class_b_min_velocity numeric,
  balance_threshold_days numeric,
  stock_amount_threshold integer,
  max_days_without_balance integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- balance_events (physical counts marked complete in the app)
-- ---------------------------------------------------------------------------
create table public.balance_events (
  id uuid primary key default gen_random_uuid(),
  product_id bigint not null references public.products (id) on delete cascade,
  trigger_reason text not null,
  counted_stock numeric,
  notes text,
  counted_at timestamptz not null default now(),
  constraint balance_events_trigger_reason_check
    check (
      trigger_reason in (
        'time_oos',
        'stock_amount',
        'time_based',
        'inbound_surplus'
      )
    )
);

create index balance_events_product_id_idx on public.balance_events (product_id);
create index balance_events_counted_at_idx on public.balance_events (counted_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: tables are not publicly readable until we add Auth
-- policies in a later step.
-- ---------------------------------------------------------------------------
alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.global_settings enable row level security;
alter table public.shop_settings enable row level security;
alter table public.product_settings enable row level security;
alter table public.balance_events enable row level security;
