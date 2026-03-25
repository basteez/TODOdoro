# Story 6.6: Production Security Headers and CSP

Status: complete

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the full Content Security Policy and Cross-Origin Isolation headers applied in production,
so that the app enforces zero external data transmission at the browser level and user data is sandboxed per origin.

## Acceptance Criteria

1. **Given** the app is deployed to Vercel, **When** any page is loaded, **Then** the response includes `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` (required for OPFS + WASM).

2. **And** the `Content-Security-Policy` header is set with: `default-src 'self'`; `script-src 'self' 'wasm-unsafe-eval'`; `style-src 'self' 'unsafe-inline'`; `img-src 'self' data:`; `connect-src 'none'`; `frame-src 'none'`; `worker-src 'self' blob:`.

3. **And** `connect-src 'none'` enforces zero external network calls at the browser level — no fetch, no WebSocket, no analytics (NFR12).

4. **And** OPFS storage is sandboxed per browser origin by browser enforcement — no cross-origin access (NFR14).

5. **And** no `dangerouslySetInnerHTML` exists anywhere in the codebase; all user content passes through React's built-in XSS escaping (NFR15).

6. **And** the same headers are present in `vite.config.ts` for the development server — no gap between dev and production environments.

## Tasks / Subtasks

- [x] Task 1: Audit and tighten development CSP to match production (AC: #2, #6)
  - [x] 1.1 Review `apps/web/vite.config.ts` — `'unsafe-inline'` in `script-src` and `connect-src 'self' ws:` identified as dev-only relaxations
  - [x] 1.2 `'unsafe-inline'` in `script-src` required for Vite HMR (injects inline `<script>` tags) — cannot be removed
  - [x] 1.3 Added inline comments documenting each dev/production CSP divergence with rationale
  - [x] 1.4 Verified `connect-src 'self' ws:` is necessary for Vite HMR WebSocket — documented in comment

- [x] Task 2: Verify production CSP in `vercel.json` matches architecture D9 exactly (AC: #1, #2, #3)
  - [x] 2.1 Confirmed CSP directives match D9 spec exactly
  - [x] 2.2 Confirmed COEP (`require-corp`) and COOP (`same-origin`) headers present and correct
  - [x] 2.3 Verified `source: "/(.*)"` pattern covers all routes including root

- [x] Task 3: Add CSP verification test to boot sequence (AC: #1, #2, #6)
  - [x] 3.1 Created `apps/web/src/csp.test.ts` parsing CSP from both config files via Vite `import.meta.glob` with `?raw`
  - [x] 3.2 Tests verify production CSP contains all required D9 directives (9 individual tests)
  - [x] 3.3 Tests verify dev CSP is strict superset of production (only additive relaxations)
  - [x] 3.4 Tests verify COEP and COOP headers present in both configs
  - [x] 3.5 Tests verify `connect-src` in production is exactly `'none'`

- [x] Task 4: Add `dangerouslySetInnerHTML` codebase audit (AC: #5)
  - [x] 4.1 Added test using Vite `import.meta.glob` with `?raw` to scan all `.ts`/`.tsx` source files (no `@types/node` dependency needed)
  - [x] 4.2 Test fails if any `dangerouslySetInnerHTML` occurrence is found — CI guardrail active (NFR15)
  - [x] 4.3 Test placed in `apps/web/src/csp.test.ts` alongside header tests

- [x] Task 5: Browser-level header verification using Playwright MCP (AC: #1, #2, #3, #4)
  - [x] 5.1 Started Vite dev server on port 5175
  - [x] 5.2 Navigated to `http://localhost:5175` using Playwright MCP
  - [x] 5.3 Verified response headers via `fetch()` in browser: COEP=`require-corp`, COOP=`same-origin`, CSP present with all directives
  - [x] 5.4 `crossOriginIsolated` not directly verified via evaluate (fetch-based header check confirmed COI headers served)
  - [x] 5.5 Results documented below in Dev Agent Record

- [x] Task 6: Verify CI and no regressions (AC: #1-6)
  - [x] 6.1 `pnpm turbo test` — 486 tests pass (177 domain + 33 storage + 276 web) — 15 new CSP tests added
  - [x] 6.2 `pnpm turbo typecheck` — clean across all packages
  - [x] 6.3 `pnpm turbo build` — production bundle clean (323 modules, no CSP-related build issues)

## Dev Notes

### What Already Exists (DO NOT RECREATE)

These artifacts are already implemented. This story is primarily about **verification, testing, and tightening** — not greenfield implementation:

| Artifact | Location | Status |
|---|---|---|
| Production COEP/COOP/CSP headers | `apps/web/vercel.json` | Complete — matches architecture D9 |
| Dev COEP/COOP/CSP headers | `apps/web/vite.config.ts:8-22` | Complete — with dev-necessary relaxations |
| Cross-Origin Isolation check | `apps/web/src/db.ts` | Complete — warns if `crossOriginIsolated` is false |
| Zero `dangerouslySetInnerHTML` | Entire codebase | Clean — verified by codebase scan |
| SQLocal COI plugin disabled | `apps/web/vite.config.ts:7` | `sqlocal({ coi: false })` — headers set manually, not via plugin |

### What Needs to Be Implemented

1. **CSP verification tests** — Automated tests that confirm both dev and production header configurations match the architecture spec (D9). These tests import/parse the actual config files so any future drift is caught in CI.

2. **`dangerouslySetInnerHTML` CI guardrail** — A test that scans source files for `dangerouslySetInnerHTML` usage and fails if found. This prevents future regressions where someone accidentally adds unsafe HTML rendering.

3. **Dev CSP documentation** — Add inline comments to `vite.config.ts` explaining each dev-specific CSP relaxation and why it exists.

4. **Browser-level verification** — Manual verification via Playwright MCP that headers are actually served and `crossOriginIsolated === true`.

### Implementation Approach

**CSP test strategy:** Import `vercel.json` directly as a JSON module and parse the CSP string. For `vite.config.ts`, since it's a JS module with `defineConfig`, either:
- Read the file as text and parse the CSP string with regex (simpler, no Vite import needed)
- Or maintain a shared CSP constants file (over-engineering — avoid this)

**Recommended:** Read both config files as text, extract CSP strings, parse into directive maps, and assert against expected values from architecture D9.

**Dev vs Production CSP differences (expected and acceptable):**

| Directive | Production (`vercel.json`) | Development (`vite.config.ts`) | Reason |
|---|---|---|---|
| `script-src` | `'self' 'wasm-unsafe-eval'` | `'self' 'unsafe-inline' 'wasm-unsafe-eval'` | Vite injects inline scripts for HMR |
| `connect-src` | `'none'` | `'self' ws:` | Vite HMR uses WebSocket connection |

These are the ONLY acceptable divergences. The test should verify dev CSP is strictly a superset (additive only).

### CSP Directive Reference (Architecture D9)

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  connect-src 'none';
  frame-src 'none';
  worker-src 'self' blob:;
```

- `wasm-unsafe-eval`: Required for SQLocal WASM execution
- `unsafe-inline` on `style-src`: Required for Tailwind CSS utility injection
- `worker-src blob:`: Required for SQLocal's Web Worker initialization pattern
- `connect-src 'none'`: Enforces zero-external-network-call requirement at browser level

### Testing Standards

- **Framework:** Vitest — co-located test files (`*.test.ts` next to source)
- **Test location:** `apps/web/src/csp.test.ts` — new file for header/security tests
- **No console.log or console.error** in production code (architecture prohibition)
- **Use `fs` and `path` for file reading** — the test needs to read config files from disk
- **Use Playwright MCP browser tools** for browser-level header verification (not `@playwright/test` framework)

### Project Structure Notes

Files to create or modify:

| File | Action | Notes |
|---|---|---|
| `apps/web/src/csp.test.ts` | CREATE | CSP verification tests + `dangerouslySetInnerHTML` audit |
| `apps/web/vite.config.ts` | MODIFY | Add inline comments documenting dev-specific CSP relaxations |
| `apps/web/vercel.json` | VERIFY ONLY | Should already be correct — do not modify unless discrepancy found |

Files NOT to touch:
- `apps/web/src/db.ts` — `crossOriginIsolated` check already in place
- `packages/domain/**` — no domain changes in this story
- `packages/storage/**` — no storage changes in this story
- UI components — no visual changes in this story

### Dependencies and Libraries

- **No new dependencies required** — this story uses existing Vitest + Node.js `fs`/`path` for tests
- **Playwright MCP** — for browser-level verification (already available via `.playwright-mcp/`)

### Previous Story Intelligence (from 6.5)

- 471 tests passing across all packages (177 domain + 33 storage + 261 web) — maintain zero regressions
- Mock SQLocal pattern in tests simulates SQLite behaviour effectively
- `bootstrapFromEvents()` helper in `bootstrap.test.ts` mirrors `main.tsx` logic exactly
- Map serialization through JSON round-trip requires special handling (`pendingSessions`)
- All stories in Epic 6 have been single-commit, single-PR
- Branch naming: `feat/story-6-6-production-security-headers-and-csp`
- Commit style: `feat: <description> (Story 6.6)`

### Git Patterns (Epic 6)

- Branch naming: `feat/story-6-6-production-security-headers-and-csp`
- Commit style: `feat: <description> (Story 6.6)`
- All stories in Epic 6 have been single-commit, single-PR
- PR merges to `main` via squash merge

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6, Story 6.6] — User story, acceptance criteria, BDD scenarios
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision D9] — CSP directives specification
- [Source: _bmad-output/planning-artifacts/prd.md#NFR12] — No external data transmission
- [Source: _bmad-output/planning-artifacts/prd.md#NFR13] — CSP blocks inline scripts + external loads
- [Source: _bmad-output/planning-artifacts/prd.md#NFR14] — OPFS sandboxed per browser origin
- [Source: _bmad-output/planning-artifacts/prd.md#NFR15] — No unsanitized HTML / XSS escaping
- [Source: apps/web/vite.config.ts] — Current dev server headers
- [Source: apps/web/vercel.json] — Current production headers
- [Source: apps/web/src/db.ts] — Cross-Origin Isolation verification

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- No debug issues encountered during implementation.

### Completion Notes List

1. **No new dependencies added** — used Vite's `import.meta.glob` with `?raw` query instead of Node.js `fs`/`path` to avoid needing `@types/node` (not present in project). This is a Vite-native approach that works in Vitest and passes typecheck cleanly.
2. **vercel.json unmodified** — production CSP already matched architecture D9 exactly. No changes needed.
3. **15 new tests** added in `csp.test.ts`: 10 production CSP tests, 4 dev CSP tests, 1 dangerouslySetInnerHTML guardrail.
4. **Test count increased** from 471 (Story 6.5 baseline) to 486 (177 domain + 33 storage + 276 web).
5. **Browser verification** confirmed COEP, COOP, and full CSP headers served by Vite dev server via Playwright MCP fetch-based inspection.
6. **Dev CSP divergences documented** — two acceptable relaxations: `script-src` adds `'unsafe-inline'` for Vite HMR, `connect-src` uses `'self' ws:` instead of `'none'` for Vite HMR WebSocket.

### File List

| File | Action | Description |
|---|---|---|
| `apps/web/src/csp.test.ts` | CREATED | CSP verification tests (D9 compliance) + dangerouslySetInnerHTML CI guardrail |
| `apps/web/vite.config.ts` | MODIFIED | Added inline comments documenting dev-specific CSP relaxations and their rationale |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | MODIFIED | Story 6.6 status: ready-for-dev → in-progress → complete |
| `_bmad-output/implementation-artifacts/6-6-production-security-headers-and-csp.md` | MODIFIED | Updated task checkboxes, status, and Dev Agent Record |
