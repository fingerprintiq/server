import type { Context, Next } from "hono";
import type { SentinelConfig, SentinelResult } from "./types";
import { createSentinel } from "./sentinel";
import { inspectBlocking, inspectInBackground } from "./middleware";

interface WaitUntilContext {
  executionCtx?: {
    waitUntil?: (promise: Promise<unknown>) => void;
  };
}

function runInBackground(c: Context, task: Promise<void>): void {
  try {
    const executionCtx = (c as unknown as WaitUntilContext).executionCtx;
    if (executionCtx?.waitUntil) {
      executionCtx.waitUntil(task);
      return;
    }
  } catch {
    // Hono throws when executionCtx is unavailable outside Workers.
  }

  void task;
}

export function sentinel(config: SentinelConfig) {
  const client = createSentinel(config);
  const mode = config.mode ?? "background";
  return async (c: Context, next: Next) => {
    if (mode === "background") {
      c.set("sentinel", null);
      runInBackground(c, inspectInBackground(client, config, c.req.raw));
      await next();
      return;
    }

    c.set("sentinel", await inspectBlocking(client, config, c.req.raw));
    await next();
  };
}

export type { SentinelConfig, SentinelResult } from "./types";
