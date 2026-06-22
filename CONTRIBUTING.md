# Contributing To payba3

Thanks for helping improve payba3. This project is for developers who want one clean payment integration surface across many providers.

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

## Project Layout

payba3 keeps source code, tests, documentation, and provider reference material separated so contributors can find the right place quickly.

```text
payba3/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # CI map: audit, test, build, smoke, summary
│   │   └── release.yml            # Release package workflow
│   ├── ISSUE_TEMPLATE/            # Bug and feature request templates
│   ├── PULL_REQUEST_TEMPLATE.md   # Pull request checklist
│   └── repository-metadata.yml    # Maintainer reference for GitHub about/topics
├── assets/
│   ├── payba3-logo.svg            # Full README/project logo
│   └── payba3-mark.svg            # Compact icon/mark
├── scripts/
│   └── package-release.sh         # Release archive builder
├── src/
│   ├── app/                       # Minimal app shell and health endpoint
│   ├── lib/                       # payba3 provider integrations
│   │   ├── payba3.service.ts      # One entry point for selecting a provider
│   │   ├── payba3.types.ts        # Shared payba3 channel types
│   │   ├── lib.module.ts          # Provider registration module
│   │   ├── paystack/              # Paystack channel
│   │   ├── safehaven/             # Safehaven channel
│   │   ├── seerbit/               # SeerBit channel
│   │   ├── opay/                  # OPay channel
│   │   ├── mono/                  # Mono channel
│   │   ├── monnify/               # Monnify channel
│   │   └── qoreid/                # QoreID channel
│   ├── middleware/                # Shared response, filters, and env validation
│   ├── index.ts                   # Public package exports
│   └── main.ts                    # Local app bootstrap
├── test/
│   ├── unit/                      # Unit tests mirrored by feature/provider
│   ├── app.e2e-spec.ts            # E2E smoke route test
│   └── jest-e2e.json              # E2E Jest config
├── README.md                      # User-facing usage guide
├── llms.txt                       # Agent/LLM index for provider references
├── SECURITY.md                    # Vulnerability reporting policy
├── SUPPORT.md                     # Support guidance
├── CODE_OF_CONDUCT.md             # Community behavior expectations
├── CHANGELOG.md                   # Human-readable change log
├── CONTRIBUTING.md                # This contributor guide
├── LICENSE                        # MIT license
├── package.json                   # Package metadata and scripts
└── bun.lock                       # Dependency lockfile
```

## Provider Folder Shape

Each provider should follow the same layout where possible.

```text
src/lib/<provider>/
├── config/
│   ├── <provider>.helper.ts       # Auth, signing, token refresh, fetch, parsing
│   └── <provider>.types.ts        # Provider payloads, responses, request context
├── <provider>.module.ts           # Provider registration
├── <provider>.service.ts          # Developer-facing provider actions
└── <provider>_llm.txt             # Provider docs for agents/LLMs
```

Tests for that provider belong in `test/unit`, not beside source files:

```text
test/unit/lib/<provider>/
└── config/<provider>.helper.spec.ts
```

## Provider Contribution Checklist

When adding or expanding a provider:

- Add provider config keys to the environment validation schema.
- Keep credentials and secrets out of source code.
- Put provider request signing, token refresh, parsing, and low-level HTTP behavior in helpers.
- Put provider payload and response contracts in types.
- Keep service methods focused on developer-facing actions.
- Add unit tests under `test/unit` for auth, signing, token refresh, and request payload shape.
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
