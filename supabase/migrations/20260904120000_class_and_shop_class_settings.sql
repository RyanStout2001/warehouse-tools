-- Class-level defaults and shop×class overrides.
-- products.days_of_cover supports urgency sorting on the count list.

alter table public.products
  add column if not exists days_of_cover numeric;

create index if not exists products_abc_class_idx on public.products (abc_class);
create index if not exists products_days_of_cover_idx on public.products (days_of_cover);

create table if not exists public.class_settings (
  abc_class text primary key,
  balance_threshold_days numeric,
  stock_amount_threshold integer,
  max_days_without_balance integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_settings_abc_check check (abc_class in ('A', 'B', 'C'))
);

insert into public.class_settings (
  abc_class,
  balance_threshold_days,
  stock_amount_threshold,
  max_days_without_balance
) values
  ('A', 3, null, 30),
  ('B', 5, null, 60),
  ('C', null, 5, 90)
on conflict (abc_class) do nothing;

create table if not exists public.shop_class_settings (
  shop_id bigint not null references public.shops (id) on delete cascade,
  abc_class text not null,
  balance_threshold_days numeric,
  stock_amount_threshold integer,
  max_days_without_balance integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (shop_id, abc_class),
  constraint shop_class_settings_abc_check check (abc_class in ('A', 'B', 'C'))
);

alter table public.class_settings enable row level security;
alter table public.shop_class_settings enable row level security;
