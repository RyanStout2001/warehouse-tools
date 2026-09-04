import { checkSupabaseConnection } from "@/lib/supabase/check-connection";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  hasPicqerEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase/env";

export type TableOverview = {
  key: string;
  label: string;
  href: string;
  description: string;
  count: number | null;
  error: string | null;
};

export type DashboardOverview = {
  connection: Awaited<ReturnType<typeof checkSupabaseConnection>>;
  ready: boolean;
  missingEnv: string[];
  tables: TableOverview[];
  engine: {
    flagged: number;
    classA: number;
    classB: number;
    classC: number;
    recentEvents: number;
    error: string | null;
  } | null;
};

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const connection = await checkSupabaseConnection();
  const missingEnv: string[] = [];
  if (!hasSupabaseServiceRoleEnv()) {
    missingEnv.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!hasPicqerEnv()) {
    missingEnv.push("PICQER_SUBDOMAIN / PICQER_API_KEY");
  }

  if (!hasSupabaseServiceRoleEnv()) {
    return {
      connection,
      ready: false,
      missingEnv,
      tables: TABLE_META.map((meta) => ({
        ...meta,
        count: null,
        error: null,
      })),
      engine: null,
    };
  }

  const admin = createAdminSupabaseClient();
  const [
    shops,
    products,
    globalSettings,
    classSettings,
    shopSettings,
    shopClassSettings,
    productSettings,
    balanceEvents,
    purchaseOrders,
    processedReceipts,
    flagged,
    classA,
    classB,
    classC,
    recentEvents,
  ] = await Promise.all([
    admin.from("shops").select("*", { count: "exact", head: true }),
    admin.from("products").select("*", { count: "exact", head: true }),
    admin.from("global_settings").select("*", { count: "exact", head: true }),
    admin.from("class_settings").select("*", { count: "exact", head: true }),
    admin.from("shop_settings").select("*", { count: "exact", head: true }),
    admin.from("shop_class_settings").select("*", { count: "exact", head: true }),
    admin.from("product_settings").select("*", { count: "exact", head: true }),
    admin.from("balance_events").select("*", { count: "exact", head: true }),
    admin.from("picqer_purchase_orders").select("*", { count: "exact", head: true }),
    admin.from("processed_receipts").select("*", { count: "exact", head: true }),
    admin
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("balance_need", true)
      .gt("free_stock", 0),
    admin.from("products").select("*", { count: "exact", head: true }).eq("abc_class", "A"),
    admin.from("products").select("*", { count: "exact", head: true }).eq("abc_class", "B"),
    admin.from("products").select("*", { count: "exact", head: true }).eq("abc_class", "C"),
    admin
      .from("balance_events")
      .select("*", { count: "exact", head: true })
      .gte("counted_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const counts = [
    shops,
    products,
    globalSettings,
    classSettings,
    shopSettings,
    shopClassSettings,
    productSettings,
    balanceEvents,
    purchaseOrders,
    processedReceipts,
  ];

  return {
    connection,
    ready: true,
    missingEnv,
    tables: TABLE_META.map((meta, index) => ({
      ...meta,
      count: counts[index].count ?? 0,
      error: counts[index].error?.message ?? null,
    })),
    engine: {
      flagged: flagged.count ?? 0,
      classA: classA.count ?? 0,
      classB: classB.count ?? 0,
      classC: classC.count ?? 0,
      recentEvents: recentEvents.count ?? 0,
      error:
        flagged.error?.message ||
        classA.error?.message ||
        classB.error?.message ||
        classC.error?.message ||
        recentEvents.error?.message ||
        null,
    },
  };
}

const TABLE_META = [
  {
    key: "shops",
    label: "Shops",
    href: "/data/shops",
    description: "Picqer fulfilment customers synced into the catalog.",
  },
  {
    key: "products",
    label: "Products",
    href: "/data/products",
    description: "Catalog, stock, velocity, and ABC / balance flags.",
  },
  {
    key: "global_settings",
    label: "Global settings",
    href: "/settings",
    description: "Default engine thresholds for every shop and product.",
  },
  {
    key: "class_settings",
    label: "Class settings",
    href: "/data/class-settings",
    description: "A / B / C flag thresholds used unless a shop or product overrides them.",
  },
  {
    key: "shop_settings",
    label: "Shop settings",
    href: "/data/shop-settings",
    description: "Optional shop-level overrides of global thresholds.",
  },
  {
    key: "shop_class_settings",
    label: "Shop × class",
    href: "/data/shop-class-settings",
    description: "Optional flag thresholds for one shop and one ABC class.",
  },
  {
    key: "product_settings",
    label: "Product settings",
    href: "/data/product-settings",
    description: "Optional product-level overrides of shop / global thresholds.",
  },
  {
    key: "balance_events",
    label: "Balance events",
    href: "/data/balance-events",
    description: "History of completed physical counts.",
  },
  {
    key: "picqer_purchase_orders",
    label: "Purchase orders",
    href: "/inbound",
    description: "Cached Picqer PO status, suppliers, and line totals.",
  },
  {
    key: "processed_receipts",
    label: "Receipts",
    href: "/inbound?view=receipts",
    description: "Completed receipts processed after the inbound snapshot.",
  },
] as const;
