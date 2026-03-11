---
title: 'Dockerfile & Container Setup'
slug: 'dockerfile-container-setup'
created: '2026-03-11'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['node:22-alpine', 'nginx:alpine', 'pnpm@8.15.6', 'vite@7', 'turborepo', 'docker', 'podman']
files_to_modify: ['Dockerfile', '.dockerignore', 'nginx.conf', 'compose.yaml']
code_patterns: ['multi-stage-build', 'cross-origin-isolation-headers', 'pnpm-monorepo-turbo', 'corepack-enable']
test_patterns: ['manual-verification-curl']
---

# Tech-Spec: Dockerfile & Container Setup

**Created:** 2026-03-11

## Overview

### Problem Statement

Epic 2 requires a containerized development and preview environment before dev begins. No Dockerfile, `.dockerignore`, or `compose.yaml` exists yet. The container must serve the Vite SPA with correct Cross-Origin Isolation headers (COEP/COOP/CSP) for SQLocal WASM support.

### Solution

Multi-stage Dockerfile (Node 22 Alpine build stage + nginx Alpine serve stage) with proper security headers, a `.dockerignore` for build efficiency, and a `compose.yaml` for easy local usage with both Docker and Podman.

### Scope

**In Scope:**
- Dockerfile (multi-stage: build + serve)
- `.dockerignore` (exclude `node_modules/`, `.git/`, `_bmad*/`, `_bmad-output/`, `*.md`, `.github/`)
- `nginx.conf` with COEP/COOP/CSP headers (mirroring architecture D9) and SPA routing (`try_files`)
- `compose.yaml` (standard Compose spec, compatible with Docker and Podman)
- Verification instructions for both Docker and Podman

**Out of Scope:**
- Vercel deployment configuration
- CI integration for container builds
- Production orchestration (Kubernetes, Swarm, etc.)
- PWA service worker configuration
- docker-compose features beyond standard Compose spec

## Context for Development

### Codebase Patterns

- pnpm monorepo with Turborepo (`pnpm@8.15.6`, `turbo@^2.8.15`)
- Workspace layout: `apps/*` + `packages/*` (see `pnpm-workspace.yaml`)
- Vite 7 SPA build in `apps/web` — `tsc -b && vite build` produces static assets in `apps/web/dist/`
- Build output contains: `index.html`, `assets/`, `manifest.json`, `vite.svg`, `typescript.svg`
- TypeScript project references: `apps/web/tsconfig.json` references `domain`, `storage`, `ui`
- Turbo build task: `dependsOn: ["^build"]`, outputs `dist/**` — handles dependency graph automatically
- Cross-Origin Isolation headers required for SQLocal WASM (architecture decision D9)
- `vite.config.ts` has COEP/COOP headers for dev but **no CSP** — CSP only in `vercel.json`
- `vercel.json` is the authoritative production header source (COEP + COOP + full CSP)
- Node 22 used in CI pipeline
- Lockfile version: 6.0 (pnpm v8 format)
- Clean slate: no container-related files exist in the repo

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `apps/web/package.json` | Build command: `tsc -b && vite build` |
| `apps/web/vite.config.ts` | Dev server COEP/COOP headers (no CSP) |
| `apps/web/vercel.json` | Authoritative production headers: COEP + COOP + full CSP |
| `apps/web/index.html` | SPA entry point — `<div id="app">`, manifest link |
| `apps/web/tsconfig.json` | Project references to domain, storage, ui |
| `package.json` | Root — `packageManager: "pnpm@8.15.6"`, workspace scripts |
| `pnpm-workspace.yaml` | Workspace config: `apps/*` + `packages/*` |
| `turbo.json` | Build pipeline: `^build` deps, `dist/**` outputs |
| `.github/workflows/ci.yml` | CI pipeline — Node 22, pnpm install pattern |
| `_bmad-output/planning-artifacts/architecture.md` (lines 229–251) | D9 — CSP/COEP/COOP header requirements |

### Technical Decisions

- **Serving layer: nginx Alpine** — smallest footprint, full header control for COEP/COOP/CSP, native SPA routing via `try_files`
- **Build stage: Node 22 Alpine** — matches CI environment
- **pnpm install via corepack** — requires explicit `corepack enable` in Alpine before `pnpm install`; uses `packageManager` field from root `package.json`
- **Standard Compose spec** — ensures compatibility with both `docker compose` and `podman compose`
- **nginx header config must mirror `apps/web/vercel.json` exactly** — COEP, COOP, and full CSP string; `vercel.json` is the authoritative source for production headers
- **Non-root execution** — nginx binds to port 8080 internally (above 1024), compatible with rootless Podman
- **Turbo dependency graph** — build stage runs `pnpm turbo build --filter=@tododoro/web`; Turbo resolves domain/storage/ui deps automatically

## Implementation Plan

### Tasks

- [x] Task 1: Create `.dockerignore`
  - File: `.dockerignore` (new, project root)
  - Action: Create file with exclusions for build context efficiency
  - Content:
    ```
    node_modules/
    .git/
    .github/
    _bmad/
    _bmad-output/
    *.md
    .turbo/
    apps/web/dist/
    packages/*/dist/
    .vscode/
    .claude/
    ```
  - Notes: Excludes build artifacts, docs, CI config, and BMAD tooling from the Docker build context. `*.md` excludes all markdown (README, docs) — none are needed at build time.

- [x] Task 2: Create `nginx.conf`
  - File: `nginx.conf` (new, project root)
  - Action: Create nginx configuration for SPA serving with security headers
  - Content must include:
    - `listen 8080` (non-root compatible, rootless Podman safe)
    - `server_name localhost`
    - `root /usr/share/nginx/html`
    - `index index.html`
    - SPA routing: `location / { try_files $uri $uri/ /index.html; }`
    - Security headers (must match `apps/web/vercel.json` exactly):
      - `add_header Cross-Origin-Embedder-Policy "require-corp" always;`
      - `add_header Cross-Origin-Opener-Policy "same-origin" always;`
      - `add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-src 'none'; worker-src 'self' blob:;" always;`
    - Gzip on for `text/html text/css application/javascript application/json image/svg+xml`
    - Cache-control: `assets/` directory gets `max-age=31536000, immutable` (Vite hashed filenames); `index.html` gets `no-cache` (always revalidate)
  - Notes: The `always` directive on `add_header` ensures headers are sent on all response codes (including 404 → index.html redirects). Gzip and cache headers are standard production optimizations for static SPAs.

- [x] Task 3: Create `Dockerfile`
  - File: `Dockerfile` (new, project root)
  - Action: Create multi-stage Dockerfile
  - **Stage 1 — build** (named `build`):
    - `FROM node:22-alpine AS build`
    - `RUN corepack enable`
    - `WORKDIR /app`
    - Copy dependency manifests first for layer caching: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `apps/web/package.json`, `packages/*/package.json`
    - `RUN pnpm install --frozen-lockfile`
    - Copy remaining source: `COPY . .`
    - `RUN pnpm turbo build --filter=@tododoro/web`
  - **Stage 2 — serve** (named `serve`):
    - `FROM nginx:alpine AS serve`
    - `COPY nginx.conf /etc/nginx/conf.d/default.conf`
    - `COPY --from=build /app/apps/web/dist /usr/share/nginx/html`
    - `EXPOSE 8080`
    - `CMD ["nginx", "-g", "daemon off;"]`
  - Notes: Dependency manifests are copied before source to maximize Docker layer caching — `pnpm install` only re-runs when dependencies change. The default nginx config (`/etc/nginx/nginx.conf`) runs nginx as the `nginx` user; we only replace the server block in `conf.d/default.conf`. Must ensure the default nginx listener on port 80 is removed or overridden — the custom `nginx.conf` in `conf.d/` replaces `default.conf`.

- [x] Task 4: Create `compose.yaml`
  - File: `compose.yaml` (new, project root)
  - Action: Create standard Compose spec file
  - Content:
    ```yaml
    services:
      web:
        build: .
        ports:
          - "8080:8080"
    ```
  - Notes: Minimal compose file. Uses standard Compose spec (no `version` field — deprecated). Compatible with both `docker compose` and `podman compose`. Port 8080 avoids conflict with Vite dev server on 5173.

### Acceptance Criteria

- [ ] AC 1: Given the project source code, when `docker build -t tododoro .` is run from the project root, then the build completes with exit code 0 and produces a tagged image.
- [ ] AC 2: Given a built `tododoro` image, when `docker run -d -p 8080:8080 tododoro` is run, then `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080` returns `200`.
- [ ] AC 3: Given a running container, when `curl -I http://localhost:8080/nonexistent-route` is executed, then the response status is `200` and the body is the SPA `index.html` (proving `try_files` SPA routing works).
- [ ] AC 4: Given a running container, when `curl -I http://localhost:8080` is executed, then the response includes all three security headers:
  - `Cross-Origin-Embedder-Policy: require-corp`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-src 'none'; worker-src 'self' blob:;`
- [ ] AC 5: Given Podman installed, when `podman build -t tododoro .` and `podman run -d -p 8080:8080 tododoro` are run, then AC 1–4 pass identically.
- [ ] AC 6: Given the project source code, when `docker compose up -d` is run from the project root, then the container starts and `http://localhost:8080` returns 200 with correct headers (AC 4).
- [ ] AC 7: Given Podman with compose plugin installed, when `podman compose up -d` is run from the project root, then the container starts and `http://localhost:8080` returns 200 with correct headers (AC 4).
- [ ] AC 8: Given a running container, when `curl -I http://localhost:8080/assets/index-abc123.js` is executed (any hashed asset), then the response includes `Cache-Control` with `max-age=31536000` and `immutable`.
- [ ] AC 9: Given a running container, when `curl -I http://localhost:8080/` is executed, then the `Cache-Control` header for `index.html` includes `no-cache`.

## Additional Context

### Dependencies

- Docker or Podman installed on the developer machine
- No new runtime or build dependencies — uses only what's already in the monorepo
- No changes to existing source files required

### Testing Strategy

Manual verification — 9 acceptance criteria validated via `curl` commands against a running container:

1. Build the image: `docker build -t tododoro .`
2. Run the container: `docker run -d -p 8080:8080 --name tododoro-test tododoro`
3. Verify status: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080` → `200`
4. Verify SPA routing: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/any-route` → `200`
5. Verify headers: `curl -I http://localhost:8080` → check COEP, COOP, CSP
6. Verify asset caching: `curl -I http://localhost:8080/assets/<any-hashed-file>` → `max-age=31536000, immutable`
7. Verify HTML no-cache: `curl -I http://localhost:8080/` → `no-cache`
8. Cleanup: `docker stop tododoro-test && docker rm tododoro-test`
9. Repeat steps 1–8 with `podman` commands
10. Test compose: `docker compose up -d` → verify → `docker compose down`
11. Test compose: `podman compose up -d` → verify → `podman compose down`

### Notes

- **High-risk item**: nginx header configuration — if COEP/COOP/CSP headers are missing or malformed, SQLocal WASM will silently fail at runtime. AC 4 is the critical gate.
- The architecture doc specifies headers in `vercel.json` for production — the nginx config effectively replaces that for container deployments.
- `compose.yaml` exposes port 8080 to avoid conflicts with Vite dev server on 5173.
- nginx runs as non-root, binding to 8080 internally — required for rootless Podman compatibility.
- The default `nginx:alpine` image includes a default server block listening on port 80 in `/etc/nginx/conf.d/default.conf`. Our custom `nginx.conf` replaces this file, so port 80 is never exposed.
- Future consideration: if CI container build is added later, the `.dockerignore` and Dockerfile are ready — no changes needed.

## Review Notes
- Adversarial review completed
- Findings: 10 total, 8 fixed, 1 skipped (noise), 1 skipped (out of scope)
- Resolution approach: auto-fix
- Fixed: non-root USER directive, Cache-Control no-cache on all HTML responses, server_tokens off, X-Content-Type-Options nosniff, gzip_min_length 256, .env* in .dockerignore, removed redundant index.html location block (server-level headers now cover it)
- Skipped: F3 (COPY pattern fragility — noise), F10 (health check — out of scope per spec)
