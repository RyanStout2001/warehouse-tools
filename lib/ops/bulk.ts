import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { runBalancingEngine } from "@/lib/balancing/run";
import type { AbcClass, Database } from "@/lib/supabase/database.types";

export type ProductScope = {
  shopId: number | null;
  abcClass: AbcClass | null;
  productcode: string | null;
  activeOnly: boolean;
  entireCatalog: boolean;
};

export type BulkAction =
  | { type: "set_last_balanced_at"; at: string }
  | { type: "clear_last_balanced_at" }
  | { type: "set_cooldown_days"; days: number }
  | { type: "clear_cooldown" }
  | { type: "set_temporary_stock_threshold"; value: number }
  | { type: "clear_temporary_stock_threshold" }
  | { type: "clear_balance_flags" }
  | { type: "run_engine" };

export type BulkRequest = {
  dryRun: boolean;
  confirmed: boolean;
  scope: ProductScope;
  action: BulkAction;
};

export type BulkResult = {
  dryRun: boolean;
  matchCount: number;
  updated: number;
  action: BulkAction["type"];
  engine?: Awaited<ReturnType<typeof runBalancingEngine>>;
};

const ACTION_TYPES = new Set<BulkAction["type"]>([
  "set_last_balanced_at",
  "clear_last_balanced_at",
  "set_cooldown_days",
  "clear_cooldown",
  "set_temporary_stock_threshold",
  "clear_temporary_stock_threshold",
  "clear_balance_flags",
  "run_engine",
]);

export async function runBulkOp(request: BulkRequest): Promise<BulkResult> {
  if (!hasSupabaseServiceRoleEnv()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  assertScope(request.scope);

  if (request.action.type === "run_engine") {
    if (request.dryRun) {
      const matchCount = await countMatches(request.scope);
      return {
        dryRun: true,
        matchCount,
        updated: 0,
        action: "run_engine",
      };
    }
    if (!request.confirmed) {
      throw new Error("Confirm the engine run before applying it");
    }
    const engine = await runBalancingEngine(request.scope.shopId ?? undefined);
    return {
      dryRun: false,
      matchCount: engine.processed,
      updated: engine.processed,
      action: "run_engine",
      engine,
    };
  }

  const matchCount = await countMatches(request.scope);
  if (request.dryRun) {
    return {
      dryRun: true,
      matchCount,
      updated: 0,
      action: request.action.type,
    };
  }

  if (!request.confirmed) {
    throw new Error("Confirm the bulk update before applying it");
  }
  if (matchCount === 0) {
    throw new Error("No products match this scope");
  }

  const patch = patchForAction(request.action);
  const updated = await updateMatches(request.scope, patch);
  return {
    dryRun: false,
    matchCount,
    updated,
    action: request.action.type,
  };
}

export function parseBulkRequest(body: unknown): BulkRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object");
  }
  const record = body as Record<string, unknown>;
  const dryRun = Boolean(record.dryRun);
  const confirmed = Boolean(record.confirmed);
  return {
    dryRun,
    confirmed,
    scope: parseScope(record.scope),
    action: parseAction(record.action),
  };
}

function parseScope(value: unknown): ProductScope {
  if (!value || typeof value !== "object") {
    throw new Error("scope must be an object");
  }
  const record = value as Record<string, unknown>;
  const shopRaw = record.shopId;
  const shopId =
    shopRaw == null || shopRaw === "" || shopRaw === "all"
      ? null
      : Number(shopRaw);
  if (shopId != null && (!Number.isInteger(shopId) || shopId <= 0)) {
    throw new Error("scope.shopId must be a positive integer");
  }

  const classRaw = record.abcClass;
  const abcClass =
    classRaw == null || classRaw === "" || classRaw === "all"
      ? null
      : classRaw;
  if (abcClass != null && abcClass !== "A" && abcClass !== "B" && abcClass !== "C") {
    throw new Error("scope.abcClass must be A, B, or C");
  }

  const code =
    typeof record.productcode === "string" ? record.productcode.trim() : "";

  return {
    shopId,
    abcClass,
    productcode: code || null,
    activeOnly: Boolean(record.activeOnly),
    entireCatalog: Boolean(record.entireCatalog),
  };
}

function parseAction(value: unknown): BulkAction {
  if (!value || typeof value !== "object") {
    throw new Error("action must be an object");
  }
  const record = value as Record<string, unknown>;
  const type = record.type;
  if (typeof type !== "string" || !ACTION_TYPES.has(type as BulkAction["type"])) {
    throw new Error("Unknown bulk action");
  }

  if (type === "set_last_balanced_at") {
    const at =
      record.at === "now" || record.at == null || record.at === ""
        ? new Date().toISOString()
        : String(record.at);
    if (Number.isNaN(Date.parse(at))) {
      throw new Error("action.at must be a valid date");
    }
    return { type, at: new Date(at).toISOString() };
  }

  if (type === "set_cooldown_days") {
    const days = Number(record.days);
    if (!Number.isFinite(days) || days <= 0) {
      throw new Error("action.days must be greater than 0");
    }
    return { type, days };
  }

  if (type === "set_temporary_stock_threshold") {
    const amount = Number(record.value);
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error("action.value must be an integer of 0 or more");
    }
    return { type, value: amount };
  }

  return { type } as BulkAction;
}

function assertScope(scope: ProductScope) {
  const hasTarget =
    scope.shopId != null ||
    scope.abcClass != null ||
    Boolean(scope.productcode) ||
    scope.entireCatalog;
  if (!hasTarget) {
    throw new Error(
      "Choose a shop, class, product code, or explicitly target the entire catalog",
    );
  }
}

async function countMatches(scope: ProductScope): Promise<number> {
  const admin = createAdminSupabaseClient();
  const { count, error } = await applyScope(
    admin.from("products").select("id", { count: "exact", head: true }),
    scope,
  );
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

async function updateMatches(
  scope: ProductScope,
  patch: Database["public"]["Tables"]["products"]["Update"],
): Promise<number> {
  const admin = createAdminSupabaseClient();
  const pageSize = 1000;
  let updated = 0;
  let from = 0;

  while (true) {
    const { data: ids, error: idError } = await applyScope(
      admin.from("products").select("id").order("id").range(from, from + pageSize - 1),
      scope,
    );
    if (idError) {
      throw new Error(idError.message);
    }
    if (!ids || ids.length === 0) {
      break;
    }

    const { error } = await admin
      .from("products")
      .update(patch)
      .in(
        "id",
        ids.map((row) => row.id),
      );
    if (error) {
      throw new Error(error.message);
    }

    updated += ids.length;
    if (ids.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return updated;
}

function applyScope<T extends { eq: Function }>(query: T, scope: ProductScope): T {
  let next = query;
  if (scope.shopId != null) {
    next = next.eq("shop_id", scope.shopId);
  }
  if (scope.abcClass != null) {
    next = next.eq("abc_class", scope.abcClass);
  }
  if (scope.productcode) {
    next = next.eq("productcode", scope.productcode);
  }
  if (scope.activeOnly) {
    next = next.eq("active", true);
  }
  return next;
}

function patchForAction(
  action: Exclude<BulkAction, { type: "run_engine" }>,
): Database["public"]["Tables"]["products"]["Update"] {
  const now = new Date().toISOString();
  switch (action.type) {
    case "set_last_balanced_at":
      return { last_balanced_at: action.at, updated_at: now };
    case "clear_last_balanced_at":
      return { last_balanced_at: null, updated_at: now };
    case "set_cooldown_days":
      return {
        balance_cooldown_until: new Date(
          Date.now() + action.days * 86_400_000,
        ).toISOString(),
        updated_at: now,
      };
    case "clear_cooldown":
      return { balance_cooldown_until: null, updated_at: now };
    case "set_temporary_stock_threshold":
      return {
        temporary_stock_threshold: action.value,
        updated_at: now,
      };
    case "clear_temporary_stock_threshold":
      return { temporary_stock_threshold: null, updated_at: now };
    case "clear_balance_flags":
      return {
        balance_need: false,
        balance_reason: null,
        balance_reason_label: null,
        updated_at: now,
      };
  }
}
