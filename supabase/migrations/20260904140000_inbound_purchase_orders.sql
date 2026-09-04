-- Inbound: PO status snapshot, processed receipts, return-supplier config.

alter table public.global_settings
  add column if not exists return_supplier_id bigint;

update public.global_settings
set return_supplier_id = 96976
where id = 1 and return_supplier_id is null;

create table if not exists public.picqer_purchase_orders (
  id bigint primary key,
  status text not null,
  idsupplier bigint,
  purchaseorderid text,
  updated_at_picqer timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint picqer_purchase_orders_status_check
    check (status in ('concept', 'purchased', 'received', 'cancelled'))
);

create index if not exists picqer_purchase_orders_status_idx
  on public.picqer_purchase_orders (status);

create table if not exists public.inbound_sync_state (
  id smallint primary key default 1,
  po_watermark timestamptz,
  receipts_watermark timestamptz,
  baseline_completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint inbound_sync_state_singleton check (id = 1)
);

insert into public.inbound_sync_state (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.processed_receipts (
  id bigint primary key,
  completed_at timestamptz,
  skipped_return boolean not null default false,
  processed_at timestamptz not null default now()
);

alter table public.picqer_purchase_orders enable row level security;
alter table public.inbound_sync_state enable row level security;
alter table public.processed_receipts enable row level security;
