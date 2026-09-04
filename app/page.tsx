import Link from "next/link";
import { EnginePanel } from "@/app/engine-panel";
import { SyncPanel } from "@/app/sync-panel";
import { InboundPanel } from "@/app/inbound-panel";
import {
  Alert,
  Badge,
  PageHeader,
  Panel,
  StatCard,
} from "@/app/ui/primitives";
import { getDashboardOverview } from "@/lib/data/overview";
import { getInboundSyncState } from "@/lib/picqer/inbound";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const overview = await getDashboardOverview();
  const inboundState = await getInboundSyncState();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Workspace"
        title="Overview"
        description="See every table at a glance, run sync and balancing, then work the count list."
        actions={
          <Link
            href="/counts"
            className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Open count list
          </Link>
        }
      />

      <div className="space-y-4">
        <ConnectionBanner overview={overview} />
        {overview.missingEnv.length > 0 ? (
          <Alert tone="warning" title="Environment incomplete">
            Add {overview.missingEnv.join(", ")} to{" "}
            <code className="font-mono">.env.local</code>, then restart{" "}
            <code className="font-mono">npm run dev</code>.
          </Alert>
        ) : null}
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Tables</h2>
            <p className="mt-1 text-sm text-muted">
              Browse every Supabase table used by the auditor.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {overview.tables.map((table) => (
            <StatCard
              key={table.key}
              label={table.label}
              value={
                table.count == null
                  ? "—"
                  : formatNumber(table.count, 0)
              }
              hint={table.error ?? table.description}
              href={table.href}
            />
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <StatCard
          label="Flagged to count"
          value={
            overview.engine
              ? formatNumber(overview.engine.flagged, 0)
              : "—"
          }
          hint="Free stock &gt; 0 on the main list"
          href="/counts"
        />
        <StatCard
          label="ABC classes"
          value={
            overview.engine
              ? `A ${overview.engine.classA} · B ${overview.engine.classB} · C ${overview.engine.classC}`
              : "—"
          }
          hint="From the last engine run"
        />
        <StatCard
          label="Counts (7 days)"
          value={
            overview.engine
              ? formatNumber(overview.engine.recentEvents, 0)
              : "—"
          }
          hint="Completed balance events"
          href="/data/balance-events"
        />
      </section>

      {overview.engine?.error ? (
        <div className="mt-4">
          <Alert tone="danger" title="Could not load engine stats">
            {overview.engine.error}
          </Alert>
        </div>
      ) : null}

      <section className="mt-8">
        <Panel>
          <InboundPanel
            baselineCompletedAt={inboundState?.baseline_completed_at ?? null}
          />
        </Panel>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel>
          <SyncPanel />
        </Panel>
        <Panel>
          <EnginePanel />
        </Panel>
      </section>

      <section className="mt-8">
        <Panel>
          <h2 className="text-lg font-semibold text-foreground">Workflow</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <WorkflowStep
              step="1"
              title="Sync catalog"
              body="Pull shops and products from Picqer (GET only)."
            />
            <WorkflowStep
              step="2"
              title="Inbound"
              body="Snapshot POs once, then refresh receipts and surplus floors."
            />
            <WorkflowStep
              step="3"
              title="Run engine"
              body="Classify ABC and flag products that need counting."
            />
            <WorkflowStep
              step="4"
              title="Count &amp; clear"
              body="Work the count list and mark items complete."
            />
          </ol>
        </Panel>
      </section>
    </main>
  );
}

function WorkflowStep({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-xl border border-border bg-surface-muted/50 p-4">
      <Badge tone="accent">Step {step}</Badge>
      <p className="mt-3 font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
    </li>
  );
}

function ConnectionBanner({
  overview,
}: {
  overview: Awaited<ReturnType<typeof getDashboardOverview>>;
}) {
  const { connection } = overview;

  if (!connection.ok && connection.kind === "missing_env") {
    return (
      <Alert tone="warning" title="Supabase environment variables are missing">
        Copy <code className="font-mono">.env.example</code> to{" "}
        <code className="font-mono">.env.local</code> and add the public keys.
      </Alert>
    );
  }

  if (!connection.ok && connection.kind === "query_error") {
    return (
      <Alert tone="danger" title="Could not query Supabase">
        <code className="font-mono">{connection.message}</code>
      </Alert>
    );
  }

  return (
    <Alert tone="success" title="Connected to Supabase">
      Ready to sync, run the engine, and work counts.
    </Alert>
  );
}
