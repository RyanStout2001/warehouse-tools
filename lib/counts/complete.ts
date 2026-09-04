import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { resolveFlagSettings } from "@/lib/balancing/resolve-settings";
import type { AbcClass, BalanceReason } from "@/lib/supabase/database.types";

const LOW_STOCK_REASONS = new Set<BalanceReason>([
  "time_oos",
  "stock_amount",
  "inbound_surplus",
]);

const MAX_IDS = 100;

export type CompleteCountsResult = {
  completed: number;
  skipped: number;
};

export async function completeCounts(
  productIds: number[],
): Promise<CompleteCountsResult> {
  const uniqueIds = [...new Set(productIds.filter((id) => Number.isFinite(id)))];
  if (uniqueIds.length === 0) {
    return { completed: 0, skipped: 0 };
  }
  if (uniqueIds.length > MAX_IDS) {
    throw new Error(`Select at most ${MAX_IDS} products at a time.`);
  }

  const admin = createAdminSupabaseClient();
  const now = new Date();
  const nowIso = now.toISOString();

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

  const { data: products, error: productError } = await admin
    .from("products")
    .select(
      "id,shop_id,abc_class,balance_need,balance_reason,temporary_stock_threshold",
    )
    .in("id", uniqueIds);

  if (productError) {
    throw new Error(`Could not load products: ${productError.message}`);
  }

  const flagged = (products ?? []).filter((row) => row.balance_need);
  const skipped = uniqueIds.length - flagged.length;
  if (flagged.length === 0) {
    return { completed: 0, skipped };
  }

  const shopIds = [...new Set(flagged.map((row) => row.shop_id))];
  const [
    { data: shopRows },
    { data: productSettingRows },
    { data: classRows },
    { data: shopClassRows },
  ] = await Promise.all([
    admin.from("shop_settings").select("*").in("shop_id", shopIds),
    admin.from("product_settings").select("*").in("product_id", flagged.map((row) => row.id)),
    admin.from("class_settings").select("*"),
    admin.from("shop_class_settings").select("*").in("shop_id", shopIds),
  ]);

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

  const events = flagged.flatMap((row) => {
    if (!row.balance_reason) {
      return [];
    }
    return [
      {
        product_id: row.id,
        trigger_reason: row.balance_reason,
        counted_at: nowIso,
      },
    ];
  });

  if (events.length > 0) {
    const { error: eventError } = await admin.from("balance_events").insert(events);
    if (eventError) {
      throw new Error(`Could not record count events: ${eventError.message}`);
    }
  }

  let completed = 0;
  for (const row of flagged) {
    if (!row.balance_reason) {
      continue;
    }

    const abcClass = (row.abc_class ?? "C") as AbcClass;
    const settings = resolveFlagSettings(
      abcClass,
      global,
      classSettings.get(abcClass),
      shopSettings.get(row.shop_id),
      shopClassSettings.get(`${row.shop_id}:${abcClass}`),
      productSettings.get(row.id),
    );

    const patch: {
      last_balanced_at: string;
      balance_need: boolean;
      balance_reason: null;
      balance_reason_label: null;
      updated_at: string;
      balance_cooldown_until?: string;
      temporary_stock_threshold?: null;
    } = {
      last_balanced_at: nowIso,
      balance_need: false,
      balance_reason: null,
      balance_reason_label: null,
      updated_at: nowIso,
    };

    if (LOW_STOCK_REASONS.has(row.balance_reason)) {
      patch.balance_cooldown_until = new Date(
        now.getTime() + settings.max_days_without_balance * 86_400_000,
      ).toISOString();
    }
    if (row.balance_reason === "inbound_surplus") {
      patch.temporary_stock_threshold = null;
    }

    const { error: updateError } = await admin
      .from("products")
      .update(patch)
      .eq("id", row.id);

    if (updateError) {
      throw new Error(`Could not mark product ${row.id} counted: ${updateError.message}`);
    }
    completed += 1;
  }

  return { completed, skipped };
}
