import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { listShopsForFilter } from "@/lib/counts/list";
import { Alert, PageHeader, Panel } from "@/app/ui/primitives";
import { ToolsForm } from "@/app/tools/tools-form";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  if (!hasSupabaseServiceRoleEnv()) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Workspace"
          title="Tools"
          description="Requires SUPABASE_SERVICE_ROLE_KEY."
        />
        <Alert tone="warning" title="Service role key missing" />
      </main>
    );
  }

  let shops;
  try {
    shops = await listShopsForFilter();
  } catch (error) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader eyebrow="Workspace" title="Tools" />
        <Alert tone="danger" title="Could not load shops">
          {error instanceof Error ? error.message : "Unknown error"}
        </Alert>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Workspace"
        title="Tools"
        description="Set last-count dates, cooldowns, inbound surplus thresholds, or flags for a shop, class, shop × class, one SKU, or the whole catalog. Preview the match count before applying."
      />
      <Panel>
        <ToolsForm shops={shops} />
      </Panel>
    </main>
  );
}
