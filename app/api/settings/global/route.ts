import { NextResponse } from "next/server";
import {
  parseGlobalSettingsBody,
  updateGlobalSettings,
} from "@/lib/data/settings";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseGlobalSettingsBody(body);
    const settings = await updateGlobalSettings(input);
    return NextResponse.json({ ok: true as const, settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save settings";
    return NextResponse.json(
      { ok: false as const, error: message },
      { status: 400 },
    );
  }
}
