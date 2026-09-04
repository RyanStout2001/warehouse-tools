import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { picqerGetAllPages } from "@/lib/picqer/client";
import type { PicqerFulfilmentCustomer, PicqerProduct } from "@/lib/picqer/types";
import type { Database } from "@/lib/supabase/database.types";

const UPSERT_CHUNK = 100;

type ShopInsert = Database["public"]["Tables"]["shops"]["Insert"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];

export type PicqerSyncResult = {
  shopsUpserted: number;
  productsUpserted: number;
  productsSkippedWithoutShop: number;
  shopsMarkedInactive: number;
  productsMarkedInactive: number;
  picqerRequestCount: number;
  rateLimitRemaining: number | null;
  syncedAt: string;
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

export async function syncPicqerCatalog(): Promise<PicqerSyncResult> {
  const syncedAt = new Date().toISOString();
  const admin = createAdminSupabaseClient();

  const shopsPage = await picqerGetAllPages<PicqerFulfilmentCustomer>(
    "/fulfilment/customers",
  );
  const shopRows: ShopInsert[] = shopsPage.items.map((shop) => ({
    id: shop.idfulfilment_customer,
    name: shop.name,
    active: true,
    last_synced_at: syncedAt,
    updated_at: syncedAt,
  }));

  for (const group of chunk(shopRows, UPSERT_CHUNK)) {
    const { error } = await admin.from("shops").upsert(group, { onConflict: "id" });
    if (error) {
      throw new Error(`Supabase shops upsert failed: ${error.message}`);
    }
  }

  const shopIds = new Set(shopRows.map((row) => row.id));

  const productsPage = await picqerGetAllPages<PicqerProduct>("/products");
  const productRows: ProductInsert[] = [];
  let productsSkippedWithoutShop = 0;

  for (const product of productsPage.items) {
    const shopId = product.idfulfilment_customer;
    if (shopId == null || !shopIds.has(shopId)) {
      productsSkippedWithoutShop += 1;
      continue;
    }

    const stock = product.stock?.[0];
    productRows.push({
      id: product.idproduct,
      shop_id: shopId,
      productcode: product.productcode,
      barcode: product.barcode?.trim() ? product.barcode : null,
      name: product.name,
      product_type: product.type ?? "normal",
      active: product.active !== false,
      pick_velocity: toNumber(product.analysis_pick_amount_per_day, 0),
      current_stock: toNumber(stock?.stock, 0),
      free_stock: toNumber(stock?.freestock, 0),
      idwarehouse: stock?.idwarehouse ?? null,
      picqer_updated_at: product.updated ?? null,
      last_synced_at: syncedAt,
      updated_at: syncedAt,
    });
  }

  for (const group of chunk(productRows, UPSERT_CHUNK)) {
    const { error } = await admin.from("products").upsert(group, { onConflict: "id" });
    if (error) {
      throw new Error(`Supabase products upsert failed: ${error.message}`);
    }
  }

  const shopsMarkedInactive = await markStaleInactive(admin, "shops", syncedAt);
  const productsMarkedInactive = await markStaleInactive(
    admin,
    "products",
    syncedAt,
  );

  return {
    shopsUpserted: shopRows.length,
    productsUpserted: productRows.length,
    productsSkippedWithoutShop,
    shopsMarkedInactive,
    productsMarkedInactive,
    picqerRequestCount: shopsPage.requestCount + productsPage.requestCount,
    rateLimitRemaining: productsPage.lastRateLimitRemaining,
    syncedAt,
  };
}

async function markStaleInactive(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  table: "shops" | "products",
  syncedAt: string,
): Promise<number> {
  const patch = { active: false, updated_at: syncedAt };

  const outdated = await admin
    .from(table)
    .update(patch)
    .eq("active", true)
    .neq("last_synced_at", syncedAt)
    .select("id");

  if (outdated.error) {
    throw new Error(
      `Supabase ${table} inactive update failed: ${outdated.error.message}`,
    );
  }

  const neverSynced = await admin
    .from(table)
    .update(patch)
    .eq("active", true)
    .is("last_synced_at", null)
    .select("id");

  if (neverSynced.error) {
    throw new Error(
      `Supabase ${table} inactive update failed: ${neverSynced.error.message}`,
    );
  }

  return (outdated.data?.length ?? 0) + (neverSynced.data?.length ?? 0);
}
