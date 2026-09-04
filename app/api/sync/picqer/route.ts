import { NextResponse } from "next/server";
import { syncPicqerCatalog } from "@/lib/picqer/sync";
import { hasPicqerEnv, hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST() {
  if (!hasSupabaseServiceRoleEnv()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing SUPABASE_SERVICE_ROLE_KEY. Add the service_role key from Supabase → Project Settings → API to .env.local, then restart npm run dev.",
      },
      { status: 400 },
    );
  }

  if (!hasPicqerEnv()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing PICQER_SUBDOMAIN and/or PICQER_API_KEY in .env.local. Restart the dev server after saving.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await syncPicqerCatalog();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sync error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
