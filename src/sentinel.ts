import type { SentinelConfig, SentinelResult } from "./types";

const DEFAULT_ENDPOINT = "https://fingerprintiq.com/v1/sentinel/inspect";

export function createSentinel(config: SentinelConfig) {
  const endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
  const timeout = config.timeout ?? 5000;

  return {
    async inspect(request: Request): Promise<SentinelResult> {
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => { headers[key] = value; });
      const url = new URL(request.url);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-Key": config.apiKey },
          body: JSON.stringify({ userAgent: request.headers.get("user-agent") ?? "", headers, method: request.method, path: url.pathname }),
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
