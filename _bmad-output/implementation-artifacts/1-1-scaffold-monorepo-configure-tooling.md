# Story 1.1: Scaffold Monorepo & Configure Tooling

Status: done

## Story

As a developer,
I want the monorepo scaffolded with Turborepo and all packages configured with strict TypeScript, security headers, and baseline tooling,
So that all subsequent domain, storage, and UI work has a consistent, enforced foundation to build on.

## Acceptance Criteria

1. **Given** a fresh environment with pnpm installed  
   **When** the monorepo is initialized using `create-turbo@latest` with the `with-vite` example and packages renamed  
   **Then** `pnpm dev` starts all packages in watch mode without errors

2. **And** `pnpm turbo typecheck` passes with zero TypeScript errors across all packages

3. **And** all `tsconfig.json` files have `strict: true`, `noUncheckedIndexedAccess: true`, and `exactOptionalPropertyTypes: true` enabled

4. **And** `apps/web/vite.config.ts` and `apps/web/vercel.json` include `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` headers

5. **And** `apps/web/public/manifest.json` exists as a PWA placeholder with `name`, `short_name`, `theme_color`, `background_color`, and `icons` fields populated

6. **And** `PRODUCT_PHILOSOPHY.md` exists at repo root documenting the non-negotiable constraints (no due dates, no priorities, no sub-tasks, no accounts, no gamification)

7. **And** `pnpm-workspace.yaml` configures `apps/*` and `packages/*` workspaces

## Tasks / Subtasks

- [x] Task 1: Initialize monorepo from template (AC: #1, #7)
  - [x] 1.1 Run `pnpm dlx create-turbo@latest tododoro -e with-vite --package-manager pnpm` from **parent directory** (see Dev Notes — Critical Gotcha below)
  - [x] 1.2 Delete `apps/docs` — tododoro has exactly one app (`apps/web`)
  - [x] 1.3 Rename all `@repo/` namespace references to `@tododoro/` across all `package.json` files and import statements
  - [x] 1.4 Verify `pnpm-workspace.yaml` contains `packages: ['apps/*', 'packages/*']`

- [x] Task 2: Add required new packages (AC: #1)
  - [x] 2.1 Create `packages/domain/` with:
    - `package.json` → name `@tododoro/domain`, **zero production dependencies**, `devDependencies` only (vitest, typescript, @tododoro/typescript-config)
    - `src/index.ts` → empty barrel export (`export {};`)
    - `tsconfig.json` → extends typescript-config base, no `references` (leaf node), `composite: true`
    - `vitest.config.ts` → with 100% coverage thresholds (lines/functions/branches/statements all = 100)
  - [x] 2.2 Create `packages/storage/` with:
    - `package.json` → name `@tododoro/storage`, depends on `@tododoro/domain: workspace:*`
    - `src/index.ts` → empty barrel export (`export {};`)
    - `tsconfig.json` → extends base, `references: [{ path: "../domain" }]`
    - `vitest.config.ts` → standard coverage config (not 100% gate; domain has the hard gate)
  - [x] 2.3 Clear default components from `packages/ui/src/` (the `counter`, `header`, `setup-counter` defaults) — leave an empty `src/index.ts`; UI components are built in Epic 2
  - [x] 2.4 Update `packages/ui/package.json` → rename to `@tododoro/ui`, add `@tododoro/domain: workspace:*` dependency, update `tsconfig.json` references

- [x] Task 3: Configure TypeScript strict mode across all packages (AC: #2, #3)
  - [x] 3.1 Add to **root** `tsconfig.json` `compilerOptions`: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`
  - [x] 3.2 Verify all per-package `tsconfig.json` files extend the root (or the `@tododoro/typescript-config` base which must itself include those flags)
  - [x] 3.3 Update `packages/typescript-config/base.json` to include the three strict flags — this is the single source of truth
  - [x] 3.4 Run `pnpm turbo typecheck` — must complete with zero errors before proceeding

- [x] Task 4: Add Cross-Origin Isolation headers (AC: #4)
  - [x] 4.1 Add headers to `apps/web/vite.config.ts` in `server.headers`:
    ```
    'Cross-Origin-Embedder-Policy': 'require-corp'
    'Cross-Origin-Opener-Policy': 'same-origin'
    ```
  - [x] 4.2 Create `apps/web/vercel.json` with COEP, COOP, and the full CSP (see Dev Notes — Security Headers section)
  - [x] 4.3 Verify headers are identical between dev server (`vite.config.ts`) and production (`vercel.json`) — no gap between environments

- [x] Task 5: Create PWA manifest placeholder (AC: #5)
  - [x] 5.1 Create `apps/web/public/manifest.json` (see Dev Notes — manifest.json content below)
  - [x] 5.2 Add `<link rel="manifest" href="/manifest.json">` to `apps/web/index.html`

- [x] Task 6: Create PRODUCT_PHILOSOPHY.md (AC: #6)
  - [x] 6.1 Create `PRODUCT_PHILOSOPHY.md` at repo root (see Dev Notes — content below)

- [x] Task 7: Wire Turborepo pipeline for future CI gate (AC: #1)
  - [x] 7.1 Update `turbo.json` to include `typecheck`, `test`, and `build` tasks; ensure `test` has `dependsOn: ['^build']`
  - [x] 7.2 Confirm `packages/domain/vitest.config.ts` has coverage thresholds set but the package has zero source to cover yet (empty index.ts is exempt — thresholds apply once source files are added)

- [x] Task 8: Validate everything passes (AC: #1, #2)
  - [x] 8.1 `pnpm install` — lockfile resolves cleanly
  - [x] 8.2 `pnpm turbo typecheck` — zero errors
  - [x] 8.3 `pnpm dev` — all packages start without errors
  - [x] 8.4 `pnpm turbo build` — clean production bundle from `apps/web`

## Dev Notes

### 🚨 Critical Gotcha: Running create-turbo in the Right Location

The `create-turbo` command creates a **new directory** named after the project. Since the workspace already lives at `…/workspace/me/tododoro`, you must be careful.

**Option A (recommended):** Run from the parent directory, then copy the contents:
```bash
# From /Users/tizianobasile/workspace/me/
pnpm dlx create-turbo@latest tododoro -e with-vite --package-manager pnpm
# This creates /workspace/me/tododoro/ with all scaffold files
# The existing _bmad-output/ folder at the same path is unrelated to the scaffold
# The scaffold generates INTO the existing folder (create-turbo will scaffold into existing dirs)
```

**Option B (alternative):** Run from within the existing workspace root using `.` as the project name:
```bash
# From /Users/tizianobasile/workspace/me/tododoro/
pnpm dlx create-turbo@latest . -e with-vite --package-manager pnpm
```

⚠️ The `_bmad-output/` planning folder already in this workspace will NOT be touched by create-turbo — it only writes standard monorepo files. Both options are safe.

---

### Template Structure: What the with-vite Template Creates

The `create-turbo@latest` v2.8.15 with-vite example scaffolds:

```
tododoro/
├── apps/
│   ├── docs/          ← DELETE (not needed for tododoro)
│   └── web/           ← keep, rename workspace dep references from @repo/* → @tododoro/*
├── packages/
│   ├── eslint-config/ ← keep, rename @repo/eslint-config → @tododoro/eslint-config
│   ├── typescript-config/ ← keep, rename @repo/typescript-config → @tododoro/typescript-config
│   └── ui/            ← keep, rename @repo/ui → @tododoro/ui, clear default components
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

**You must add these two packages manually** (not in the template):
- `packages/domain/` → `@tododoro/domain`
- `packages/storage/` → `@tododoro/storage`

---

### TypeScript Strict Flags

Add all three flags to `packages/typescript-config/base.json` (the shared base all packages extend):

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Default",
  "compilerOptions": {
    "composite": false,
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "inlineSources": false,
    "isolatedModules": true,
    "moduleResolution": "bundler",
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "preserveWatchOutput": true,
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2022"
  },
  "exclude": ["node_modules"]
}
```

All per-package `tsconfig.json` files extend this base — the strict flags propagate automatically.

---

### TypeScript Project References (Acyclic Dependency Graph)

The `apps/web/tsconfig.json` must reference all three packages:
```json
{
  "extends": "@tododoro/typescript-config/base.json",
  "compilerOptions": { "composite": true, "outDir": "./dist" },
  "references": [
    { "path": "../../packages/domain" },
    { "path": "../../packages/storage" },
    { "path": "../../packages/ui" }
  ]
}
```

`packages/ui/tsconfig.json` and `packages/storage/tsconfig.json` must reference domain:
```json
{
  "references": [{ "path": "../domain" }]
}
```

`packages/domain/tsconfig.json` has **no references** (leaf node — imports nothing).

⚠️ **Anti-pattern:** Never add `@tododoro/ui` or `apps/web` as a reference inside `packages/domain`. That would create a circular dependency — the CI build will fail at compile time.

---

### packages/domain Setup (Zero Production Dependencies)

```json
// packages/domain/package.json
{
  "name": "@tododoro/domain",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "@tododoro/typescript-config": "workspace:*",
    "@vitest/coverage-v8": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

**Zero production deps is a hard rule enforced by CI.** Never add anything to `dependencies` in this package — only `devDependencies`.

```typescript
// packages/domain/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
```

Note: Coverage thresholds will not fail on an empty `src/index.ts` — the thresholds only apply to included files with actual code. This config is set up now so future stories (1.2–1.6) automatically enforce the 100% gate without additional config changes.

---

### Security Headers

**`apps/web/vite.config.ts` — Development Server Headers:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
});
```

**`apps/web/vercel.json` — Production Headers:**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-src 'none'; worker-src 'self' blob:;"
        }
      ]
    }
  ]
}
```

**Why these headers are critical in Story 1.1 (not deferred to Story 6.6):**
- COEP (`require-corp`) + COOP (`same-origin`) are **required for OPFS and WASM to function** — SQLocal will silently fail without them
- They must be in place in the dev server before any future story attempts SQLocal initialization
- Missing COEP/COOP in dev but present in prod = a class of bugs that only surfaces in production
- Story 6.6 will *verify* and *tighten* the full CSP in production; this story establishes the mandatory baseline

Note on `unsafe-inline` for `style-src`: Required by Tailwind CSS v4 in development mode. In a production build, Tailwind v4 generates a static CSS file, so this directive may be removable from the prod CSP in Story 6.6 after verification.

---

### PWA Manifest Placeholder Content

```json
// apps/web/public/manifest.json
{
  "name": "tododoro",
  "short_name": "tododoro",
  "description": "A Pomodoro-first, intention-based todo canvas.",
  "theme_color": "#111827",
  "background_color": "#0d1117",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    {
      "src": "/favicon.ico",
      "sizes": "48x48",
      "type": "image/x-icon"
    }
  ]
}
```

This is a placeholder. The `vite-plugin-pwa` activation and proper icons are deferred to Phase 2 (post-v1). The browser sees the manifest from day one — this prevents future structural rework when PWA is activated.

Add to `apps/web/index.html` `<head>`:
```html
<link rel="manifest" href="/manifest.json" />
```

---

### PRODUCT_PHILOSOPHY.md Content

Create at the **repo root** (sibling to `package.json`):

```markdown
# tododoro — Product Philosophy

## Non-Negotiable Constraints

These constraints are the product. Violating them is not a feature request; it is a product defect.

### What This App Is

tododoro is a spatial, Pomodoro-first canvas for tracking personal intentions. Position declares priority. Sessions declare devotion. The Devotion Record is the truth.

### Hard Prohibitions

1. **No due dates.** Time pressure is not part of this product. No deadline fields, no overdue states, no urgency signals.

2. **No priorities.** Spatial position *is* priority. A card's location on the canvas communicates everything. Never add a priority enum, importance flag, or ordering field.

3. **No sub-tasks.** Intentions are not decomposable in this model. A todo is a single, whole intention. No children, no hierarchical breakdown.

4. **No accounts, login, or sync.** All data lives locally on the user's device. No backend, no user ID, no authentication surface. `connect-src 'none'` in the CSP is a product statement, not just a security control.

5. **No gamification.** No streaks, no achievement badges, no point systems, no leaderboards. The Devotion Record is reflective, not motivational.

6. **No global primary CTA.** There is no "Add Task" button. The canvas is the call to action. A persistent action button would violate the spatial model.

7. **No success toasts or loading indicators.** User-initiated actions produce visible feedback within 100ms or silent ceremony (CompletionMoment). Nothing in between.

8. **No external data transmission.** Ever. Not for analytics, not for error tracking, not for feature flags. The CSP's `connect-src 'none'` enforces this at the browser level.

### The Session-First Inversion

Sessions can start *without* a linked todo (Exploration sessions). You can focus before knowing what you are focusing on. This is intentional and sacred.

### The Devotion Record is Immutable Identity

The Devotion Record is keyed on `todoId`, not on the todo's title. Renaming a todo never erases its history. This is a domain invariant, not a UI concern.

### For AI Agents and Contributors

Before adding any field, component, or behaviour, ask: does this belong in a priority manager, a calendar app, or a gamified habit tracker? If yes, it does not belong here.
```

---

### Git Initialization

The workspace at `…/workspace/me/tododoro` is **not yet a git repository**. You must initialize git after scaffolding:

```bash
git init
git add .
git commit -m "chore: scaffold monorepo with create-turbo with-vite template"
```

Do this **before** running `pnpm install` the first time, so the initial lockfile is part of the first commit. The CI pipeline (Story 1.7) will require a git history to function.

---

### ESLint: Migrate from `.eslintrc.js` to Flat Config

The architecture specifies `eslint.config.ts` (ESLint v9 flat config), but the `with-vite` template scaffolds a legacy `.eslintrc.js`. Migrate to flat config in this story to match the architecture:

1. Delete `.eslintrc.js` at repo root and any per-package `.eslintrc.js` files
2. Create `eslint.config.ts` at repo root:

```typescript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  }
);
```

3. Update root `package.json` scripts to use the flat config format (ESLint v9 detects `eslint.config.ts` automatically)
4. Update devDependencies: ensure `eslint` is v9+, add `typescript-eslint` if not present

Note: `packages/eslint-config` from the template becomes `@tododoro/eslint-config`. You can either extend it from the root `eslint.config.ts`, or simplify to a single root config. The architecture shows a single root `eslint.config.ts` — the shared package approach may be overkill for a 4-package monorepo where all packages are TypeScript.

---

### turbo.json Pipeline Configuration

Update the scaffolded `turbo.json` to include all required tasks:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "env": ["CI"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

The CI pipeline (Story 1.7) will use:
1. `pnpm install --frozen-lockfile`
2. `turbo typecheck`
3. `turbo test --filter=@tododoro/domain` ← 100% coverage HARD BLOCK
4. `turbo test`
5. `turbo build`
6. Vercel deploy (main branch only)

---

### File Naming Conventions (from Architecture)

Follow these patterns for all new files created in this story:
- TypeScript source files: `PascalCase.ts` for classes/components/types, `camelCase.ts` for pure-function files
- Config files: `kebab-case.config.ts` (e.g., `vitest.config.ts`, `vite.config.ts`)
- Test files: `foo.test.ts` co-located with source — **never** `foo.spec.ts` or `__tests__/`
- Index files: `index.ts` at package root for public exports only

### References

- Starter command and naming: [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation]
- TypeScript strict flags requirement: [Source: _bmad-output/planning-artifacts/architecture.md#TypeScript Strict Flags]
- CSP + COEP/COOP directives: [Source: _bmad-output/planning-artifacts/architecture.md#Security D9]
- Package dependency graph (acyclic enforcement): [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- CI gate order: [Source: _bmad-output/planning-artifacts/architecture.md#D10 CI Gate Order]
- PWA placeholder strategy: [Source: _bmad-output/planning-artifacts/architecture.md#D11 PWA Placeholder]
- Project structure (complete directory tree): [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure]
- PRODUCT_PHILOSOPHY.md requirement: [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1 AC]
- NFR22: TypeScript strict mode from first commit: [Source: _bmad-output/planning-artifacts/epics.md#NonFunctional Requirements]
- NFR23: Acyclic package graph enforced at compile time: [Source: _bmad-output/planning-artifacts/epics.md#NonFunctional Requirements]
- create-turbo v2.8.15 confirmed current (March 2026): [Source: npmjs.com/package/create-turbo]
- with-vite template structure (apps/web, apps/docs, packages/ui, packages/eslint-config, packages/typescript-config): [Source: github.com/vercel/turbo/tree/main/examples/with-vite]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (Cursor)

### Debug Log References

- Scaffolded into temp dir `tododoro-scaffold` then rsync'd to workspace (create-turbo rejects existing dirs with conflicting files)
- Used `--no-frozen-lockfile` for first install after lockfile regeneration due to new packages and version updates
- Added `passWithNoTests: true` to domain/storage vitest configs — packages are empty stubs at this stage; thresholds will enforce 100% once real source is added in stories 1.2–1.6
- Pinned `@eslint/js` to `^9.0.0` (v10 requires eslint v10; we use v9)
- Migrated from `.eslintrc.js` + per-package `.eslintrc.cjs` to single root `eslint.config.ts` (flat config, ESLint v9)

### Completion Notes List

- All 8 tasks and 24 subtasks completed and verified
- `pnpm turbo typecheck` — 4 packages, 0 errors
- `pnpm turbo build` — clean production bundle (apps/web dist)
- `pnpm turbo test` — 2 packages pass with no-test exit 0
- `pnpm dev` — Vite dev server starts at localhost:5173 without errors
- Monorepo structure: apps/web + packages/{domain,storage,ui,typescript-config,eslint-config}
- TypeScript strict flags (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes) in base.json as single source of truth
- COEP/COOP headers in both vite.config.ts and vercel.json — no dev/prod gap
- PWA manifest placeholder at apps/web/public/manifest.json, linked from index.html
- PRODUCT_PHILOSOPHY.md at repo root with all 8 hard prohibitions
- turbo.json includes typecheck, test, build, dev tasks with correct dependsOn
- domain package: zero production deps enforced; 100% coverage thresholds configured
- ESLint migrated to v9 flat config (eslint.config.ts at root)

### File List

- `apps/web/index.html` — added manifest link, updated title, updated script src to main.tsx
- `apps/web/package.json` — renamed to @tododoro/web, added react/react-dom deps, @vitejs/plugin-react, @types/react, @types/react-dom, vite ^7.0.0, added @tododoro/domain and @tododoro/storage workspace deps
- `apps/web/src/main.tsx` — React 19 entry point (replaces main.ts)
- `apps/web/src/style.css` — base styles (from template)
- `apps/web/src/vite-env.d.ts` — Vite client type reference (from template)
- `apps/web/tsconfig.json` — updated with project references to domain, storage, ui; added jsx:react-jsx; removed conflicting noEmit:true
- `apps/web/vite.config.ts` — COEP/COOP dev server headers + @vitejs/plugin-react plugin
- `apps/web/vercel.json` — created with COEP, COOP, CSP production headers
- `apps/web/public/manifest.json` — PWA manifest placeholder
- `packages/domain/package.json` — new package, zero prod deps
- `packages/domain/src/index.ts` — empty barrel export
- `packages/domain/tsconfig.json` — extends base, composite:true, no references (leaf)
- `packages/domain/vitest.config.ts` — 100% coverage thresholds, passWithNoTests
- `packages/storage/package.json` — new package, depends on @tododoro/domain
- `packages/storage/src/index.ts` — empty barrel export
- `packages/storage/tsconfig.json` — extends base, references domain
- `packages/storage/vitest.config.ts` — standard coverage, passWithNoTests
- `packages/ui/package.json` — cleared old exports, added domain dep, simplified
- `packages/ui/src/index.ts` — empty barrel export (replaced components/utils)
- `packages/ui/tsconfig.json` — updated with composite:true, references domain
- `packages/typescript-config/base.json` — added strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes
- `turbo.json` — added typecheck, test tasks with correct dependsOn
- `package.json` — renamed to tododoro, added typecheck/test scripts, ESLint v9 deps
- `eslint.config.ts` — new flat config (migrated from .eslintrc.js)
- `PRODUCT_PHILOSOPHY.md` — created at repo root
- `pnpm-workspace.yaml` — verified (apps/*, packages/*)
- `pnpm-lock.yaml` — regenerated after dependency updates
