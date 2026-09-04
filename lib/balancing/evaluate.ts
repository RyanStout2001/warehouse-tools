import type { AbcClass, BalanceReason } from "@/lib/supabase/database.types";
import type { FlagSettings, VelocitySettings } from "@/lib/balancing/resolve-settings";

const SKIP_COUNT_TYPES = new Set(["unlimited_stock", "virtual_composition"]);

export type EngineProductInput = {
  product_type: string;
  active: boolean;
  pick_velocity: number | string;
  current_stock: number | string;
  free_stock: number | string;
  last_balanced_at: string | null;
  balance_cooldown_until: string | null;
  temporary_stock_threshold: number | string | null;
};

export type EngineProductResult = {
  abc_class: AbcClass;
  balance_need: boolean;
  balance_reason: BalanceReason | null;
  balance_reason_label: string | null;
  days_of_cover: number | null;
};

export function toNumber(value: number | string | null | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function classifyAbc(
  pickVelocity: number,
  settings: VelocitySettings,
): AbcClass {
  if (pickVelocity >= settings.class_a_min_velocity) {
    return "A";
  }
  if (pickVelocity >= settings.class_b_min_velocity) {
    return "B";
  }
  return "C";
}

export function daysOfCover(
  freeStock: number,
  pickVelocity: number,
  surplusFloor: number | null = null,
): number | null {
  if (pickVelocity <= 0) {
    return null;
  }
  const usable =
    surplusFloor == null ? freeStock : freeStock - surplusFloor;
  return usable / pickVelocity;
}

export function evaluateProduct(
  product: EngineProductInput,
  velocity: VelocitySettings,
  flags: FlagSettings,
  now = new Date(),
): EngineProductResult {
  const pickVelocity = toNumber(product.pick_velocity);
  const freeStock = toNumber(product.free_stock);
  const surplusFloor =
    product.temporary_stock_threshold == null
      ? null
      : toNumber(product.temporary_stock_threshold);
  const abc_class = classifyAbc(pickVelocity, velocity);
  const cover = daysOfCover(freeStock, pickVelocity, surplusFloor);

  const skipCount =
    !product.active ||
    SKIP_COUNT_TYPES.has(product.product_type) ||
    freeStock <= 0;

  if (skipCount) {
    return {
      abc_class,
      balance_need: false,
      balance_reason: null,
      balance_reason_label: null,
      days_of_cover: cover,
    };
  }

  const onCooldown =
    product.balance_cooldown_until != null &&
    new Date(product.balance_cooldown_until).getTime() > now.getTime();

  const flag = pickFlag({
    abc_class,
    pickVelocity,
    freeStock,
    lastBalancedAt: product.last_balanced_at,
    temporaryStockThreshold:
      product.temporary_stock_threshold == null
        ? null
        : toNumber(product.temporary_stock_threshold),
    onCooldown,
    flags,
    now,
  });

  if (!flag) {
    return {
      abc_class,
      balance_need: false,
      balance_reason: null,
      balance_reason_label: null,
      days_of_cover: cover,
    };
  }

  return {
    abc_class,
    balance_need: true,
    balance_reason: flag.reason,
    balance_reason_label: flag.label,
    days_of_cover: cover,
  };
}

function pickFlag(input: {
  abc_class: AbcClass;
  pickVelocity: number;
  freeStock: number;
  lastBalancedAt: string | null;
  temporaryStockThreshold: number | null;
  onCooldown: boolean;
  flags: FlagSettings;
  now: Date;
}): { reason: BalanceReason; label: string } | null {
  const {
    abc_class,
    pickVelocity,
    freeStock,
    lastBalancedAt,
    temporaryStockThreshold,
    onCooldown,
    flags,
    now,
  } = input;

  if (!onCooldown && temporaryStockThreshold != null) {
    if (abc_class === "A" || abc_class === "B") {
      if (pickVelocity > 0) {
        const remaining = freeStock - temporaryStockThreshold;
        const daysLeft = remaining / pickVelocity;
        if (remaining <= 0 || daysLeft < flags.balance_threshold_days) {
          return {
            reason: "inbound_surplus",
            label:
              remaining <= 0
                ? `At or below surplus floor (${temporaryStockThreshold} free pieces)`
                : `Out of surplus floor in ${formatDays(daysLeft)} days`,
          };
        }
      }
    } else if (freeStock < temporaryStockThreshold + flags.stock_amount_threshold) {
      return {
        reason: "inbound_surplus",
        label: `Free stock below surplus floor + ${flags.stock_amount_threshold}`,
      };
    }
  }

  if (!onCooldown && (abc_class === "A" || abc_class === "B") && pickVelocity > 0) {
    const thresholdStock = flags.balance_threshold_days * pickVelocity;
    if (freeStock < thresholdStock) {
      const daysLeft = freeStock / pickVelocity;
      return {
        reason: "time_oos",
        label: `Out of free stock in ${formatDays(daysLeft)} days`,
      };
    }
  }

  if (!onCooldown && abc_class === "C") {
    if (freeStock < flags.stock_amount_threshold) {
      return {
        reason: "stock_amount",
        label: `Less than ${flags.stock_amount_threshold} free pieces left`,
      };
    }
  }

  if (lastBalancedAt) {
    const daysSince =
      (now.getTime() - new Date(lastBalancedAt).getTime()) / 86_400_000;
    if (daysSince > flags.max_days_without_balance) {
      return {
        reason: "time_based",
        label: "Too long since last count",
      };
    }
  }

  return null;
}

function formatDays(days: number): string {
  if (days <= 0) {
    return "0";
  }
  if (days < 10) {
    return days.toFixed(1);
  }
  return String(Math.floor(days));
}
