import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { classifyAbc, evaluateProduct, toNumber } from "@/lib/balancing/evaluate";
import {
  resolveFlagSettings,
  resolveVelocitySettings,
} from "@/lib/balancing/resolve-settings";
import type { AbcClass, BalanceReason } from "@/lib/supabase/database.types";

const PAGE_SIZE = 500;

export type EngineRunResult = {
  processed: number;
  flagged: number;
  byClass: Record<AbcClass, number>;
  byReason: Record<BalanceReason, number>;
};

export async function runBalancingEngine(shopId?: number): Promise<EngineRunResult> {
  const admin = createAdminSupabaseClient();

  const { data: global, error: globalError } = await admin
    .from("global_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (globalError || !global) {
    throw new Error(
      `Could not load global_settings: ${globalError?.message ?? "missing row"}`,
    );
  }

  const [
    { data: shopRows, error: shopError },
    { data: productSettingRows, error: productError },
    { data: classRows, error: classError },
    { data: shopClassRows, error: shopClassError },
  ] = await Promise.all([
    admin.from("shop_settings").select("*"),
    admin.from("product_settings").select("*"),
    admin.from("class_settings").select("*"),
    admin.from("shop_class_settings").select("*"),
  ]);

  if (shopError) {
    throw new Error(`Could not load shop_settings: ${shopError.message}`);
  }
  if (productError) {
    throw new Error(`Could not load product_settings: ${productError.message}`);
  }
  if (classError) {
    throw new Error(
      `Could not load class_settings: ${classError.message}. Apply the latest SQL migration.`,
    );
  }
  if (shopClassError) {
    throw new Error(`Could not load shop_class_settings: ${shopClassError.message}`);
  }

  const shopSettings = new Map((shopRows ?? []).map((row) => [row.shop_id, row]));
  const productSettings = new Map(
    (productSettingRows ?? []).map((row) => [row.product_id, row]),
  );
  const classSettings = new Map(
    (classRows ?? []).map((row) => [row.abc_class, row]),
  );
  const shopClassSettings = new Map(
    (shopClassRows ?? []).map((row) => [`${row.shop_id}:${row.abc_class}`, row]),
  );

  const summary: EngineRunResult = {
    processed: 0,
    flagged: 0,
    byClass: { A: 0, B: 0, C: 0 },
    byReason: {
      time_oos: 0,
      stock_amount: 0,
      time_based: 0,
      inbound_surplus: 0,
    },
  };

  let from = 0;
  const now = new Date();

  while (true) {
    let query = admin
      .from("products")
      .select(
        "id,shop_id,productcode,barcode,name,product_type,active,pick_velocity,current_stock,free_stock,idwarehouse,last_balanced_at,balance_cooldown_until,temporary_stock_threshold,picqer_updated_at,last_synced_at,created_at",
      )
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (shopId != null) {
      query = query.eq("shop_id", shopId);
    }

    const { data: rows, error } = await query;

    if (error) {
      throw new Error(`Could not load products: ${error.message}`);
    }
    if (!rows || rows.length === 0) {
      break;
    }

    const updates = rows.map((row) => {
      const shop = shopSettings.get(row.shop_id);
      const product = productSettings.get(row.id);
      const velocity = resolveVelocitySettings(global, shop, product);
      const abcClass = classifyAbc(toNumber(row.pick_velocity), velocity);
      const flags = resolveFlagSettings(
        abcClass,
        global,
        classSettings.get(abcClass),
        shop,
        shopClassSettings.get(`${row.shop_id}:${abcClass}`),
        product,
      );
      const result = evaluateProduct(row, velocity, flags, now);
      summary.processed += 1;
      summary.byClass[result.abc_class] += 1;
      if (result.balance_need && result.balance_reason) {
        summary.flagged += 1;
        summary.byReason[result.balance_reason] += 1;
      }

      return {
        ...row,
        ...result,
        updated_at: now.toISOString(),
      };
    });

    const { error: upsertError } = await admin
      .from("products")
      .upsert(updates, { onConflict: "id" });

    if (upsertError) {
      throw new Error(`Could not save engine results: ${upsertError.message}`);
    }

    if (rows.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return summary;
}
