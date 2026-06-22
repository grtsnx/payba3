<p align="center">
  <img src="./assets/payba3-logo.svg" alt="Payba3" width="220" />
</p>

<p align="center">
  One payment integration surface for many payment channels.
</p>

<p align="center">
  <a href="./LICENSE">License</a>
  ·
  <a href="./CONTRIBUTING.md">Contributing</a>
  ·
  <a href="./SECURITY.md">Security</a>
  ·
  <a href="./SUPPORT.md">Support</a>
</p>

# Payba3

Payba3 is an open-source collection of payment-channel integrations built for developers, teams, codebases, automations, and AI agents that need a simple way to plug into different payment providers.

Configure the provider you want, select it through Payba3, and call the channel.

```ts
const paystack = payba3.use('paystack');

await paystack.initializeOneTimeCheckout({
  email: 'customer@example.com',
  amountInKobo: 500000,
  currency: 'NGN',
});
```

Payba3 is growing. More providers, methods, adapters, and examples will be added over time.

## About

Modern products rarely stay tied to one payment provider forever. A team may start with one checkout provider, add virtual accounts later, route a payout through another provider, run identity checks with a verification API, and still need a clean way for application code, scripts, background jobs, and AI agents to call those channels without learning every provider from scratch.

Payba3 is a developer-friendly payment integration layer for that reality. It gives each provider a named channel, keeps provider credentials in configuration, and exposes direct methods for common actions such as checkout, virtual accounts, transfers, subaccounts, account linking, and identity checks.

Use Payba3 when you want:

- One dependency for multiple payment and verification providers.
- A simple provider selector: `payba3.use('provider')`.
- Provider-specific methods without rewriting authentication and token-refresh logic.
- A project that can be used by normal application code, workflow automations, scripts, and AI agents.
- A growing open-source base where more providers can be added over time.

## Supported Channels

| Channel | Common use cases | Provider signup | Provider docs |
| --- | --- | --- | --- |
| Paystack | Checkout, subscriptions, transfers, dedicated accounts | [Create account](https://paystack.com/developers) | [Docs](https://paystack.com/docs/api/) |
| Safehaven | Virtual accounts, subaccounts, banking APIs | [Sandbox](https://online.sandbox.safehavenmfb.com) | [Docs](https://safehavenmfb.readme.io/reference/introduction) |
| SeerBit | Collections, virtual accounts, online payments | [Create account](https://www.seerbit.com/developers) | [Docs](https://doc.seerbit.com/) |
| OPay | Checkout, signed payment APIs, refunds | [Merchant dashboard](https://merchant.opaycheckout.com) | [Docs](https://doc.opaycheckout.com/payment-authentication) |
| Mono | Open banking, account linking, DirectPay, lookup | [Create account](https://mono.co/signup) | [Docs](https://docs.mono.co/docs/quickstart) |
| Monnify | Checkout, reserved accounts, transfers, wallets | [Create account](https://app.monnify.com/create-account) | [Docs](https://developers.monnify.com/docs/collections/quickstart) |
| QoreID | KYC, CAC lookup, identity verification | [Create account](https://dashboard.qoreid.com/dashboard) | [Docs](https://docs.qoreid.com/) |

## Installation

```bash
npm install payba3
```

```bash
yarn add payba3
```

```bash
pnpm add payba3
```

```bash
bun add payba3
```

If you are using the repository directly:

```bash
bun install
```

## Quick Usage

Register Payba3 in your application, then use `Payba3Service` to select a channel.

```ts
import { Payba3Service } from 'payba3';

export class Payments {
  constructor(private readonly payba3: Payba3Service) {}

  async collectWithPaystack() {
    return this.payba3.use('paystack').initializeOneTimeCheckout({
      email: 'customer@example.com',
      amountInKobo: 250000,
      currency: 'NGN',
      reference: 'order_123',
    });
  }

  async createSafehavenSubAccount() {
    return this.payba3.use('safehaven').createSubAccount({
      phoneNumber: '08000000000',
      identityType: 'vID',
      identityId: 'identity-id',
      emailAddress: 'customer@example.com',
      externalReference: 'customer_123',
    });
  }
}
```

You can also use a channel directly when you want provider-specific methods:

```ts
await monnify.createReservedAccount({
  accountReference: 'customer_123',
  accountName: 'Jane Doe',
  customerName: 'Jane Doe',
  customerEmail: 'jane@example.com',
  bvn: '00000000000',
});
```

## Configuration

Only configure the providers you use. Missing credentials for unused providers should not block your application from starting.

### Paystack

```bash
PAYSTACK_SECRET_KEY=
PAYSTACK_SECRET_KEY_LIVE=
```

### Safehaven

```bash
SAFEHAVEN_ENVIRONMENT=sandbox
SAFEHAVEN_CLIENT_ID=
SAFEHAVEN_CLIENT_ASSERTION=
SAFEHAVEN_TIMEOUT_MS=10000
```

Switch to production:

```bash
SAFEHAVEN_ENVIRONMENT=live
```

### SeerBit

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

## Provider Selection

```ts
payba3.use('paystack');
payba3.use('safehaven');
payba3.use('seerbit');
payba3.use('opay');
payba3.use('mono');
payba3.use('monnify');
payba3.use('qoreid');
```

Unsupported providers throw a clear error.

```ts
payba3.use('unknown'); // throws Unsupported payment channel
```

## Token Handling

Payba3 refreshes expiring provider tokens before they become stale.

- Safehaven uses `expires_in` from the token response.
- QoreID uses `expiresIn` from the token response.
- Monnify derives expiry from the JWT `exp` claim when available.

## For AI Agents And Automation

Payba3 is intended to be easy for agents and automation workflows to reason about:

- Provider names are explicit.
- Configuration is environment based.
- Request signing and token refresh are handled by Payba3.
- Provider-specific actions remain discoverable through named channels.

## Contributor Checks

```bash
bun install --frozen-lockfile
bun run lint
bun run test
bun run test:e2e
bun run build
bun audit
```

## Contributing

Payba3 welcomes provider additions, method coverage, docs, tests, examples, and security hardening.

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## Security

Do not open public issues for vulnerabilities. Read [SECURITY.md](./SECURITY.md) for supported reporting channels and safe disclosure guidance.

## License

MIT. See [LICENSE](./LICENSE).
