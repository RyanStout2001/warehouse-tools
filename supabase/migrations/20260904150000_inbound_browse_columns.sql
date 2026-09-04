-- Extra PO / receipt fields so the Inbound page can show line items and supplier info.

alter table public.picqer_purchase_orders
  add column if not exists supplier_name text,
  add column if not exists supplier_orderid text,
  add column if not exists idwarehouse bigint,
  add column if not exists delivery_date text,
  add column if not exists remarks text,
  add column if not exists created_at_picqer timestamptz,
  add column if not exists is_return_supplier boolean not null default false,
  add column if not exists products_count integer not null default 0,
  add column if not exists amount_ordered numeric not null default 0,
  add column if not exists amount_received numeric not null default 0,
  add column if not exists products jsonb not null default '[]'::jsonb;

alter table public.processed_receipts
  add column if not exists receiptid text,
  add column if not exists status text,
  add column if not exists idsupplier bigint,
  add column if not exists supplier_name text,
  add column if not exists idpurchaseorder bigint,
  add column if not exists purchaseorderid text,
  add column if not exists products_count integer not null default 0,
  add column if not exists amount numeric not null default 0,
  add column if not exists products jsonb not null default '[]'::jsonb;

create index if not exists picqer_purchase_orders_purchaseorderid_idx
  on public.picqer_purchase_orders (purchaseorderid);

create index if not exists processed_receipts_completed_at_idx
  on public.processed_receipts (completed_at desc);
