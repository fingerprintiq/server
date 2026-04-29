import type { SentinelConfig, SentinelResult } from "./types";

const DEFAULT_ENDPOINT = "https://fingerprintiq.com/v1/sentinel/inspect";
const DEFAULT_TIMEOUT_MS = 1000;
const DEFAULT_AGGREGATE_ONLY_PATHS = [
  "/health",
  "/api/health",
  "/v1/health",
  "/api/auth/ok",
  "/api/auth/get-session",
  "/api/openapi.json",
  "/v1/openapi.json",
];
const DEFAULT_IGNORE_PATHS = [
  "/favicon.ico",
  "/robots.txt",
  /^\/(?:assets|static)\//,
  /\.(?:css|js|map|png|jpe?g|gif|svg|webp|ico|woff2?)$/i,
];

function clampRate(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function matchesPath(matcher: NonNullable<SentinelConfig["ignorePaths"]>[number], path: string, request: Request): boolean {
  if (typeof matcher === "string") return matcher === path || path.startsWith(`${matcher}/`);
  if (matcher instanceof RegExp) return matcher.test(path);
  return matcher(path, request);
}

function matchesAny(matchers: NonNullable<SentinelConfig["ignorePaths"]>, path: string, request: Request): boolean {
  for (const matcher of matchers) {
    try {
      if (matchesPath(matcher, path, request)) return true;
    } catch {
      // User supplied matcher errors should not affect the request path.
    }
  }
  return false;
}

export function createSentinel(config: SentinelConfig) {
  const endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
  const timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;
  const sampleRate = clampRate(config.sampleRate, 1);
  const rawSampleRate = clampRate(config.rawSampleRate, 1);
  const ignorePaths = [...DEFAULT_IGNORE_PATHS, ...(config.ignorePaths ?? [])];
  const aggregateOnlyPaths = [...DEFAULT_AGGREGATE_ONLY_PATHS, ...(config.aggregateOnlyPaths ?? [])];

  return {
    async inspect(request: Request): Promise<SentinelResult | null> {
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => { headers[key] = value; });
      const url = new URL(request.url);
      const path = url.pathname;
      if (matchesAny(ignorePaths, path, request)) return null;
      if (sampleRate < 1 && Math.random() > sampleRate) return null;
      const aggregateOnly = config.aggregateOnly === true || matchesAny(aggregateOnlyPaths, path, request);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-Key": config.apiKey },
          body: JSON.stringify({
            userAgent: request.headers.get("user-agent") ?? "",
            headers,
            method: request.method,
            path,
            aggregateOnly,
            rawSampleRate,
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Sentinel API error: ${response.status}`);
        return await response.json() as SentinelResult;
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };
}
