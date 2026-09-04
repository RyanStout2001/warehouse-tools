import { NextResponse } from "next/server";
import { runBalancingEngine } from "@/lib/balancing/run";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasSupabaseServiceRoleEnv()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing SUPABASE_SERVICE_ROLE_KEY. The engine writes abc_class and balance flags with the service role.",
      },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      shopId?: unknown;
    };
    const shopId =
      body.shopId == null || body.shopId === "" || body.shopId === "all"
        ? undefined
        : Number(body.shopId);
    if (shopId != null && (!Number.isInteger(shopId) || shopId <= 0)) {
      return NextResponse.json(
        { ok: false, error: "shopId must be a positive integer" },
        { status: 400 },
      );
    }
    const result = await runBalancingEngine(shopId);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown engine error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
