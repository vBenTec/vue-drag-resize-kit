# AGENTS.md

Vue 3 draggable/resizable component library (`vue-drag-resize-kit`), TypeScript, ESM-only.

## Layout

- `src/core/`: framework-agnostic logic (positioning, handles, guides, pointer). No Vue imports here.
- `src/vue/`: Vue components (`components/`) and composables (`composables/`).
- `src/index.ts`: public API. Keep exports in sync with `src/index.test-d.ts`.
- `src/test-utils/`: shared test helpers.
- `playground/`: local demo app (`pnpm dev-vue`).
- `docs/`: VitePress documentation site (`pnpm docs:dev`). See [Documentation](#documentation).

Domain terms (gesture, guides, member, snap session) are defined in `GLOSSARY.md`.

## Commands (pnpm only)

- `pnpm test`: Vitest unit project (happy-dom). Tests sit next to their source as `*.test.ts`.
- `pnpm test:browser`: Vitest browser project (Playwright Chromium), `*.browser.test.ts`. Run
  `pnpm exec playwright install chromium` once first.
- `pnpm typecheck`: vue-tsc
- `pnpm lint` / `pnpm fmt`: oxlint / oxfmt (not ESLint/Prettier)
- `pnpm build && pnpm check:pkg`: build and validate the package
- `pnpm docs:build`: build the docs site; fails on dead internal links
- `pnpm docs:screenshot`: re-render the README images (`docs/public/hero-*.png`) from the home page
  hero demo. Run it after any visual change to the components.

Before you finish, run what CI runs: `pnpm fmt:check && pnpm lint && pnpm typecheck && pnpm test && pnpm test:browser && pnpm build && pnpm check:pkg && pnpm docs:build`.

## Conventions

- `main` is the default branch. Branch off it and open a pull request.
- Conventional commit messages (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- User-facing changes add an entry under `## Unreleased` in `CHANGELOG.md` and update the docs
  (see [Documentation](#documentation)); releases follow `RELEASE.md`.
- Exported types live in `src/core/types.ts` (framework-agnostic) and `src/vue/types.ts` (Vue,
  including the composables' option interfaces, marked `@internal`), not in the module that uses
  them. Only unexported helper types stay next to their code.
- `dist/` is build output. Don't edit it.

## Documentation

The docs site in `docs/` is the user reference. A user-facing change is not done until the docs
describe it, in the same pull request. The docs describe `main`, unreleased changes included.

| You changed                                         | Update                                                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| A prop, model, event or slot                        | Its row in `docs/api/draggable-resizable.md` or `draggable-container.md`, and the guide page |
| A CSS class, `data-*` attribute or custom property  | `docs/api/css.md`, and `docs/guide/styling.md` if it is themeable                            |
| An export in `src/index.ts`                         | `docs/api/types.md` and `docs/guide/typescript.md`                                           |
| Behaviour that existing users may depend on         | The guide page; for a breaking change also the changelog entry's migration steps             |
| How the frame, handles or guides look               | Run `pnpm docs:screenshot` and commit the new `docs/public/hero-*.png`                       |
| A new feature area                                  | A guide page with a demo, linked from the sidebar in `docs/.vitepress/config.ts`             |
| Package facts (Vue range, entry points, components) | `details` of the `llmstxt` plugin in `docs/.vitepress/config.ts`, and `docs/index.md`        |

- **Examples are demos.** A full example is a component in `docs/demos/`, rendered with
  `<DemoFrame>` and shown with `<<< @/demos/Name.vue`, so the code on the page is the code that runs
  and `pnpm typecheck` covers it. Demos import `vue-drag-resize-kit` (aliased to `src/index.ts`),
  carry their own scoped styles and stay copy-pasteable. Inline code blocks are for fragments only.
- **Demos are server-rendered.** No `window` / `document` during setup, and never put a component
  inside a `<p>` (its root is a `<div>`; the hydration mismatch shows up only in the built site).
- **Pages and the sidebar are the routing.** `llms.txt`, `llms-full.txt` and a `.md` copy of every
  page are generated from them by `vitepress-plugin-llms`; never hand-edit generated output. A page
  missing from the sidebar is missing from `llms.txt`.
- **Links.** Link between pages with root paths (`/guide/rtl#flowanchor`). `pnpm docs:build` fails
  on links to missing pages but not on missing `#anchors`, so check those. `CHANGELOG.md` is
  rendered as `docs/changelog.md`: links in it must be absolute URLs, as repo-relative ones break
  on the site.
- **Repo-only files.** `GLOSSARY.md`, `RELEASE.md` and this file are for contributors and are not
  part of the site.
- **README.** A short landing page for GitHub and npm: pitch, feature list, install, one usage
  example and links into the site. Reference material goes in `docs/`, not the README. Keep its
  feature list in step with the features on `docs/index.md`.
- **Publishing.** Each stable release deploys the site from its tag (`publish.yml` calls
  `docs.yml`), so the live site matches npm, and the docs on `main` may run ahead of it. See
  `RELEASE.md`.
