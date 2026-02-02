<!-- Auto-generated guidance for AI coding agents. Edit as needed. -->
# Copilot / AI Agent Instructions — gl-knowledge-ui

Purpose: give an AI coding agent the minimal, actionable knowledge to be productive in this repository.

- Project type: Next.js (app-router) + TypeScript + Tailwind. Entry: `src/app` (app router pages and layout).
- Local dev: `npm run dev` (uses `next dev`). Build: `npm run build`. Start prod server: `npm run start`.
- Tests: `npm test` runs `vitest run`.

Key conventions and architecture
- Source root: `src/` — feature folders under `src/app` and shared UI under `src/components`.
- Path alias: the TS alias `@/*` -> `src/*` (see `tsconfig.json`), so imports like `@/lib/api` map to `src/lib/api.ts`.
- UI language/content: mixture of English and Chinese strings; look in `src/i18n` and many components for user-facing copy.

API & backend integration
- Two related client libs: `src/lib/api.ts` and `src/lib/glossary-api.ts`. They expect a local backend by default (`http://localhost:8000`) and read env vars:
  - `NEXT_PUBLIC_GLOSSARY_API` (used by `src/lib/api.ts`)
  - `NEXT_PUBLIC_API_BASE` (used by `src/lib/glossary-api.ts`)
  Keep both in mind; do not rename env vars without updating callers.
- Fetch pattern: most server calls use `fetch(..., { cache: "no-store" })` and wrap responses via helper `requestJson` (see `src/lib/api.ts`). Handle the repo's service-down message constant when stubbing or testing: `SERVICE_DOWN_MESSAGE`.

Common helpers & patterns
- `cn(...)` helper in `src/lib/cn.ts` is used across components for className composition (simple truthy-filtering join).
- `src/lib/text-utils.ts` contains `decodeUnicodeEscapes()` used when UI displays escaped unicode.
- Shared types and API DTOs live in `src/lib` and `src/types` (import via `@/types/...`). Inspect `src/lib/api.ts` for canonical DTO shapes used by the UI.

Styling and tooling
- Tailwind is configured (see `tailwind.config.ts`) and global stylesheet is `src/app/globals.css`.
- Project uses `clsx` as a dependency but also has `cn` helper — prefer existing `cn` usage in files that already import it.

State & stores
- Lightweight stores use `zustand` (see `store/`, e.g. `store/drawer-store.ts`). Follow existing store patterns when adding state.

Testing and quick checks
- Use `npm test` (Vitest) for unit tests. For quick UI checks run `npm run dev` and open the Next dev server.

What to review before making changes
- Inspect `src/app/layout.tsx` and `src/app/page.tsx` to understand the app-level layout and data loading.
- Read `src/lib/api.ts` to understand API contracts and error handling conventions.
- When changing import paths, honor the `@/` alias in `tsconfig.json`.

Examples (where to look)
- App entry/layout: src/app/layout.tsx
- Top-level pages: src/app/page.tsx, src/app/search/page.tsx
- API helpers: src/lib/api.ts and src/lib/glossary-api.ts
- Class helper: src/lib/cn.ts
- Global styles: src/app/globals.css
- Stores: store/drawer-store.ts

Agent behavior rules (practical constraints)
- Do not change environment variable names; prefer adding fallbacks if necessary.
- Preserve Chinese UI messages and existing keys when modifying components; many UI texts are localized.
- When calling backend endpoints, mirror existing `fetch` options (headers, `cache: "no-store"`) unless intentionally changing caching semantics.

If you make edits, run these locally:
```
npm install
npm run dev
npm test
```

If anything above is unclear or you need more examples (component wiring, common props, or typical API payloads), ask for the specific area to inspect and I'll provide file-level excerpts.
