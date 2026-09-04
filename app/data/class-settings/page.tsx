import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { listClassSettingsBrowse } from "@/lib/data/browse";
import { formatDateTime, formatNumber } from "@/lib/format";
import { Alert, EmptyState, PageHeader } from "@/app/ui/primitives";
import { DataTable, Td } from "@/app/ui/data-table";

export const dynamic = "force-dynamic";

export default async function ClassSettingsDataPage() {
  if (!hasSupabaseServiceRoleEnv()) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="Class settings" description="Requires SUPABASE_SERVICE_ROLE_KEY." />
        <Alert tone="warning" title="Service role key missing" />
      </main>
    );
  }

  let rows;
  try {
    rows = await listClassSettingsBrowse();
  } catch (error) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="Class settings" />
        <Alert tone="danger" title="Could not load class settings">
          {error instanceof Error ? error.message : "Unknown error"}
        </Alert>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Tables"
        title="Class settings"
        description="A / B / C flag defaults. Edit them on the Settings page."
      />
      {rows.length === 0 ? (
        <EmptyState>No class settings yet. Apply the latest SQL migration.</EmptyState>
      ) : (
        <DataTable
          columns={["Class", "Cover days", "C stock", "Max days", "Updated"]}
        >
          {rows.map((row) => (
            <tr key={row.abc_class} className="hover:bg-surface-muted/40">
              <Td>{row.abc_class}</Td>
              <Td>
                {row.balance_threshold_days == null
                  ? "—"
                  : formatNumber(row.balance_threshold_days, 1)}
              </Td>
              <Td>
                {row.stock_amount_threshold == null
                  ? "—"
                  : formatNumber(row.stock_amount_threshold, 0)}
              </Td>
              <Td>
                {row.max_days_without_balance == null
                  ? "—"
                  : formatNumber(row.max_days_without_balance, 0)}
              </Td>
              <Td>{formatDateTime(row.updated_at)}</Td>
            </tr>
          ))}
        </DataTable>
      )}
    </main>
  );
}
