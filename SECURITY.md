# Security Policy

payba3 deals with payment and identity provider integrations, so security reports are taken seriously.

## Reporting A Vulnerability

Do not open a public GitHub issue for vulnerabilities.

Report privately through the repository owner's preferred security contact or GitHub private vulnerability reporting when enabled.

Include:

- A clear description of the issue.
- Affected provider or module.
- Steps to reproduce.
- Impact and possible abuse path.
- Suggested fix, if known.

## What To Avoid Sharing Publicly

Do not post:

- API keys.
- OAuth client assertions.
- Access tokens.
- Refresh tokens.
- Webhook secrets.
- Real customer identity data.
- Real bank account, BVN, NIN, card, or transaction data.

## Supported Versions

Until the project reaches a stable `1.0.0`, security fixes are applied to the latest mainline version.

## Security Expectations For Contributions

- Keep all provider secrets in environment variables or secret managers.
- Never log raw authorization headers, cookies, access tokens, refresh tokens, or client assertions.
- Verify webhook signatures before trusting provider callbacks.
- Refresh expiring access tokens before they become stale.
- Use sandbox credentials for examples and tests.
- Do not add real customer data to tests, docs, fixtures, or LLM files.

## Dependency Security

Run:

```bash
bun audit
```

Security-related dependency overrides should include a short explanation in the pull request.

