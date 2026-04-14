export type CallerType = "BROWSER_HUMAN" | "BROWSER_AUTOMATED" | "AI_AGENT" | "CLI_TOOL" | "SDK_CLIENT" | "BOT_SCRAPER" | "UNKNOWN";

export interface SentinelConfig {
  apiKey: string;
  endpoint?: string;
  classify?: boolean;
  rateLimit?: Partial<Record<CallerType, number>>;
  timeout?: number;
}

export interface SentinelResult {
  requestId: string;
  callerId: string;
  callerType: CallerType;
  callerConfidence: number;
  classification: {
    category: CallerType;
    subcategory: string | null;
    framework: string | null;
    runtime: string | null;
    library: string | null;
  };
  fingerprint: {
    hash: string;
    ja4: string | null;
    uaMismatch: boolean;
    likelyBrowser: boolean;
    isDatacenter: boolean;
  };
}
