import { NextResponse } from "next/server";
import {
  refreshInbound,
  snapshotPurchaseOrders,
} from "@/lib/picqer/inbound";
import { hasPicqerEnv, hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasSupabaseServiceRoleEnv()) {
    return NextResponse.json(
      { ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY." },
      { status: 400 },
    );
  }
  if (!hasPicqerEnv()) {
    return NextResponse.json(
      { ok: false, error: "Missing PICQER_SUBDOMAIN and/or PICQER_API_KEY." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { mode?: string };
  const mode = body.mode === "baseline" ? "baseline" : "refresh";

  try {
    if (mode === "baseline") {
      const result = await snapshotPurchaseOrders();
      return NextResponse.json({ ok: true as const, mode, result });
    }
    const result = await refreshInbound();
    return NextResponse.json({ ok: true as const, mode, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Inbound sync failed";
    return NextResponse.json({ ok: false as const, error: message }, { status: 500 });
  }
}
