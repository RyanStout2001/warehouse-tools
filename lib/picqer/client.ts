import { getPicqerEnv } from "@/lib/supabase/env";

const PAGE_SIZE = 100;
const USER_AGENT = "warehouse-tools (local inventory auditor)";

export type PicqerGetResult<T> = {
  data: T;
  rateLimitRemaining: number | null;
  rateLimitLimit: number | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function headerNumber(headers: Headers, name: string): number | null {
  const value = headers.get(name);
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Read-only Picqer helper. Only GET is implemented on purpose.
 */
export async function picqerGet<T>(
  path: string,
  searchParams?: Record<string, string | number>,
): Promise<PicqerGetResult<T>> {
  const { origin, apiKey } = getPicqerEnv();
  const url = new URL(`/api/v1${path.startsWith("/") ? path : `/${path}`}`, origin);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, String(value));
    }
  }

  const credentials = Buffer.from(`${apiKey}:`).toString("base64");
  let attempt = 0;

  while (true) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${credentials}`,
        "User-Agent": USER_AGENT,
      },
      cache: "no-store",
    });

    const remaining = headerNumber(response.headers, "x-ratelimit-remaining");
    const limit = headerNumber(response.headers, "x-ratelimit-limit");

    if (response.status === 429) {
      attempt += 1;
      if (attempt > 5) {
        throw new Error("Picqer rate limit hit (429) too many times.");
      }
      const retryAfter = headerNumber(response.headers, "retry-after") ?? 60;
      await sleep(Math.max(retryAfter, 1) * 1000);
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Picqer GET ${url.pathname} failed (${response.status}): ${body.slice(0, 300)}`,
      );
    }

    if (remaining !== null && remaining < 20) {
      await sleep(300);
    }

    const data = (await response.json()) as T;
    return { data, rateLimitRemaining: remaining, rateLimitLimit: limit };
  }
}

export async function picqerGetAllPages<T>(
  path: string,
  extraParams?: Record<string, string | number>,
): Promise<{ items: T[]; lastRateLimitRemaining: number | null; requestCount: number }> {
  const items: T[] = [];
  let offset = 0;
  let requestCount = 0;
  let lastRateLimitRemaining: number | null = null;

  while (true) {
    const page = await picqerGet<T[]>(path, { ...extraParams, offset });
    requestCount += 1;
    lastRateLimitRemaining = page.rateLimitRemaining;
    items.push(...page.data);

    if (page.data.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
    await sleep(50);
  }

  return { items, lastRateLimitRemaining, requestCount };
}
