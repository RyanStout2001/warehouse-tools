import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getInboundSyncState } from "@/lib/picqer/inbound";
import type { Database } from "@/lib/supabase/database.types";
import type {
  CachedPurchaseOrderProduct,
  CachedReceiptProduct,
} from "@/lib/picqer/types";

export const INBOUND_PAGE_SIZE = 40;

export type PurchaseOrderStatus =
  Database["public"]["Tables"]["picqer_purchase_orders"]["Row"]["status"];

export type PurchaseOrderBrowseRow =
  Database["public"]["Tables"]["picqer_purchase_orders"]["Row"];

export type ReceiptBrowseRow =
  Database["public"]["Tables"]["processed_receipts"]["Row"];

export type InboundView = "orders" | "receipts";

export type PurchaseOrderStatusFilter =
  | "open"
  | "all"
  | PurchaseOrderStatus
  | "return";

export type ReceiptKindFilter = "all" | "applied" | "return";

export type InboundFilters = {
  view: InboundView;
  page: number;
  q: string;
  status: PurchaseOrderStatusFilter;
  receipts: ReceiptKindFilter;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function sanitizeSearch(q: string): string {
  return q.replace(/[%_,]/g, " ").slice(0, 80);
}

function pageRange(page: number, total: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page: safePage, from, to, pageCount };
}

export function parseInboundFilters(searchParams: {
  [key: string]: string | string[] | undefined;
}): InboundFilters {
  const page = Math.max(1, Number(firstParam(searchParams.page)) || 1);
  const q = (firstParam(searchParams.q) ?? "").trim();
  const viewRaw = firstParam(searchParams.view);
  const view: InboundView = viewRaw === "receipts" ? "receipts" : "orders";
  const statusRaw = firstParam(searchParams.status) ?? "open";
  const status: PurchaseOrderStatusFilter =
    statusRaw === "all" ||
    statusRaw === "concept" ||
    statusRaw === "purchased" ||
    statusRaw === "received" ||
    statusRaw === "cancelled" ||
    statusRaw === "return"
      ? statusRaw
      : "open";
  const receiptsRaw = firstParam(searchParams.receipts) ?? "all";
  const receipts: ReceiptKindFilter =
    receiptsRaw === "applied" || receiptsRaw === "return"
      ? receiptsRaw
      : "all";
  return { view, page, q, status, receipts };
}

export function parseCachedPoProducts(
  value: unknown,
): CachedPurchaseOrderProduct[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const row = item as Record<string, unknown>;
    const idproduct = Number(row.idproduct);
    if (!Number.isFinite(idproduct)) {
      return [];
    }
    return [
      {
        idproduct,
        productcode:
          row.productcode == null ? null : String(row.productcode),
        name: row.name == null ? null : String(row.name),
        amount: Number(row.amount) || 0,
        amountreceived: Number(row.amountreceived) || 0,
      },
    ];
  });
}

export function parseCachedReceiptProducts(
  value: unknown,
): CachedReceiptProduct[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const row = item as Record<string, unknown>;
    const idproduct = Number(row.idproduct);
    if (!Number.isFinite(idproduct)) {
      return [];
    }
    return [
      {
        idproduct,
        idpurchaseorder:
          row.idpurchaseorder == null ? null : Number(row.idpurchaseorder),
        productcode:
          row.productcode == null ? null : String(row.productcode),
        name: row.name == null ? null : String(row.name),
        amount: Number(row.amount) || 0,
        reverted_at:
          row.reverted_at == null ? null : String(row.reverted_at),
      },
    ];
  });
}

export type InboundSummary = {
  baselineCompletedAt: string | null;
  poWatermark: string | null;
  receiptsWatermark: string | null;
  updatedAt: string | null;
  purchaseOrders: number;
  concept: number;
  purchased: number;
  received: number;
  cancelled: number;
  receipts: number;
  receiptsReturn: number;
  error: string | null;
};

export async function getInboundSummary(): Promise<InboundSummary> {
  const state = await getInboundSyncState();
  const empty: InboundSummary = {
    baselineCompletedAt: state?.baseline_completed_at ?? null,
    poWatermark: state?.po_watermark ?? null,
    receiptsWatermark: state?.receipts_watermark ?? null,
    updatedAt: state?.updated_at ?? null,
    purchaseOrders: 0,
    concept: 0,
    purchased: 0,
    received: 0,
    cancelled: 0,
    receipts: 0,
    receiptsReturn: 0,
    error: null,
  };

  try {
    const admin = createAdminSupabaseClient();
    const [
      all,
      concept,
      purchased,
      received,
      cancelled,
      receipts,
      receiptsReturn,
    ] = await Promise.all([
      admin.from("picqer_purchase_orders").select("*", { count: "exact", head: true }),
      admin
        .from("picqer_purchase_orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "concept"),
      admin
        .from("picqer_purchase_orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "purchased"),
      admin
        .from("picqer_purchase_orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "received"),
      admin
        .from("picqer_purchase_orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "cancelled"),
      admin.from("processed_receipts").select("*", { count: "exact", head: true }),
      admin
        .from("processed_receipts")
        .select("*", { count: "exact", head: true })
        .eq("skipped_return", true),
    ]);

    const firstError =
      all.error?.message ||
      concept.error?.message ||
      purchased.error?.message ||
      received.error?.message ||
      cancelled.error?.message ||
      receipts.error?.message ||
      receiptsReturn.error?.message ||
      null;

    return {
      ...empty,
      purchaseOrders: all.count ?? 0,
      concept: concept.count ?? 0,
      purchased: purchased.count ?? 0,
      received: received.count ?? 0,
      cancelled: cancelled.count ?? 0,
      receipts: receipts.count ?? 0,
      receiptsReturn: receiptsReturn.count ?? 0,
      error: firstError,
    };
  } catch (error) {
    return {
      ...empty,
      error: error instanceof Error ? error.message : "Could not load inbound stats",
    };
  }
}

function applyPoSearch<T extends { or: (filter: string) => T }>(
  query: T,
  q: string,
): T {
  if (!q) {
    return query;
  }
  const safe = sanitizeSearch(q);
  const id = Number(q);
  const parts = [
    `purchaseorderid.ilike.%${safe}%`,
    `supplier_name.ilike.%${safe}%`,
    `supplier_orderid.ilike.%${safe}%`,
  ];
  if (Number.isFinite(id)) {
    parts.push(`id.eq.${id}`);
    parts.push(`idsupplier.eq.${id}`);
  }
  return query.or(parts.join(","));
}

function applyReceiptSearch<T extends { or: (filter: string) => T }>(
  query: T,
  q: string,
): T {
  if (!q) {
    return query;
  }
  const safe = sanitizeSearch(q);
  const id = Number(q);
  const parts = [
    `receiptid.ilike.%${safe}%`,
    `supplier_name.ilike.%${safe}%`,
    `purchaseorderid.ilike.%${safe}%`,
  ];
  if (Number.isFinite(id)) {
    parts.push(`id.eq.${id}`);
    parts.push(`idpurchaseorder.eq.${id}`);
    parts.push(`idsupplier.eq.${id}`);
  }
  return query.or(parts.join(","));
}

export async function listPurchaseOrdersBrowse(filters: InboundFilters) {
  const admin = createAdminSupabaseClient();
  let countQuery = admin
    .from("picqer_purchase_orders")
    .select("*", { count: "exact", head: true });
  let dataQuery = admin
    .from("picqer_purchase_orders")
    .select("*")
    .order("updated_at_picqer", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (filters.status === "open") {
    countQuery = countQuery.in("status", ["concept", "purchased"]);
    dataQuery = dataQuery.in("status", ["concept", "purchased"]);
  } else if (filters.status === "return") {
    countQuery = countQuery.eq("is_return_supplier", true);
    dataQuery = dataQuery.eq("is_return_supplier", true);
  } else if (filters.status !== "all") {
    countQuery = countQuery.eq("status", filters.status);
    dataQuery = dataQuery.eq("status", filters.status);
  }

  countQuery = applyPoSearch(countQuery, filters.q);
  dataQuery = applyPoSearch(dataQuery, filters.q);

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new Error(countError.message);
  }

  const total = count ?? 0;
  const { page, from, to } = pageRange(filters.page, total, INBOUND_PAGE_SIZE);
  if (total === 0) {
    return { rows: [] as PurchaseOrderBrowseRow[], total, page };
  }

  const { data, error } = await dataQuery.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  return { rows: (data ?? []) as PurchaseOrderBrowseRow[], total, page };
}

export async function listReceiptsBrowse(filters: InboundFilters) {
  const admin = createAdminSupabaseClient();
  let countQuery = admin
    .from("processed_receipts")
    .select("*", { count: "exact", head: true });
  let dataQuery = admin
    .from("processed_receipts")
    .select("*")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (filters.receipts === "applied") {
    countQuery = countQuery.eq("skipped_return", false);
    dataQuery = dataQuery.eq("skipped_return", false);
  } else if (filters.receipts === "return") {
    countQuery = countQuery.eq("skipped_return", true);
    dataQuery = dataQuery.eq("skipped_return", true);
  }

  countQuery = applyReceiptSearch(countQuery, filters.q);
  dataQuery = applyReceiptSearch(dataQuery, filters.q);

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new Error(countError.message);
  }

  const total = count ?? 0;
  const { page, from, to } = pageRange(filters.page, total, INBOUND_PAGE_SIZE);
  if (total === 0) {
    return { rows: [] as ReceiptBrowseRow[], total, page };
  }

  const { data, error } = await dataQuery.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  return { rows: (data ?? []) as ReceiptBrowseRow[], total, page };
}

export async function getPurchaseOrder(id: number) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("picqer_purchase_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data as PurchaseOrderBrowseRow | null;
}

export async function getProcessedReceipt(id: number) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("processed_receipts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data as ReceiptBrowseRow | null;
}

export async function getProductLabels(ids: number[]) {
  if (ids.length === 0) {
    return new Map<
      number,
      { productcode: string; name: string; shop_name: string }
    >();
  }
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("products")
    .select("id,productcode,name,shops(name)")
    .in("id", ids);
  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<
    number,
    { productcode: string; name: string; shop_name: string }
  >();
  for (const row of data ?? []) {
    const shop = row.shops as { name: string } | { name: string }[] | null;
    const shop_name = Array.isArray(shop)
      ? (shop[0]?.name ?? "—")
      : (shop?.name ?? "—");
    map.set(row.id, {
      productcode: row.productcode,
      name: row.name,
      shop_name,
    });
  }
  return map;
}
