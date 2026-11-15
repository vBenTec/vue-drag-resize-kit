# AGENTS.md

Vue 3 draggable/resizable component library (`vue-drag-resize-kit`), TypeScript, ESM-only.

## Layout

- `src/core/`: framework-agnostic logic (positioning, handles, guides, pointer). No Vue imports here.
- `src/vue/`: Vue components (`components/`) and composables (`composables/`).
- `src/index.ts`: public API. Keep exports in sync with `src/index.test-d.ts`.
- `src/test-utils/`: shared test helpers.
- `playground/`: local demo app (`pnpm dev-vue`).

Domain terms (gesture, guides, member, snap session) are defined in `GLOSSARY.md`.

## Commands (pnpm only)

- `pnpm test`: Vitest unit project (happy-dom). Tests sit next to their source as `*.test.ts`.
- `pnpm test:browser`: Vitest browser project (Playwright Chromium), `*.browser.test.ts`. Run
  `pnpm exec playwright install chromium` once first.
- `pnpm typecheck`: vue-tsc
- `pnpm lint` / `pnpm fmt`: oxlint / oxfmt (not ESLint/Prettier)
- `pnpm build && pnpm check:pkg`: build and validate the package

Before you finish, run what CI runs: `pnpm fmt:check && pnpm lint && pnpm typecheck && pnpm test && pnpm test:browser && pnpm build && pnpm check:pkg`.

## Conventions

- `main` is the default branch. Branch off it and open a pull request.
- Conventional commit messages (`feat:`, `fix:`, `refactor:`, `chore:`).
- User-facing changes add an entry under `## Unreleased` in `CHANGELOG.md`; releases follow `RELEASE.md`.
- `dist/` is build output. Don't edit it.
