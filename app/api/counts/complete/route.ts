import { NextResponse } from "next/server";
import { completeCounts } from "@/lib/counts/complete";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasSupabaseServiceRoleEnv()) {
    return NextResponse.json(
      { ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const productIds =
    body &&
    typeof body === "object" &&
    "productIds" in body &&
    Array.isArray((body as { productIds: unknown }).productIds)
      ? (body as { productIds: unknown[] }).productIds.map((id) => Number(id))
      : null;

  if (!productIds) {
    return NextResponse.json(
      { ok: false, error: "Expected { productIds: number[] }." },
      { status: 400 },
    );
  }

  try {
    const result = await completeCounts(productIds);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not complete counts";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
