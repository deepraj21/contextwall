# ContextWall

**A TypeScript-first utility that intercepts API keys, tokens, PII, and secrets from strings before they are sent to any AI provider — then optionally restores them in the model's output. 100% local, zero-dependency, works with any LLM SDK.**

[![npm version](https://img.shields.io/npm/v/contextwall)](https://npmjs.com/package/contextwall)
[![license](https://img.shields.io/npm/l/contextwall)](./LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/contextwall)](https://bundlephobia.com/package/contextwall)

- Zero network calls
- Zero runtime dependencies
- Browser-safe core
- ESM + CJS output

---

## The Problem

```typescript
// You write this
const { text } = await generateText({
  model: 'anthropic/claude-sonnet-4-5',
  prompt: `Here is the api key rsk_124321, use it to call the payments API`,
});

// rsk_124321 just left your app and is now in:
// - the provider's request logs
// - your observability platform
// - third-party SDKs on the request path
// - possibly fine-tuning datasets
```

## The Fix

```typescript
import { promptwall } from 'contextwall';

const { text } = await generateText({
  model: 'anthropic/claude-sonnet-4-5',
  prompt: promptwall(`Here is the api key rsk_124321, use it to call the payments API`),
});

// Prompt sent: "Here is the api key [API_KEY], use it to call the payments API"
// Your secret never leaves your runtime.
```

---

## Installation

```bash
npm install contextwall
# or
pnpm add contextwall
# or
yarn add contextwall
# or
bun add contextwall
```

---

## API Overview

| Function | Purpose | Returns |
|---|---|---|
| `promptwall(text, options?)` | Sanitize a prompt string | `string` or `{ text, context }` for tokenize |
| `dewall(text, context)` | Restore tokenized values in model output | `string` |
| `auditwall(text, options?)` | Dry-run detection report | `AuditReport` |
| `createwall(config)` | Build a pre-configured sanitizer | `(text, override?) => string` |
| `batchwall(prompts, options?)` | Sanitize an array of prompts | `string[]` or `{ texts, contexts }` |
| `schemawall(obj, options?)` | Recursively sanitize an object's strings | same shape, or `{ value, context }` for tokenize |
| `streamwall(options?)` | Web `TransformStream<string, string>` sanitizer | `TransformStream` |
| `policywall(text, policy, options?)` | Enforce block/warn/redact policy | `string` or throws `WallPolicyError` |
| `logwall(text, options?)` | Sanitize and emit structured detection events | `string` |

---

## Replacement Strategies

| Strategy | Input | Output |
|---|---|---|
| `placeholder` (default) | `sk_live_abc` | `[API_KEY]` |
| `semantic` | `sk_live_abc` | `sk_test_EXAMPLE000` |
| `tokenize` | `sk_live_abc` | `[SECRET::a1b2c3]` + context object |

---

## Built-in Detectors

| Detector | What it catches | Severity |
|---|---|---|
| `api_keys` | `sk_`, `rsk_`, `pk_live`, `pk_test`, `AKIA` (AWS), `hf_` (HuggingFace) | critical |
| `jwt` | `eyJ...` base64 JWT format | high |
| `bearer_tokens` | `Bearer <token>` patterns | high |
| `pii_email` | RFC-valid email addresses | medium |
| `pii_phone` | International phone number formats | medium |
| `pii_ssn` | US Social Security Numbers | high |
| `pii_credit_card` | Luhn-validated card numbers | critical |
| `ip_address` | IPv4 and IPv6 addresses | low |
| `private_key` | `-----BEGIN ... PRIVATE KEY-----` blocks | critical |
| `connection_string` | `mongodb://`, `postgresql://`, `redis://` with credentials | critical |
| `env_variable` | Inline `process.env.X = "value"` patterns | high |
| `high_entropy` | High-entropy strings likely to be secrets (opt-in) | medium |

---

## API Reference

### `promptwall(text, options?)`

The primary function. Sanitizes a prompt string and returns a clean version.

```typescript
import { promptwall } from 'contextwall';

const clean = promptwall('My token is sk_live_abc123 and email is john@acme.com');
// → "My token is [API_KEY] and email is [EMAIL]"

// With options
const clean = promptwall(text, {
  strategy: 'placeholder', // 'placeholder' | 'semantic' | 'tokenize'
  detectors: ['api_keys', 'jwt', 'pii_email'],
  customRules: [],
  onDetect: (event) => console.log('Detected:', event.type),
  strict: false, // enable entropy scanner
});
```

---

### `dewall(text, context)`

Restores original values in LLM output when using `strategy: 'tokenize'`.

```typescript
import { promptwall, dewall } from 'contextwall';

const { text: safePrompt, context } = promptwall('token: sk_live_abc', {
  strategy: 'tokenize',
});

const result = await generateText({ prompt: safePrompt });

const restored = dewall(result.text, context);
```

---

### `auditwall(text, options?)`

Dry-run mode. Returns a full detection report without modifying the string.

```typescript
import { auditwall } from 'contextwall';

const report = auditwall('Send $500 to john@acme.com, auth: rsk_xyz');
// {
//   original: '...',
//   sanitized: '...',
//   detections: [
//     { type: 'EMAIL', value: 'john@acme.com', start: 15, end: 27, severity: 'medium' },
//     { type: 'API_KEY', value: 'rsk_xyz', start: 36, end: 43, severity: 'high' }
//   ],
//   riskScore: 82,
//   detectorsCalled: ['api_keys', 'pii_email']
// }
```

---

### `createwall(config)`

Factory that returns a pre-configured `promptwall`. Use this for consistent sanitization across your codebase.

```typescript
import { createwall } from 'contextwall';

const mywall = createwall({
  strategy: 'semantic',
  detectors: ['api_keys', 'pii_email', 'jwt'],
  customRules: [
    {
      name: 'INTERNAL_EMPLOYEE_ID',
      pattern: /EMP-\d{6}/g,
      severity: 'medium',
      replace: 'EMP-[REDACTED]',
    },
  ],
});

export { mywall }; // share across your project
```

---

### `batchwall(prompts, options?)`

Sanitizes an array of prompts in a single pass.

```typescript
import { batchwall } from 'contextwall';

const cleaned = batchwall([
  'Key: sk_live_abc',
  'Email: john@example.com',
  'JWT: eyJhbGciOiJSUzI1...',
]);
// → ['Key: [API_KEY]', 'Email: [EMAIL]', 'JWT: [JWT_TOKEN]']
```

---

### `schemawall(obj, options?)`

Recursively sanitizes any JavaScript object or JSON structure. Perfect for sanitizing full chat message arrays before sending.

```typescript
import { schemawall } from 'contextwall';

const messages = [
  { role: 'system', content: 'API key is sk_live_abc123' },
  { role: 'user', content: 'My email is john@acme.com' },
];

const safe = schemawall(messages);
// [
//   { role: 'system', content: 'API key is [API_KEY]' },
//   { role: 'user',   content: 'My email is [EMAIL]' }
// ]
```

---

### `streamwall(options?)`

A Web `TransformStream` for sanitizing content in a streaming pipeline.

```typescript
import { streamwall } from 'contextwall';
import { pipeline } from 'stream/promises';

await pipeline(
  promptReadableStream,
  streamwall({ strategy: 'placeholder' }),
  llmWritableStream
);
```

---

### `policywall(text, policy)`

Enforces per-type action policies: block (throws), warn, or redact.

```typescript
import { policywall, WallPolicyError } from 'contextwall';

const policy = {
  API_KEY: 'block',   // throws WallPolicyError
  JWT_TOKEN: 'warn',  // console.warn, returns original
  EMAIL: 'redact',    // silently replaces
  default: 'redact',
};

try {
  const safe = policywall('key: rsk_abc, email: a@b.com', policy);
} catch (e) {
  if (e instanceof WallPolicyError) {
    console.error('Secret blocked from prompt:', e.detections);
  }
}
```

---

### `logwall(text, options?)`

Sanitizes and emits a structured audit log entry per detection. The original secret value is intentionally never logged.

```typescript
import { logwall } from 'contextwall';

const clean = logwall('api: sk_abc token: eyJhb...', {
  logger: (event) => {
    myLogger.warn('Secret detected in prompt', {
      type: event.type,
      severity: event.severity,
      position: [event.start, event.end],
      timestamp: event.timestamp,
      // value is intentionally NOT logged
    });
  },
});
```

---

## Custom Detectors

```typescript
import { createwall } from 'contextwall';

const wall = createwall({
  customRules: [
    {
      name: 'STRIPE_WEBHOOK_SECRET',
      pattern: /whsec_[a-zA-Z0-9]{32,}/g,
      severity: 'critical',
      replace: '[STRIPE_WEBHOOK_SECRET]',
    },
    {
      name: 'INTERNAL_USER_ID',
      pattern: /USR-[0-9]{8}/g,
      severity: 'low',
      replace: (match) => `USR-[REDACTED]`,
    },
  ],
});
```

---

## Middleware

### Express

```typescript
import { wallMiddleware } from 'contextwall/middleware';

app.use('/api/chat', wallMiddleware({
  target: ['body.prompt', 'body.messages'],
  strategy: 'placeholder',
}));
```

### Next.js API Routes

```typescript
import { withWall } from 'contextwall/middleware';

export default withWall(
  async function handler(req, res) {
    // req.body.prompt is already sanitized
    const result = await generateText({ prompt: req.body.prompt });
    res.json({ text: result.text });
  },
  { target: ['body.prompt'] }
);
```

### Hono

```typescript
import { honoWall } from 'contextwall/middleware';

app.use('/chat', honoWall({ target: ['body.prompt'] }));
```

---

## SDK Integrations

### Vercel AI SDK

```typescript
import { wallPrompt } from 'contextwall/integrations/vercel-ai';

const { text } = await generateText({
  model: openai('gpt-4o'),
  ...wallPrompt('My key is sk_live_abc, summarize the docs'),
});
```

### OpenAI SDK

```typescript
import { sanitizeRequest } from 'contextwall/integrations/openai';

const response = await openai.chat.completions.create(
  sanitizeRequest({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'key: sk_live_abc' }],
  })
);
```

### LangChain

```typescript
import { WallRunnable } from 'contextwall/integrations/langchain';

const chain = WallRunnable.from({ strategy: 'placeholder' }).pipe(llm);
const result = await chain.invoke('my token is rsk_abc');
```

---

## TypeScript

ContextWall is written in TypeScript and ships full type definitions.

```typescript
import type {
  WallConfig,
  WallContext,
  WallPolicy,
  AuditReport,
  DetectionEvent,
  DetectorName,
  CustomRule,
  WallPolicyError,
} from 'contextwall';
```

---

## Security Model

ContextWall is entirely local. It makes no network calls, stores no data, and emits no telemetry. All detection and replacement happens in-process.

- Detection is deterministic — no ML or remote models
- Secrets are removed from strings before they can be serialized or transmitted
- `logwall()` events never include the original secret value
- The `tokenize` strategy's `WallContext` is in-memory only and never persisted automatically

---

## Limitations

- **Not a substitute for secrets management.** Don't put real secrets in prompts to begin with — use environment variables and reference them by placeholder. ContextWall is a safety net, not a vault.
- **Regex-based detection has limits.** Novel or obfuscated secret formats may not be caught unless you add custom rules or enable `strict` mode.
- **`dewall()` requires in-memory context.** Tokenized prompts can only be de-tokenized within the same process/request lifecycle.

---

## Contributing

```bash
git clone https://github.com/deepraj21/contextwall
cd contextwall
pnpm install
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run test:coverage
pnpm run build
```

New detectors should ship with:

- True positive test cases (must detect)
- False positive test cases (must not detect)
- A severity rating with justification

---

## License

MIT © ContextWall Contributors