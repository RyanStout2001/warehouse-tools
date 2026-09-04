import { NextResponse } from "next/server";
import { parseBulkRequest, runBulkOp } from "@/lib/ops/bulk";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseBulkRequest(body);
    const result = await runBulkOp(input);
    return NextResponse.json({ ok: true as const, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bulk operation failed";
    return NextResponse.json(
      { ok: false as const, error: message },
      { status: 400 },
    );
  }
}
