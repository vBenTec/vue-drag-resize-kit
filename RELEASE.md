# Release process

Publishing to npm is tag-triggered: pushing a `v*` tag runs `.github/workflows/publish.yml`.
Before it installs anything, the workflow fails closed unless:

- the tag matches the `version` in `package.json`,
- the tagged commit is on `main`,
- `CHANGELOG.md` has a `## X.Y.Z — YYYY-MM-DD` heading for that version,
- a prerelease version has a named identifier to use as its npm dist-tag (see
  [Prereleases](#prereleases)).

It then runs the full check suite and publishes. A stable release (dist-tag `latest`) then
deploys the documentation site from the same tag through `.github/workflows/docs.yml`, so the
site always describes the version on npm. Nothing else is automated.

## 0. Keep the changelog current

User-facing changes add an entry under `## Unreleased` in `CHANGELOG.md` in the same PR that
makes the change, following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). That way
the release notes are already written when it is time to release, and nobody has to reconstruct
them from memory. Call out breaking changes explicitly.

## 1. Open a release PR

Pick the version by [SemVer](https://semver.org/): breaking change → major, new
backwards-compatible feature → minor, fix → patch.

```bash
git switch main && git pull
git switch -c release/vX.Y.Z
pnpm version patch --no-git-tag-version   # or minor / major
# prerelease: pnpm version prerelease --preid beta --no-git-tag-version  → 1.1.0-beta.0
```

In `CHANGELOG.md`, rename `## Unreleased` to `## X.Y.Z — YYYY-MM-DD` (today's date, with an em
dash) and add a fresh, empty `## Unreleased` above it.

Commit as `chore: release vX.Y.Z`, push the branch, open a pull request against `main`, and
merge it once CI is green.

## 2. Tag the merged commit on main

```bash
git switch main && git pull --ff-only
git tag vX.Y.Z
git push origin vX.Y.Z
```

Push the tag only, never `main`. The commit you tag must be the merged release commit on
`main`; the workflow refuses to publish anything else.

## 3. Watch the Publish workflow

Follow the run on GitHub Actions. If it fails **before** the publish step, nothing reached npm
and you can reuse the version:

1. Fix the problem through a PR to `main`.
2. Delete the tag locally and on GitHub:
   `git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`
3. Pull `main`, tag the fixed commit and push the tag again (step 2).

This is only safe because npm never saw the version. If npm already has it, don't move the tag.
npm versions are immutable, so bump to a new version and release that instead.

## 4. Check the documentation site

After the publish job, the `docs` job deploys https://vbentec.github.io/vue-drag-resize-kit/.
If only it fails, npm already has the version: don't move the tag. Fix the cause and run the
**Docs** workflow by hand (Actions → Docs → Run workflow) with the tag as `ref`.

Prereleases don't deploy the site; it stays on the latest stable release.

### Docs fixes between releases

Run the **Docs** workflow by hand with `ref` set to `main`. It refuses while `CHANGELOG.md` has
entries under `## Unreleased`, because the site would then document behaviour that is not on npm
yet. In that case the fix goes live with the next release (a patch release is fine). With `ref`
left empty, the workflow rebuilds the latest stable release.

### Repository setup

Done once, already in place: Pages is enabled with **GitHub Actions** as its source, and the
`github-pages` environment allows deployments from `main` and from `v*` tags (Settings →
Environments → github-pages → Deployment branches and tags).

## Prereleases

A prerelease publishes under the npm dist-tag named by its `--preid` value (`1.1.0-beta.0` →
`beta`), so it never becomes `latest`. A bare `pnpm version prerelease` without `--preid`
produces a version like `1.0.1-0`, which has no name to use as a dist-tag. The workflow rejects
it.

## Dependency updates (Renovate)

Renovate opens PRs against `main` on a weekly schedule (see `renovate.json`).

- **Automerged once CI passes:** minor and patch devDependency bumps.
- **Wait for manual review:** major devDependency bumps, lockfile maintenance and GitHub
  Actions updates.
- **Never touched:** the `vue` peer range is widened by hand, and Renovate is disabled for it.
  The same goes for the `engines.node` range (it is what consumers need, not the Node version CI
  runs on) and `@types/node` majors, and TypeScript is held below 7 (see `renovate.json`).

The package has no production dependencies. A merged dependency PR does not by itself call for
a release. Decide separately whether one is worth cutting.
