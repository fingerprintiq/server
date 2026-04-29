import type { Request as ExpressRequest, Response, NextFunction, RequestHandler } from "express";
import type { SentinelConfig, SentinelResult } from "./types";
import { createSentinel } from "./sentinel";
import { inspectBlocking, inspectInBackground } from "./middleware";

declare module "express-serve-static-core" {
  interface Request {
    sentinel?: SentinelResult | null;
  }
}

export function sentinel(config: SentinelConfig): RequestHandler {
  const client = createSentinel(config);
  const mode = config.mode ?? "background";
  return async (req: ExpressRequest, _res: Response, next: NextFunction) => {
    let webRequest: Request;
    try {
      const protocol = (req.headers["x-forwarded-proto"] as string | undefined) ?? "http";
      const host = req.headers.host ?? "localhost";
      const url = `${protocol}://${host}${req.originalUrl || req.url}`;

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          for (const v of value) headers.append(key, v);
        } else {
          headers.set(key, value);
        }
      }

      webRequest = new Request(url, {
        method: req.method,
        headers,
      });
    } catch {
      req.sentinel = null;
      next();
      return;
    }

    if (mode === "background") {
      req.sentinel = null;
      void inspectInBackground(client, config, webRequest);
      next();
      return;
    }

    req.sentinel = await inspectBlocking(client, config, webRequest);
    next();
  };
}

export type { SentinelConfig, SentinelResult } from "./types";
