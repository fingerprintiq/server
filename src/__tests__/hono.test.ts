import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

const mockInspect = vi.fn();

vi.mock("../sentinel", () => ({
  createSentinel: vi.fn(() => ({ inspect: mockInspect })),
}));

import { sentinel } from "../hono";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("@fingerprintiq/server/hono", () => {
  beforeEach(() => {
    mockInspect.mockReset();
  });

  it("sets the sentinel context value in blocking mode", async () => {
    mockInspect.mockResolvedValue({
      callerType: "ai-agent",
      confidence: 0.92,
      reasons: ["user-agent-match"],
    });

    const app = new Hono();
    app.use("*", sentinel({ apiKey: "fiq_live_test", mode: "blocking" }));
    app.get("/probe", (c) => c.json({ sentinel: c.get("sentinel") }));

    const response = await app.request("/probe");
    const body = (await response.json()) as {
      sentinel: { callerType: string; confidence: number };
    };
    expect(body.sentinel.callerType).toBe("ai-agent");
    expect(body.sentinel.confidence).toBe(0.92);
    expect(mockInspect).toHaveBeenCalledTimes(1);
  });

  it("defaults to background inspection without blocking the response", async () => {
    const pending = deferred<{
      callerType: string;
      confidence: number;
      reasons: string[];
    }>();
    const onResult = vi.fn();
    mockInspect.mockReturnValue(pending.promise);

    const app = new Hono();
    app.use("*", sentinel({ apiKey: "fiq_live_test", onResult }));
    app.get("/probe", (c) => c.json({ sentinel: c.get("sentinel") }));

    const response = await app.request("/probe");
    const body = (await response.json()) as { sentinel: unknown };
    expect(body.sentinel).toBe(null);
    expect(mockInspect).toHaveBeenCalledTimes(1);
    expect(onResult).not.toHaveBeenCalled();

    const result = {
      callerType: "ai-agent",
      confidence: 0.91,
      reasons: ["user-agent-match"],
    };
    pending.resolve(result);
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(result, expect.any(Request)));
  });
});
