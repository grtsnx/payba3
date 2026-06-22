# payba3 IDE Prompt

Use this prompt in an IDE coding agent, app generator, or AI pair-programming tool.

```text
You are integrating @grtsnx/payba3.

Read these package docs before writing code:
- @grtsnx/payba3/llms.txt
- @grtsnx/payba3/agents.md
- @grtsnx/payba3/llms-full.txt if you need more context
- @grtsnx/payba3/llms/<provider>.txt for every requested provider

Rules:
- Generate server-side TypeScript or JavaScript only.
- Import createPayba3 from @grtsnx/payba3.
- Configure only the provider being used.
- Keep all provider secrets in environment variables or the host app's secret manager.
- Never expose provider keys, access tokens, refresh tokens, JWT client assertions, BVN, NIN, OTP, or webhook secrets to client code.
- Use sandbox by default unless the developer explicitly asks for live.
- Validate tool/API input before calling payba3.
- Verify webhooks and transaction status server-side before marking anything paid or fulfilled.
- Ask for human confirmation before live transfers, refunds, debits, or other money-moving actions unless the host app already has an approval workflow.
```

Minimal code shape:

```ts
import { createPayba3 } from '@grtsnx/payba3';

const payba3 = createPayba3({
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
  },
});

export async function createCheckout(input: {
  email: string;
  amountInKobo: number;
  reference: string;
}) {
  return payba3.use('paystack').initializeOneTimeCheckout({
    email: input.email,
    amountInKobo: input.amountInKobo,
    currency: 'NGN',
    reference: input.reference,
  });
}
```
