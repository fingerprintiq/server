import type { Request as ExpressRequest, Response, NextFunction, RequestHandler } from "express";
import type { SentinelConfig, SentinelResult } from "./types";
import { createSentinel } from "./sentinel";

declare module "express-serve-static-core" {
  interface Request {
    sentinel?: SentinelResult | null;
  }
}

export function sentinel(config: SentinelConfig): RequestHandler {
  const client = createSentinel(config);
  return async (req: ExpressRequest, _res: Response, next: NextFunction) => {
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

      const webRequest = new Request(url, {
        method: req.method,
        headers,
      });

      req.sentinel = await client.inspect(webRequest);
    } catch {
      req.sentinel = null;
    }
    next();
  };
}

export type { SentinelConfig, SentinelResult } from "./types";
