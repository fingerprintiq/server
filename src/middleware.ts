import type { SentinelConfig, SentinelResult } from "./types";

interface SentinelClient {
  inspect(request: Request): Promise<SentinelResult | null>;
}

function runHook(callback: (() => void | Promise<void>) | undefined): void {
  if (!callback) return;

  try {
    void Promise.resolve(callback()).catch(() => undefined);
  } catch {
    // Middleware hooks must never affect the customer request path.
  }
}

export async function inspectBlocking(
  client: SentinelClient,
  config: SentinelConfig,
  request: Request,
): Promise<SentinelResult | null> {
  try {
	    const result = await client.inspect(request);
	    if (result) runHook(() => config.onResult?.(result, request));
	    return result;
  } catch (error) {
    runHook(() => config.onError?.(error, request));
    return null;
  }
}

export function inspectInBackground(
  client: SentinelClient,
  config: SentinelConfig,
  request: Request,
): Promise<void> {
  return (async () => {
    try {
	      const result = await client.inspect(request);
	      if (result) await config.onResult?.(result, request);
    } catch (error) {
      try {
        await config.onError?.(error, request);
      } catch {
        // Background inspection is best-effort by design.
      }
    }
  })();
}
