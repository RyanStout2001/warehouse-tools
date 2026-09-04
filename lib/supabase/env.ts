function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill in the values.`,
    );
  }
  return value;
}

export function getSupabasePublicEnv() {
  return {
    url: requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function hasSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function hasSupabaseServiceRoleEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function getSupabaseServiceRoleKey() {
  return requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function hasPicqerEnv() {
  return Boolean(
    (process.env.PICQER_SUBDOMAIN?.trim() ||
      process.env.PICQER_BASE_URL?.trim()) &&
      process.env.PICQER_API_KEY?.trim(),
  );
}

export function getPicqerEnv() {
  const raw =
    process.env.PICQER_BASE_URL?.trim() ||
    process.env.PICQER_SUBDOMAIN?.trim() ||
    "";
  if (!raw) {
    throw new Error("Missing PICQER_SUBDOMAIN (or PICQER_BASE_URL).");
  }

  return {
    origin: normalizePicqerOrigin(raw),
    apiKey: requiredEnv("PICQER_API_KEY"),
  };
}

function normalizePicqerOrigin(raw: string): string {
  let value = raw.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(value)) {
    value = value.includes(".")
      ? `https://${value}`
      : `https://${value}.picqer.com`;
  }
  const url = new URL(value);
  return `${url.protocol}//${url.host}`;
}
