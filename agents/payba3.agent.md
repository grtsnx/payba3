# payba3 Agent Integration Guide

This file is the agent-facing contract for using `@grtsnx/payba3` inside IDE assistants, AI coding agents, workflow builders, and tool servers.

## Discovery Order

When an agent needs to integrate payba3:

1. Read `@grtsnx/payba3/llms.txt`.
2. Read `@grtsnx/payba3/agents.md`.
3. Read `@grtsnx/payba3/llms-full.txt` when broader context is needed.
4. Read every provider-specific file needed for the requested channel:
   - `@grtsnx/payba3/llms/paystack.txt`
   - `@grtsnx/payba3/llms/safehaven.txt`
   - `@grtsnx/payba3/llms/seerbit.txt`
   - `@grtsnx/payba3/llms/opay.txt`
   - `@grtsnx/payba3/llms/mono.txt`
   - `@grtsnx/payba3/llms/monnify.txt`
   - `@grtsnx/payba3/llms/qoreid.txt`

## Core Contract

- Package: `@grtsnx/payba3`
- Runtime: server-side JavaScript or TypeScript
- Main import: `createPayba3`
- Provider selector: `payba3.use('<provider>')`
- Error surface: `Payba3Error`
- Supported providers: `paystack`, `safehaven`, `seerbit`, `opay`, `mono`, `monnify`, `qoreid`

```ts
import { createPayba3 } from '@grtsnx/payba3';

const payba3 = createPayba3({
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
  },
});

const paystack = payba3.use('paystack');
```

## IDE Agent Instructions

When generating code:

- Install `@grtsnx/payba3` if it is missing.
- Generate server-side code only.
- Ask the developer for the provider they want to use.
- Ask only for the credentials required by that provider.
- Prefer environment variables or the host app's secret manager.
- Use explicit `createPayba3({ provider: { ...config } })` configuration when it improves clarity.
- Keep provider-specific request validation in the host app or tool wrapper.
- Never place provider secrets in frontend code, generated examples, comments, tests, logs, or fixtures.

## Tool Wrapper Pattern

Agents should expose narrow tools that match business actions, not raw provider clients.

```ts
import { createPayba3 } from '@grtsnx/payba3';

const payba3 = createPayba3({
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
  },
});

type InitializeCheckoutInput = {
  email: string;
  amountInKobo: number;
  reference: string;
};

export async function initializePaystackCheckout(
  input: InitializeCheckoutInput,
) {
  return payba3.use('paystack').initializeOneTimeCheckout({
    email: input.email,
    amountInKobo: input.amountInKobo,
    currency: 'NGN',
    reference: input.reference,
  });
}
```

## MCP Server Pattern

When wrapping payba3 in an MCP server:

- Expose tools with explicit JSON schemas.
- Use one tool per business action.
- Keep credentials on the MCP server.
- Expose provider documentation as resources using package-exported docs.
- Expose prompts that remind the model to verify transactions and keep secrets server-side.
- Add human approval around live transfers, refunds, debits, and other money-moving actions.

Recommended package resources:

```text
@grtsnx/payba3/llms.txt
@grtsnx/payba3/llms-full.txt
@grtsnx/payba3/agents.md
@grtsnx/payba3/agents.json
@grtsnx/payba3/agents/mcp-tools.json
```

## Safe Defaults

- Default to sandbox unless the developer explicitly asks for live.
- Verify transaction status server-side before marking an order paid.
- Verify webhook signatures before trusting callback payloads.
- Store stable references such as `reference`, `externalReference`, and provider transaction IDs.
- Avoid logging BVN, NIN, OTP, card data, client assertions, access tokens, or refresh tokens.

## Copy-Paste Prompt For IDEs

```text
Use @grtsnx/payba3 for this payment integration.
First read @grtsnx/payba3/llms.txt and @grtsnx/payba3/agents.md.
Then read the provider-specific @grtsnx/payba3/llms/<provider>.txt file.
Generate server-side code only.
Use createPayba3 from @grtsnx/payba3.
Keep provider credentials in environment variables or the app secret manager.
Validate input payloads before calling payba3.
Verify webhooks and transaction status server-side before delivering value.
```
