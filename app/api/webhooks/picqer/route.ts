import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { applyCompletedReceipt } from "@/lib/picqer/inbound";
import { picqerGet } from "@/lib/picqer/client";
import type { PicqerReceipt } from "@/lib/picqer/types";
import { hasPicqerEnv, hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.PICQER_WEBHOOK_SECRET?.trim();
  if (secret) {
    const header =
      request.headers.get("x-picqer-signature") ??
      request.headers.get("X-Picqer-Signature");
    if (!header || !validSignature(raw, header, secret)) {
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }
  }

  if (!hasSupabaseServiceRoleEnv() || !hasPicqerEnv()) {
    return NextResponse.json({ ok: false, error: "Server is not configured" }, { status: 500 });
  }

  let payload: { event?: string; data?: PicqerReceipt };
  try {
    payload = JSON.parse(raw) as { event?: string; data?: PicqerReceipt };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.event !== "receipts.completed") {
    return NextResponse.json({ ok: true, ignored: payload.event ?? "unknown" });
  }

  try {
    let receipt = payload.data;
    if (!receipt?.idreceipt) {
      return NextResponse.json({ ok: false, error: "Missing receipt" }, { status: 400 });
    }
    if (!receipt.products) {
      const loaded = await picqerGet<PicqerReceipt>(`/receipts/${receipt.idreceipt}`);
      receipt = loaded.data;
    }
    const result = await applyCompletedReceipt(receipt);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not apply receipt";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function validSignature(body: string, header: string, secret: string): boolean {
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  const given = header.trim();
  try {
    const a = Buffer.from(digest);
    const b = Buffer.from(given);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
