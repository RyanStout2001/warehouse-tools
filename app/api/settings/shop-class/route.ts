import { NextResponse } from "next/server";
import {
  parseAbcClass,
  parseFlagOverride,
  parseShopId,
  upsertShopClassSettings,
} from "@/lib/data/settings";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const shopId = parseShopId(body.shop_id);
    const abcClass = parseAbcClass(body.abc_class);
    const input = parseFlagOverride(body);
    const settings = await upsertShopClassSettings(shopId, abcClass, input);
    return NextResponse.json({ ok: true as const, settings });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not save shop × class settings";
    return NextResponse.json(
      { ok: false as const, error: message },
      { status: 400 },
    );
  }
}
