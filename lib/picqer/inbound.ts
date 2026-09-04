import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { picqerGet, picqerGetAllPages } from "@/lib/picqer/client";
import type {
  CachedPurchaseOrderProduct,
  CachedReceiptProduct,
  PicqerPurchaseOrder,
  PicqerPurchaseOrderStatus,
  PicqerReceipt,
} from "@/lib/picqer/types";

const UPSERT_CHUNK = 100;
const DEFAULT_RETURN_SUPPLIER_ID = 96976;

export type InboundBaselineResult = {
  purchaseOrders: number;
  picqerRequestCount: number;
  syncedAt: string;
};

export type InboundRefreshResult = {
  receiptsSeen: number;
  receiptsApplied: number;
  receiptsSkippedReturn: number;
  cooldownsCleared: number;
  purchaseOrdersUpdated: number;
  purchaseOrdersFlipped: number;
  surplusLines: number;
  picqerRequestCount: number;
  syncedAt: string;
};

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function picqerDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function toIso(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapPurchaseOrderProducts(
  po: PicqerPurchaseOrder,
): CachedPurchaseOrderProduct[] {
  return (po.products ?? []).map((line) => ({
    idproduct: line.idproduct,
    productcode: line.productcode ?? null,
    name: line.name ?? null,
    amount: toNumber(line.amount),
    amountreceived: toNumber(line.amountreceived),
  }));
}

function mapReceiptProducts(receipt: PicqerReceipt): CachedReceiptProduct[] {
  return (receipt.products ?? []).map((line) => ({
    idproduct: line.idproduct,
    idpurchaseorder: line.idpurchaseorder ?? null,
    productcode: line.productcode ?? null,
    name: line.name ?? null,
    amount: toNumber(line.amount),
    reverted_at: line.reverted_at ?? null,
  }));
}

function mapPurchaseOrderRow(
  po: PicqerPurchaseOrder,
  syncedAt: string,
  returnSupplierId: number,
) {
  const products = mapPurchaseOrderProducts(po);
  const amountOrdered = products.reduce((sum, line) => sum + line.amount, 0);
  const amountReceived = products.reduce(
    (sum, line) => sum + line.amountreceived,
    0,
  );
  const supplierName =
    po.supplier_name ?? po.supplier?.name ?? null;
  const supplierId = po.idsupplier ?? po.supplier?.idsupplier ?? null;

  return {
    id: po.idpurchaseorder,
    status: parsePoStatus(po.status),
    idsupplier: supplierId,
    purchaseorderid:
      po.purchaseorderid == null ? null : String(po.purchaseorderid),
    supplier_name: supplierName,
    supplier_orderid: po.supplier_orderid ?? null,
    idwarehouse: po.idwarehouse ?? null,
    delivery_date: po.delivery_date ?? null,
    remarks: po.remarks ?? null,
    created_at_picqer: toIso(po.created),
    is_return_supplier: supplierId === returnSupplierId,
    products_count: products.length,
    amount_ordered: amountOrdered,
    amount_received: amountReceived,
    products,
    updated_at_picqer: toIso(po.updated),
    last_seen_at: syncedAt,
  };
}

function mapProcessedReceiptRow(
  receipt: PicqerReceipt,
  skippedReturn: boolean,
) {
  const products = mapReceiptProducts(receipt);
  return {
    id: receipt.idreceipt,
    receiptid: receipt.receiptid == null ? null : String(receipt.receiptid),
    status: receipt.status ?? null,
    completed_at: toIso(receipt.completed_at),
    skipped_return: skippedReturn,
    idsupplier: receipt.supplier?.idsupplier ?? null,
    supplier_name: receipt.supplier?.name ?? null,
    idpurchaseorder: receipt.purchaseorder?.idpurchaseorder ?? null,
    purchaseorderid:
      receipt.purchaseorder?.purchaseorderid == null
        ? null
        : String(receipt.purchaseorder.purchaseorderid),
    products_count: products.length,
    amount: products.reduce((sum, line) => sum + line.amount, 0),
    products,
  };
}

function parsePoStatus(value: string): PicqerPurchaseOrderStatus {
  if (
    value === "concept" ||
    value === "purchased" ||
    value === "received" ||
    value === "cancelled"
  ) {
    return value;
  }
  return "concept";
}

async function getReturnSupplierId(): Promise<number> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("global_settings")
    .select("return_supplier_id")
    .eq("id", 1)
    .maybeSingle();
  return data?.return_supplier_id ?? DEFAULT_RETURN_SUPPLIER_ID;
}

async function getSyncState() {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("inbound_sync_state")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    throw new Error(
      `Could not load inbound_sync_state: ${error.message}. Apply the inbound SQL migration.`,
    );
  }
  if (!data) {
    throw new Error("inbound_sync_state row is missing. Apply the inbound SQL migration.");
  }
  return data;
}

export async function getInboundSyncState() {
  try {
    return await getSyncState();
  } catch {
    return null;
  }
}

export async function snapshotPurchaseOrders(): Promise<InboundBaselineResult> {
  const syncedAt = new Date().toISOString();
  const admin = createAdminSupabaseClient();
  const returnSupplierId = await getReturnSupplierId();
  const page = await picqerGetAllPages<PicqerPurchaseOrder>("/purchaseorders");

  const rows = page.items.map((po) =>
    mapPurchaseOrderRow(po, syncedAt, returnSupplierId),
  );

  for (const group of chunk(rows, UPSERT_CHUNK)) {
    const { error } = await admin
      .from("picqer_purchase_orders")
      .upsert(group, { onConflict: "id" });
    if (error) {
      throw new Error(`Could not save purchase orders: ${error.message}`);
    }
  }

  const { error: stateError } = await admin.from("inbound_sync_state").upsert({
    id: 1,
    po_watermark: syncedAt,
    receipts_watermark: syncedAt,
    baseline_completed_at: syncedAt,
    updated_at: syncedAt,
  });
  if (stateError) {
    throw new Error(`Could not save inbound sync state: ${stateError.message}`);
  }

  return {
    purchaseOrders: rows.length,
    picqerRequestCount: page.requestCount,
    syncedAt,
  };
}

export async function refreshInbound(): Promise<InboundRefreshResult> {
  const state = await getSyncState();
  if (!state.baseline_completed_at) {
    throw new Error("Snapshot purchase orders first so existing POs are not treated as new surplus.");
  }

  const syncedAt = new Date().toISOString();
  const receipts = await syncCompletedReceipts(state.receipts_watermark);
  const pos = await refreshPurchaseOrderStatuses(state.po_watermark);

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("inbound_sync_state")
    .update({
      po_watermark: syncedAt,
      receipts_watermark: syncedAt,
      updated_at: syncedAt,
    })
    .eq("id", 1);
  if (error) {
    throw new Error(`Could not update inbound watermarks: ${error.message}`);
  }

  return {
    ...receipts,
    ...pos,
    picqerRequestCount: receipts.picqerRequestCount + pos.picqerRequestCount,
    syncedAt,
  };
}

export async function applyCompletedReceipt(receipt: PicqerReceipt) {
  const returnSupplierId = await getReturnSupplierId();
  return applyReceipts([receipt], returnSupplierId);
}

async function syncCompletedReceipts(watermark: string | null) {
  const params: Record<string, string> = { status: "completed" };
  if (watermark) {
    params.completed_after = picqerDateTime(watermark);
  }

  const page = await picqerGetAllPages<PicqerReceipt>("/receipts", params);
  const returnSupplierId = await getReturnSupplierId();
  const applied = await applyReceipts(page.items, returnSupplierId);
  return { ...applied, picqerRequestCount: page.requestCount };
}

async function applyReceipts(receipts: PicqerReceipt[], returnSupplierId: number) {
  const admin = createAdminSupabaseClient();
  const ids = receipts.map((row) => row.idreceipt);
  const already = new Set<number>();
  if (ids.length > 0) {
    const { data: existing } = await admin
      .from("processed_receipts")
      .select("id")
      .in("id", ids);
    for (const row of existing ?? []) {
      already.add(row.id);
    }
  }

  let receiptsApplied = 0;
  let receiptsSkippedReturn = 0;
  const cooldownIds = new Set<number>();

  for (const receipt of receipts) {
    if (already.has(receipt.idreceipt)) {
      continue;
    }

    const poIds = collectReceiptPoIds(receipt);
    const supplierByPo = await loadSuppliersForPos(poIds);
    const receiptSupplier = receipt.supplier?.idsupplier ?? null;

    const products = receipt.products ?? [];
    const clearIds: number[] = [];
    for (const line of products) {
      if (toNumber(line.amount) <= 0 || line.reverted_at) {
        continue;
      }
      const poId = line.idpurchaseorder ?? receipt.purchaseorder?.idpurchaseorder ?? null;
      const supplierId =
        (poId != null ? supplierByPo.get(poId) : undefined) ?? receiptSupplier;
      if (supplierId === returnSupplierId) {
        continue;
      }
      clearIds.push(line.idproduct);
    }

    const skippedReturn = clearIds.length === 0;

    const { error } = await admin
      .from("processed_receipts")
      .insert(mapProcessedReceiptRow(receipt, skippedReturn));
    if (error && !/duplicate|unique/i.test(error.message)) {
      throw new Error(`Could not record receipt ${receipt.idreceipt}: ${error.message}`);
    }

    receiptsApplied += 1;
    if (skippedReturn) {
      receiptsSkippedReturn += 1;
    }
    for (const id of clearIds) {
      cooldownIds.add(id);
    }
  }

  let cooldownsCleared = 0;
  const idList = [...cooldownIds];
  for (const group of chunk(idList, UPSERT_CHUNK)) {
    const { data, error } = await admin
      .from("products")
      .update({
        balance_cooldown_until: null,
        updated_at: new Date().toISOString(),
      })
      .in("id", group)
      .select("id");
    if (error) {
      throw new Error(`Could not clear cooldowns: ${error.message}`);
    }
    cooldownsCleared += data?.length ?? 0;
  }

  return {
    receiptsSeen: receipts.length,
    receiptsApplied,
    receiptsSkippedReturn,
    cooldownsCleared,
  };
}

function collectReceiptPoIds(receipt: PicqerReceipt): number[] {
  const ids = new Set<number>();
  if (receipt.purchaseorder?.idpurchaseorder) {
    ids.add(receipt.purchaseorder.idpurchaseorder);
  }
  for (const line of receipt.products ?? []) {
    if (line.idpurchaseorder) {
      ids.add(line.idpurchaseorder);
    }
  }
  return [...ids];
}

async function loadSuppliersForPos(poIds: number[]): Promise<Map<number, number | null>> {
  const map = new Map<number, number | null>();
  if (poIds.length === 0) {
    return map;
  }
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("picqer_purchase_orders")
    .select("id,idsupplier")
    .in("id", poIds);
  if (error) {
    throw new Error(error.message);
  }
  for (const row of data ?? []) {
    map.set(row.id, row.idsupplier);
  }

  const missing = poIds.filter((id) => !map.has(id));
  const returnSupplierId = await getReturnSupplierId();
  for (const id of missing) {
    const page = await picqerGet<PicqerPurchaseOrder>(`/purchaseorders/${id}`);
    const po = page.data;
    map.set(id, po.idsupplier ?? po.supplier?.idsupplier ?? null);
    await admin
      .from("picqer_purchase_orders")
      .upsert(
        mapPurchaseOrderRow(po, new Date().toISOString(), returnSupplierId),
      );
  }
  return map;
}

async function refreshPurchaseOrderStatuses(watermark: string | null) {
  const returnSupplierId = await getReturnSupplierId();
  const params: Record<string, string> = {};
  if (watermark) {
    params.updated_after = picqerDateTime(watermark);
  }

  const page = watermark
    ? await picqerGetAllPages<PicqerPurchaseOrder>("/purchaseorders", params)
    : await picqerGetAllPages<PicqerPurchaseOrder>("/purchaseorders");

  const admin = createAdminSupabaseClient();
  const ids = page.items.map((po) => po.idpurchaseorder);
  const previous = new Map<number, string>();
  if (ids.length > 0) {
    const { data } = await admin
      .from("picqer_purchase_orders")
      .select("id,status")
      .in("id", ids);
    for (const row of data ?? []) {
      previous.set(row.id, row.status);
    }
  }

  let purchaseOrdersFlipped = 0;
  const surplusByProduct = new Map<number, number>();
  const now = new Date().toISOString();

  for (const po of page.items) {
    const nextStatus = parsePoStatus(po.status);
    const prev = previous.get(po.idpurchaseorder);
    const skipReturn = po.idsupplier === returnSupplierId;

    if (prev === "purchased" && nextStatus === "received" && !skipReturn) {
      purchaseOrdersFlipped += 1;
      for (const line of po.products ?? []) {
        const ordered = toNumber(line.amount);
        const received = toNumber(line.amountreceived);
        if (ordered > 0 && received > ordered) {
          const extra = received - ordered;
          surplusByProduct.set(
            line.idproduct,
            (surplusByProduct.get(line.idproduct) ?? 0) + extra,
          );
        }
      }
    }
  }

  const rows = page.items.map((po) =>
    mapPurchaseOrderRow(po, now, returnSupplierId),
  );

  for (const group of chunk(rows, UPSERT_CHUNK)) {
    const { error } = await admin
      .from("picqer_purchase_orders")
      .upsert(group, { onConflict: "id" });
    if (error) {
      throw new Error(`Could not save purchase orders: ${error.message}`);
    }
  }

  let surplusLines = 0;
  for (const [productId, extra] of surplusByProduct) {
    const { data: product, error: loadError } = await admin
      .from("products")
      .select("id,temporary_stock_threshold")
      .eq("id", productId)
      .maybeSingle();
    if (loadError) {
      throw new Error(loadError.message);
    }
    if (!product) {
      continue;
    }
    const next = toNumber(product.temporary_stock_threshold) + extra;
    const { error } = await admin
      .from("products")
      .update({
        temporary_stock_threshold: next,
        updated_at: now,
      })
      .eq("id", productId);
    if (error) {
      throw new Error(`Could not set surplus for product ${productId}: ${error.message}`);
    }
    surplusLines += 1;
  }

  return {
    purchaseOrdersUpdated: rows.length,
    purchaseOrdersFlipped,
    surplusLines,
    picqerRequestCount: page.requestCount,
  };
}
