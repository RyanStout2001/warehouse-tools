import Link from "next/link";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { getGlobalSettings } from "@/lib/data/browse";
import {
  listClassSettings,
  listShopClassSettingsWithNames,
  listShopSettingsWithNames,
} from "@/lib/data/settings";
import { listShopsForFilter } from "@/lib/counts/list";
import { Alert, PageHeader, Panel } from "@/app/ui/primitives";
import { GlobalSettingsForm } from "@/app/settings/global-settings-form";
import { ClassSettingsForm } from "@/app/settings/class-settings-form";
import { ShopSettingsForm } from "@/app/settings/shop-settings-form";
import { ShopClassSettingsForm } from "@/app/settings/shop-class-settings-form";
import { ProductSettingsForm } from "@/app/settings/product-settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!hasSupabaseServiceRoleEnv()) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Workspace"
          title="Settings"
          description="Requires SUPABASE_SERVICE_ROLE_KEY."
        />
        <Alert tone="warning" title="Service role key missing" />
      </main>
    );
  }

  let settings;
  try {
    settings = await getGlobalSettings();
  } catch (error) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader eyebrow="Workspace" title="Settings" />
        <Alert tone="danger" title="Could not load settings">
          {error instanceof Error ? error.message : "Unknown error"}
        </Alert>
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader eyebrow="Workspace" title="Settings" />
        <Alert tone="warning" title="Global settings row missing">
          Apply the initial Supabase migration so{" "}
          <code className="font-mono">global_settings</code> exists.
        </Alert>
      </main>
    );
  }

  let classRows = [] as Awaited<ReturnType<typeof listClassSettings>>;
  let shops = [] as Awaited<ReturnType<typeof listShopsForFilter>>;
  let shopRows = [] as Awaited<ReturnType<typeof listShopSettingsWithNames>>;
  let shopClassRows = [] as Awaited<
    ReturnType<typeof listShopClassSettingsWithNames>
  >;
  let layerError: string | null = null;

  try {
    shops = await listShopsForFilter();
  } catch (error) {
    layerError =
      error instanceof Error ? error.message : "Could not load shops";
  }

  try {
    shopRows = await listShopSettingsWithNames();
  } catch (error) {
    layerError =
      error instanceof Error ? error.message : "Could not load shop settings";
  }

  try {
    [classRows, shopClassRows] = await Promise.all([
      listClassSettings(),
      listShopClassSettingsWithNames(),
    ]);
  } catch (error) {
    layerError =
      error instanceof Error
        ? error.message
        : "Could not load class / shop override tables";
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Defaults cascade: product → shop × class → shop → class → global. Velocity cutoffs skip the class tables and use product → shop → global. Re-run the engine after any change."
        actions={
          <Link
            href="/tools"
            className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-muted"
          >
            Bulk tools
          </Link>
        }
      />

      {layerError ? (
        <Alert tone="warning" title="Apply the class-settings migration">
          {layerError} Run{" "}
          <code className="font-mono">
            supabase/migrations/20260904120000_class_and_shop_class_settings.sql
          </code>{" "}
          in the Supabase SQL editor, then refresh.
        </Alert>
      ) : null}

      <Panel>
        <h2 className="text-lg font-semibold text-foreground">Global fallbacks</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Used when a more specific layer leaves a field empty.
        </p>
        <div className="mt-6">
          <GlobalSettingsForm settings={settings} />
        </div>
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold text-foreground">Per class</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Typical place for “A needs 3 days of cover, C needs 5 free pieces.”
        </p>
        <div className="mt-6">
          {layerError ? (
            <p className="text-sm text-muted">Unavailable until the migration is applied.</p>
          ) : (
            <ClassSettingsForm rows={classRows} />
          )}
        </div>
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold text-foreground">Per shop</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Override velocity cutoffs and flag knobs for one fulfilment customer.
          {shopRows.length > 0
            ? ` ${shopRows.length} shop override(s) exist.`
            : ""}
        </p>
        <div className="mt-6">
          <ShopSettingsForm shops={shops} rows={shopRows} />
        </div>
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold text-foreground">Per shop × class</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Example: shop 12 class A uses 2 days of cover, while class C stays on
          the class default.
          {shopClassRows.length > 0
            ? ` ${shopClassRows.length} combination override(s) exist.`
            : ""}
        </p>
        <div className="mt-6">
          {layerError ? (
            <p className="text-sm text-muted">Unavailable until the migration is applied.</p>
          ) : (
            <ShopClassSettingsForm shops={shops} rows={shopClassRows} />
          )}
        </div>
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold text-foreground">Per product</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Look up an exact product code. Empty fields inherit; all-empty removes
          the override.
        </p>
        <div className="mt-6">
          <ProductSettingsForm />
        </div>
      </Panel>
    </main>
  );
}
