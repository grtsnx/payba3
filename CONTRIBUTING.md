# Contributing To Payba3

Thanks for helping improve Payba3. This project is for developers who want one clean payment integration surface across many providers.

## Ways To Contribute

- Add a new provider.
- Expand method coverage for an existing provider.
- Improve provider types.
- Add tests for helpers, token refresh, signing, and provider payloads.
- Improve examples and documentation.
- Report bugs with clear reproduction steps.
- Review pull requests.

## Before You Start

Open an issue first for large changes, new provider additions, public APIs, or breaking behavior. Small fixes, docs improvements, and tests can go straight to a pull request.

## Development Setup

```bash
bun install --frozen-lockfile
```

Run checks before opening a pull request:

```bash
bun run lint
bun run test
bun run test:e2e
bun run build
bun audit
```

## Provider Contribution Checklist

When adding or expanding a provider:

- Add provider config keys to the environment validation schema.
- Keep credentials and secrets out of source code.
- Put provider request signing, token refresh, parsing, and low-level HTTP behavior in helpers.
- Put provider payload and response contracts in types.
- Keep service methods focused on developer-facing actions.
- Add unit tests for auth, signing, token refresh, and request payload shape.
- Add or update provider LLM reference material when available.
- Update the README provider table.

## Coding Guidelines

- Prefer explicit provider names and clear method names.
- Avoid hidden global state.
- Validate credentials when a provider is used, not when an unused provider is merely registered.
- Keep secret-bearing data out of logs and error messages.
- Add tests for new behavior.

## Pull Request Checklist

- The PR explains the user/developer problem it solves.
- The PR includes tests or explains why tests are not applicable.
- The README or docs are updated when public usage changes.
- All local checks pass.
- No secrets, API keys, tokens, private assertions, or real customer data are committed.

## Commit Style

Use clear, plain commit messages:

```text
add monnify reserved account helper
fix safehaven token refresh window
docs: add opay signup link
```

