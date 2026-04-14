# @fingerprintiq/server

[![npm](https://img.shields.io/npm/v/@fingerprintiq/server.svg)](https://www.npmjs.com/package/@fingerprintiq/server)
[![npm downloads](https://img.shields.io/npm/dm/@fingerprintiq/server.svg)](https://www.npmjs.com/package/@fingerprintiq/server)
[![license](https://img.shields.io/npm/l/@fingerprintiq/server.svg)](./LICENSE)

Server-side request fingerprinting middleware. Classify every API caller as a browser, AI agent, CLI tool, SDK client, or bot — without requiring the caller to identify themselves.

- **Docs**: [docs.fingerprintiq.com/guides/server-side](https://docs.fingerprintiq.com/guides/server-side)
- **npm**: [npmjs.com/package/@fingerprintiq/server](https://www.npmjs.com/package/@fingerprintiq/server)
- **Issues**: [github.com/fingerprintiq/server/issues](https://github.com/fingerprintiq/server/issues)

## Install

```bash
npm install @fingerprintiq/server
```

## Quick Start (Hono)

```typescript
import { Hono } from 'hono';
import { sentinel } from '@fingerprintiq/server/hono';

const app = new Hono();

app.use('/api/*', sentinel({
  apiKey: 'fiq_live_...',
  classify: true,
}));

app.get('/api/data', (c) => {
  const caller = c.get('sentinel');
  console.log(caller?.callerType);  // "AI_AGENT", "CLI_TOOL", "BROWSER_HUMAN", etc.
  console.log(caller?.classification.framework); // "langchain", "crewai", etc.
  return c.json({ ok: true });
});
```

## Quick Start (Express)

```typescript
import express from 'express';
import { sentinel } from '@fingerprintiq/server/express';

const app = express();
app.use(sentinel({ apiKey: 'fiq_live_...' }));

app.get('/api/data', (req, res) => {
  const caller = req.sentinel;
  console.log(caller?.callerType);
  res.json({ ok: true });
});
```

Both middlewares share the same classification engine — pick whichever matches your stack.

## Programmatic Usage

```typescript
import { createSentinel } from '@fingerprintiq/server';

const sentinel = createSentinel({ apiKey: 'fiq_live_...' });

const result = await sentinel.inspect(request);
console.log(result.callerType);       // "AI_AGENT"
console.log(result.callerConfidence); // 0.85
```

## Caller Types

| Type | Description |
|------|-------------|
| `BROWSER_HUMAN` | Real browser with human timing patterns |
| `BROWSER_AUTOMATED` | Real browser but automated (Puppeteer, Playwright) |
| `AI_AGENT` | AI agent framework (LangChain, CrewAI, AutoGen) |
| `CLI_TOOL` | Command-line tool (curl, httpie, wget) |
| `SDK_CLIENT` | Server-side SDK (python-requests, node-fetch, Go net/http) |
| `BOT_SCRAPER` | Web scraper or crawler |
| `UNKNOWN` | Insufficient signals to classify |

## Classification Details

```typescript
interface SentinelResult {
  callerId: string;
  callerType: CallerType;
  callerConfidence: number;
  classification: {
    category: CallerType;
    subcategory: string | null;
    framework: string | null;   // "langchain", "crewai", etc.
    runtime: string | null;     // "python", "node", "go", etc.
    library: string | null;     // "requests", "httpx", "curl", etc.
  };
  fingerprint: {
    hash: string;
    ja4: string | null;
    uaMismatch: boolean;
    likelyBrowser: boolean;
    isDatacenter: boolean;
  };
}
```

## Sibling Packages

| Package | Purpose |
|---------|---------|
| [`@fingerprintiq/js`](https://www.npmjs.com/package/@fingerprintiq/js) | Browser fingerprinting |
| [`@fingerprintiq/server`](https://www.npmjs.com/package/@fingerprintiq/server) | Server-side caller classification (this package) |
| [`@fingerprintiq/pulse`](https://www.npmjs.com/package/@fingerprintiq/pulse) | CLI usage analytics and machine fingerprinting |
| [`fingerprintiq`](https://pypi.org/project/fingerprintiq/) (PyPI) | Python SDK — Identify, Sentinel, Pulse |

## Contributing

This repo is a **read-only public mirror**. The master copy lives in the private FingerprintIQ monorepo and is synced here on every push to `main`. Please [file issues](https://github.com/fingerprintiq/server/issues) rather than PRs.

## License

MIT
