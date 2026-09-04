import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";

export type SupabaseConnectionStatus =
  | { ok: false; kind: "missing_env" }
  | { ok: false; kind: "query_error"; message: string }
  | { ok: true; kind: "connected"; sawGlobalSettingsRow: boolean };

export async function checkSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  if (!hasSupabasePublicEnv()) {
    return { ok: false, kind: "missing_env" };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("global_settings")
    .select("id")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return { ok: false, kind: "query_error", message: error.message };
  }

  return {
    ok: true,
    kind: "connected",
    sawGlobalSettingsRow: data?.id === 1,
  };
}
