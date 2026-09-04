import { NextResponse } from "next/server";
import {
  parseFlagOverride,
  parseShopId,
  parseVelocityOverride,
  upsertShopSettings,
} from "@/lib/data/settings";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const shopId = parseShopId(body.shop_id);
    const input = {
      ...parseVelocityOverride(body),
      ...parseFlagOverride(body),
    };
    const settings = await upsertShopSettings(shopId, input);
    return NextResponse.json({ ok: true as const, settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save shop settings";
    return NextResponse.json(
      { ok: false as const, error: message },
      { status: 400 },
    );
  }
}
