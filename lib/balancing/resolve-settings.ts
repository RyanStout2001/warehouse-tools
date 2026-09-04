import type { AbcClass, Database } from "@/lib/supabase/database.types";

export type VelocitySettings = {
  class_a_min_velocity: number;
  class_b_min_velocity: number;
};

export type FlagSettings = {
  balance_threshold_days: number;
  stock_amount_threshold: number;
  max_days_without_balance: number;
};

export type ResolvedSettings = VelocitySettings & FlagSettings;

type GlobalSettings = Database["public"]["Tables"]["global_settings"]["Row"];
type ShopSettings = Database["public"]["Tables"]["shop_settings"]["Row"];
type ProductSettings = Database["public"]["Tables"]["product_settings"]["Row"];
type ClassSettings = Database["public"]["Tables"]["class_settings"]["Row"];
type ShopClassSettings = Database["public"]["Tables"]["shop_class_settings"]["Row"];

function firstNumber(
  ...values: Array<number | string | null | undefined>
): number | undefined {
  for (const value of values) {
    if (value == null || value === "") {
      continue;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function resolveVelocitySettings(
  global: GlobalSettings,
  shop: ShopSettings | undefined,
  product: ProductSettings | undefined,
): VelocitySettings {
  return {
    class_a_min_velocity:
      firstNumber(
        product?.class_a_min_velocity,
        shop?.class_a_min_velocity,
        global.class_a_min_velocity,
      ) ?? 30,
    class_b_min_velocity:
      firstNumber(
        product?.class_b_min_velocity,
        shop?.class_b_min_velocity,
        global.class_b_min_velocity,
      ) ?? 10,
  };
}

export function resolveFlagSettings(
  abcClass: AbcClass,
  global: GlobalSettings,
  classRow: ClassSettings | undefined,
  shop: ShopSettings | undefined,
  shopClass: ShopClassSettings | undefined,
  product: ProductSettings | undefined,
): FlagSettings {
  return {
    balance_threshold_days:
      firstNumber(
        product?.balance_threshold_days,
        shopClass?.balance_threshold_days,
        shop?.balance_threshold_days,
        classRow?.balance_threshold_days,
        global.balance_threshold_days,
      ) ?? 3,
    stock_amount_threshold:
      firstNumber(
        product?.stock_amount_threshold,
        shopClass?.stock_amount_threshold,
        shop?.stock_amount_threshold,
        classRow?.stock_amount_threshold,
        global.stock_amount_threshold,
      ) ?? 5,
    max_days_without_balance:
      firstNumber(
        product?.max_days_without_balance,
        shopClass?.max_days_without_balance,
        shop?.max_days_without_balance,
        classRow?.max_days_without_balance,
        global.max_days_without_balance,
      ) ?? 90,
  };
}

/** @deprecated Use resolveVelocitySettings + resolveFlagSettings. */
export function resolveSettings(
  global: GlobalSettings,
  shop: ShopSettings | undefined,
  product: ProductSettings | undefined,
): ResolvedSettings {
  const velocity = resolveVelocitySettings(global, shop, product);
  const flags = resolveFlagSettings("C", global, undefined, shop, undefined, product);
  return { ...velocity, ...flags };
}
