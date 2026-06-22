# Changelog

All notable project changes should be documented here.

This project follows a human-readable changelog style. Add new entries under `Unreleased` until a version is cut.

## Unreleased

- No unreleased changes.

## 2.0.1

- Added package-exported agent integration docs for IDEs, LLMs, and tool servers.
- Added `llms-full.txt` for complete LLM context.
- Added `agents.json`, `agents.md`, `agents/ide-prompt.md`, and `agents/mcp-tools.json`.
- Updated package smoke tests to prove agent docs resolve from npm and Bun installs.

## 2.0.0

- Made the root package framework-neutral with `createPayba3()` and plain provider clients.
- Removed Nest runtime peer dependencies from the package contract.
- Added typed constructor options for every provider so config can come from code, environment variables, or both.
- Replaced provider-facing Nest exceptions with `Payba3Error`.
- Preserved automatic access-token reuse and refresh for Safehaven, QoreID, and Monnify.
- Added package-boundary tests to prevent Nest imports from leaking into the public core.
- Updated package smoke tests to validate npm and Bun installs without Nest peer packages.

## 1.0.1

- Documented IDE and AI-agent integration flows.
- Exported provider LLM reference files through package subpaths.
- Clarified Nest peer dependency expectations for host applications.

## 1.0.0

- Added payba3 provider facade.
- Added OPay, Mono, and Monnify channel scaffolding.
- Added provider LLM reference files.
- Added contribution, security, support, and conduct documentation.
- Added payba3 logo assets.
