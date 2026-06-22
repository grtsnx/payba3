# Payba3

Payba3 is a growing NestJS collection of payment-channel integrations. The goal is simple: developers should add their provider config, inject one Payba3 entry point, choose the provider they want, and call the provider without rebuilding the same payment plumbing every time.

Current channels:

- Paystack
- Safehaven
- Seerbit
- OPay
- Mono
- Monnify
- QoreID

Payba3 is still growing, so the provider list and method coverage will expand over time.

## What Payba3 Provides

- One NestJS `LibModule` that registers all supported channels.
- One `Payba3Service` facade for selecting a provider by name.
- Provider-specific services for direct access when you need full control.
- Typed request payloads and response wrappers per provider.
- Isolated helpers for auth, request signing, token refresh, parsing, and error handling.
- Sandbox/live switching from environment variables.
- Auto-refreshing access tokens for providers that expire tokens, including Safehaven, QoreID, and Monnify.
- Local LLM reference files beside the matching provider code.

## Quick Start

Install dependencies:

```bash
bun install
```

Run the app:

```bash
bun run start:dev
```

Health check:

```bash
curl http://localhost:3000/v1/health
```

## Using One Entry Point

Import `LibModule` in your Nest module, then inject `Payba3Service`.

```ts
import { Injectable } from '@nestjs/common';
import { Payba3Service } from 'src/lib/payba3.service';

@Injectable()
export class CheckoutService {
  constructor(private readonly payba3: Payba3Service) {}

  async checkout(email: string, amountInKobo: number) {
    const paystack = this.payba3.use('paystack');

    return paystack.initializeOneTimeCheckout({
      email,
      amountInKobo,
      currency: 'NGN',
    });
  }
}
```

You can also inject a provider service directly, for example `SafehavenService`, `OPayService`, or `MonnifyService`.

## Provider Config

Only configure the providers you plan to use. Payba3 does not crash the app at startup when an unused provider is missing credentials; it validates credentials when that provider is called.

### Safehaven

```bash
SAFEHAVEN_ENVIRONMENT=sandbox
SAFEHAVEN_CLIENT_ID=
SAFEHAVEN_CLIENT_ASSERTION=
SAFEHAVEN_TIMEOUT_MS=10000
```

Switch to live:

```bash
SAFEHAVEN_ENVIRONMENT=live
```

### Paystack

```bash
PAYSTACK_SECRET_KEY=
PAYSTACK_SECRET_KEY_LIVE=
```

### Seerbit

```bash
SEERBIT_PUBLIC_KEY=
SEERBIT_SECRET_KEY=
```

### OPay

```bash
OPAY_ENVIRONMENT=sandbox
OPAY_MERCHANT_ID=
OPAY_PUBLIC_KEY=
OPAY_SECRET_KEY=
OPAY_LIVE_MERCHANT_ID=
OPAY_LIVE_PUBLIC_KEY=
OPAY_LIVE_SECRET_KEY=
```

### Mono

```bash
MONO_ENVIRONMENT=sandbox
MONO_SECRET_KEY=
MONO_LIVE_SECRET_KEY=
```

### Monnify

```bash
MONNIFY_ENVIRONMENT=sandbox
MONNIFY_API_KEY=
MONNIFY_SECRET_KEY=
MONNIFY_CONTRACT_CODE=
MONNIFY_LIVE_API_KEY=
MONNIFY_LIVE_SECRET_KEY=
MONNIFY_LIVE_CONTRACT_CODE=
```

### QoreID

```bash
QOREID_CLIENT=
QOREID_SECRET=
QOREID_LIVE_CLIENT=
QOREID_LIVE_SECRET=
```

## API Docs

Scalar and Swagger are available outside production:

- Scalar: `/reference`
- Swagger: `/docs`
- OpenAPI JSON: `/docs-json`

In production, docs are disabled unless `ENABLE_API_DOCS=true`.

## Security Defaults

- Helmet security headers with a docs-aware CSP.
- Strict body-size and URL-encoded parameter limits.
- CORS allowlist via `CORS_ORIGINS`.
- Global validation pipe with whitelisting and non-whitelisted-field rejection.
- Pino redaction for auth headers, tokens, cookies, and client assertions.
- Provider secrets are read from env and are not hardcoded in source.
- Token-bearing providers refresh before expiry instead of reusing stale tokens.

## Tests And CI Readiness

Run the same checks locally:

```bash
bun install --frozen-lockfile
bun run lint
bun run test
bun run test:e2e
bun run build
bun audit
```

Current test coverage includes:

- Payba3 provider facade selection.
- Safehaven token cache and proactive refresh behavior.
- QoreID token refresh behavior.
- Monnify JWT expiry parsing and refresh behavior.
- OPay public-key auth, signed auth, and callback signature verification.
- Mono request headers and query helpers.
- Paystack startup readiness without eager credential failure.
- Basic app e2e route health.

## LLM Reference Files

Provider reference docs are stored beside their channel implementation:

- `src/lib/paystack/paystack_llm.txt`
- `src/lib/opay/opay_llm.txt`
- `src/lib/mono/mono_llm.txt`
- `src/lib/monnify/monnify_llm.txt`

## Release Packaging

Release packages are automated with GitHub Actions in `release.yml`.

```bash
bun run build
bun run package:release staging 0.0.1
```
