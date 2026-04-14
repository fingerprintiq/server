import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";

const mockInspect = vi.fn();

vi.mock("../sentinel", () => ({
  createSentinel: vi.fn(() => ({ inspect: mockInspect })),
}));

import { sentinel } from "../express";

function listen(app: express.Express): Promise<{ url: string; close: () => void }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => server.close(),
      });
    });
  });
}

describe("@fingerprintiq/server/express", () => {
  beforeEach(() => {
    mockInspect.mockReset();
  });

  it("attaches req.sentinel with the inspect result", async () => {
    mockInspect.mockResolvedValue({
      callerType: "ai-agent",
      confidence: 0.92,
      reasons: ["user-agent-match"],
    });

    const app = express();
    app.use(sentinel({ apiKey: "fiq_live_test" }));
    app.get("/probe", (req, res) => {
      res.json({ sentinel: (req as express.Request & { sentinel: unknown }).sentinel });
    });

    const server = await listen(app);
    try {
      const response = await fetch(`${server.url}/probe`);
      const body = (await response.json()) as {
        sentinel: { callerType: string; confidence: number };
      };
      expect(body.sentinel.callerType).toBe("ai-agent");
      expect(body.sentinel.confidence).toBe(0.92);
      expect(mockInspect).toHaveBeenCalledTimes(1);
    } finally {
      server.close();
    }
  });

  it("sets req.sentinel to null when the API call fails", async () => {
    mockInspect.mockRejectedValue(new Error("network"));

    const app = express();
    app.use(sentinel({ apiKey: "fiq_live_test" }));
    app.get("/probe", (req, res) => {
      res.json({ sentinel: (req as express.Request & { sentinel: unknown }).sentinel });
    });

    const server = await listen(app);
    try {
      const response = await fetch(`${server.url}/probe`);
      const body = (await response.json()) as { sentinel: unknown };
      expect(body.sentinel).toBe(null);
    } finally {
      server.close();
    }
  });

  it("forwards the reconstructed Web Request to inspect()", async () => {
    mockInspect.mockResolvedValue({
      callerType: "browser",
      confidence: 0.99,
      reasons: [],
    });

    const app = express();
    app.use(sentinel({ apiKey: "fiq_live_test" }));
    app.get("/api/data", (_req, res) => {
      res.json({ ok: true });
    });

    const server = await listen(app);
    try {
      await fetch(`${server.url}/api/data`, {
        headers: { "user-agent": "ClaudeBot" },
      });
      const callArgs = mockInspect.mock.calls[0];
      const forwardedRequest = callArgs?.[0] as Request;
      expect(forwardedRequest).toBeInstanceOf(Request);
      expect(forwardedRequest.method).toBe("GET");
      expect(new URL(forwardedRequest.url).pathname).toBe("/api/data");
      expect(forwardedRequest.headers.get("user-agent")).toBe("ClaudeBot");
    } finally {
      server.close();
    }
  });
});
