import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import type { AbcClass, Database } from "@/lib/supabase/database.types";

export type GlobalSettingsInput = {
  class_a_min_velocity: number;
  class_b_min_velocity: number;
  balance_threshold_days: number;
  stock_amount_threshold: number;
  max_days_without_balance: number;
  return_supplier_id: number | null;
};

export type FlagOverrideInput = {
  balance_threshold_days: number | null;
  stock_amount_threshold: number | null;
  max_days_without_balance: number | null;
};

export type VelocityOverrideInput = {
  class_a_min_velocity: number | null;
  class_b_min_velocity: number | null;
};

type GlobalSettings = Database["public"]["Tables"]["global_settings"]["Row"];
type ClassSettings = Database["public"]["Tables"]["class_settings"]["Row"];
type ShopSettings = Database["public"]["Tables"]["shop_settings"]["Row"];
type ShopClassSettings = Database["public"]["Tables"]["shop_class_settings"]["Row"];
type ProductSettings = Database["public"]["Tables"]["product_settings"]["Row"];

function requireAdmin() {
  if (!hasSupabaseServiceRoleEnv()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createAdminSupabaseClient();
}

export async function listClassSettings(): Promise<ClassSettings[]> {
  const admin = requireAdmin();
  const { data, error } = await admin
    .from("class_settings")
    .select("*")
    .order("abc_class");
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function listShopSettingsWithNames() {
  const admin = requireAdmin();
  const { data, error } = await admin
    .from("shop_settings")
    .select(
      "shop_id,class_a_min_velocity,class_b_min_velocity,balance_threshold_days,stock_amount_threshold,max_days_without_balance,updated_at,shops(name)",
    )
    .order("shop_id");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => {
    const shop = row.shops as { name: string } | { name: string }[] | null;
    const shop_name = Array.isArray(shop)
      ? (shop[0]?.name ?? "—")
      : (shop?.name ?? "—");
    const { shops: _shops, ...rest } = row;
    return { ...rest, shop_name };
  });
}

export async function listShopClassSettingsWithNames() {
  const admin = requireAdmin();
  const { data, error } = await admin
    .from("shop_class_settings")
    .select(
      "shop_id,abc_class,balance_threshold_days,stock_amount_threshold,max_days_without_balance,updated_at,shops(name)",
    )
    .order("shop_id")
    .order("abc_class");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => {
    const shop = row.shops as { name: string } | { name: string }[] | null;
    const shop_name = Array.isArray(shop)
      ? (shop[0]?.name ?? "—")
      : (shop?.name ?? "—");
    const { shops: _shops, ...rest } = row;
    return { ...rest, shop_name };
  });
}

export async function updateGlobalSettings(
  input: GlobalSettingsInput,
): Promise<GlobalSettings> {
  const admin = requireAdmin();
  const { data, error } = await admin
    .from("global_settings")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateClassSettings(
  abcClass: AbcClass,
  input: FlagOverrideInput,
): Promise<ClassSettings> {
  const admin = requireAdmin();
  const { data, error } = await admin
    .from("class_settings")
    .upsert(
      {
        abc_class: abcClass,
        ...input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "abc_class" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function upsertShopSettings(
  shopId: number,
  input: VelocityOverrideInput & FlagOverrideInput,
): Promise<ShopSettings | null> {
  const admin = requireAdmin();
  if (allNull(input)) {
    const { error } = await admin
      .from("shop_settings")
      .delete()
      .eq("shop_id", shopId);
    if (error) {
      throw new Error(error.message);
    }
    return null;
  }

  const { data, error } = await admin
    .from("shop_settings")
    .upsert(
      {
        shop_id: shopId,
        ...input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shop_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function upsertShopClassSettings(
  shopId: number,
  abcClass: AbcClass,
  input: FlagOverrideInput,
): Promise<ShopClassSettings | null> {
  const admin = requireAdmin();
  if (allNull(input)) {
    const { error } = await admin
      .from("shop_class_settings")
      .delete()
      .eq("shop_id", shopId)
      .eq("abc_class", abcClass);
    if (error) {
      throw new Error(error.message);
    }
    return null;
  }

  const { data, error } = await admin
    .from("shop_class_settings")
    .upsert(
      {
        shop_id: shopId,
        abc_class: abcClass,
        ...input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shop_id,abc_class" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function upsertProductSettings(
  productId: number,
  input: VelocityOverrideInput & FlagOverrideInput,
): Promise<ProductSettings | null> {
  const admin = requireAdmin();
  if (allNull(input)) {
    const { error } = await admin
      .from("product_settings")
      .delete()
      .eq("product_id", productId);
    if (error) {
      throw new Error(error.message);
    }
    return null;
  }

  const { data, error } = await admin
    .from("product_settings")
    .upsert(
      {
        product_id: productId,
        ...input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function findProductByCode(productcode: string) {
  const admin = requireAdmin();
  const { data, error } = await admin
    .from("products")
    .select("id,productcode,name,shop_id")
    .eq("productcode", productcode)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export function parseGlobalSettingsBody(body: unknown): GlobalSettingsInput {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object");
  }

  const record = body as Record<string, unknown>;
  return {
    class_a_min_velocity: requirePositiveNumber(
      record.class_a_min_velocity,
      "class_a_min_velocity",
    ),
    class_b_min_velocity: requirePositiveNumber(
      record.class_b_min_velocity,
      "class_b_min_velocity",
    ),
    balance_threshold_days: requirePositiveNumber(
      record.balance_threshold_days,
      "balance_threshold_days",
    ),
    stock_amount_threshold: requireNonNegativeInt(
      record.stock_amount_threshold,
      "stock_amount_threshold",
    ),
    max_days_without_balance: requirePositiveInt(
      record.max_days_without_balance,
      "max_days_without_balance",
    ),
    return_supplier_id: optionalPositiveInt(
      record.return_supplier_id,
      "return_supplier_id",
    ),
  };
}

export function parseAbcClass(value: unknown): AbcClass {
  if (value === "A" || value === "B" || value === "C") {
    return value;
  }
  throw new Error("abc_class must be A, B, or C");
}

export function parseShopId(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error("shop_id must be a positive integer");
  }
  return n;
}

export function parseFlagOverride(record: Record<string, unknown>): FlagOverrideInput {
  return {
    balance_threshold_days: optionalPositiveNumber(
      record.balance_threshold_days,
      "balance_threshold_days",
    ),
    stock_amount_threshold: optionalNonNegativeInt(
      record.stock_amount_threshold,
      "stock_amount_threshold",
    ),
    max_days_without_balance: optionalPositiveInt(
      record.max_days_without_balance,
      "max_days_without_balance",
    ),
  };
}

export function parseVelocityOverride(
  record: Record<string, unknown>,
): VelocityOverrideInput {
  return {
    class_a_min_velocity: optionalPositiveNumber(
      record.class_a_min_velocity,
      "class_a_min_velocity",
    ),
    class_b_min_velocity: optionalPositiveNumber(
      record.class_b_min_velocity,
      "class_b_min_velocity",
    ),
  };
}

function allNull(input: Record<string, number | null>): boolean {
  return Object.values(input).every((value) => value == null);
}

function requirePositiveNumber(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${field} must be a number greater than 0`);
  }
  return n;
}

function requirePositiveInt(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${field} must be an integer greater than 0`);
  }
  return n;
}

function requireNonNegativeInt(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${field} must be an integer of 0 or more`);
  }
  return n;
}

function isEmpty(value: unknown): boolean {
  return value == null || value === "";
}

function optionalPositiveNumber(value: unknown, field: string): number | null {
  if (isEmpty(value)) {
    return null;
  }
  return requirePositiveNumber(value, field);
}

function optionalPositiveInt(value: unknown, field: string): number | null {
  if (isEmpty(value)) {
    return null;
  }
  return requirePositiveInt(value, field);
}

function optionalNonNegativeInt(value: unknown, field: string): number | null {
  if (isEmpty(value)) {
    return null;
  }
  return requireNonNegativeInt(value, field);
}
