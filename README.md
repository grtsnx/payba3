# JaxAgent SDK Backend

A rock-solid, production-ready NestJS boilerplate specifically configured for a high-performance AI website builder backend.

## Core Features
- **Fast Package Manager**: Powered exclusively by `bun`.
- **Advanced Logging**: Structured, high-performance logging with `nestjs-pino` and `pino-pretty` (context and PIDs ignored locally for ultimate readability).
- **API Documentation**: Pre-configured with Swagger and Scalar API reference UI at `/reference`.
- **Security First**: 
  - `helmet` for HTTP security headers.
  - `@nestjs/throttler` for rate limiting (default 60 req/min).
  - Global `ValidationPipe` strictly validating and dropping non-whitelisted payload fields via `class-validator`.
- **Robust Configuration**: Environment variables strictly validated on startup using `@nestjs/config` and `Joi`.
- **Performance**: Response compression enabled (`gzip`/`deflate`).
- **Graceful Error Handling**: Global `AllExceptionsFilter` standardizes error responses and gracefully catches internal server errors.
- **Health Checks**: Built-in health check endpoint using `@nestjs/terminus` (mapped to `/v1/health`).
- **CI Pipeline**: Pre-configured GitHub Actions (`ci.yml`) for automated linting, testing, building, and smoke testing.

## Project Setup

```bash
# Install dependencies using bun ONLY
$ bun install
```

## Running the Application

```bash
# development
$ bun run start

# watch mode
$ bun run start:dev

# production mode
$ bun run start:prod
```

## Environment Variables

Copy the `.env.sample` to `.env` and adjust the values. The server strictly validates environment schemas via `src/config/env.validation.ts` and will securely fail to start if variables are missing or incorrectly typed.

## Testing

```bash
# unit tests
$ bun run test

# e2e tests
$ bun run test:e2e

# test coverage
$ bun run test:cov
```

## Release Packaging

Release packages are automated with GitHub Actions in `release.yml`.

- Run **Release Package** manually and choose `development`, `staging`, or `production`.
- Push a `v*` tag to create a production package from that tag.
- Local packaging is available after a build:

```bash
$ bun run build
$ bun run package:release staging 0.0.1
```

The release environment controls the package label and GitHub release type:

- `development`: prerelease, `dev` dist tag metadata, `v<version>-dev.<sha>`
- `staging`: prerelease, `next` dist tag metadata, `v<version>-staging.<run>`
- `production`: full release, `latest` dist tag metadata, `v<version>`
