import type { Context, Next } from "hono";
import type { SentinelConfig, SentinelResult } from "./types";
import { createSentinel } from "./sentinel";

export function sentinel(config: SentinelConfig) {
  const client = createSentinel(config);
  return async (c: Context, next: Next) => {
    try {
      const result = await client.inspect(c.req.raw);
      c.set("sentinel", result);
    } catch {
      c.set("sentinel", null);
    }
    await next();
  };
}

export type { SentinelConfig, SentinelResult } from "./types";
