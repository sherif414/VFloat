# Release VFloat

VFloat releases are local and zero-configuration. The local release command validates the repo, updates the changelog, creates the release commit and tag, pushes them to GitHub, creates the GitHub Release, publishes `v-float` to npm, and deploys the documentation to Cloudflare Pages.

GitHub Actions verifies pushes, pull requests, and release tags. It does not publish releases on normal `main` pushes.

## Authentication (One-Time Setup)

Release workflows authenticate via standard interactive CLI login sessions stored in your operating system keyring / user configs:

```powershell
# 1. GitHub CLI login (for release commit, tag push, and GitHub Release)
gh auth login

# 2. npm registry login (for package publishing)
npm login

# 3. Cloudflare login (for documentation site deployment)
pnpm exec wrangler login
```

_(CI environments can alternatively supply tokens via `GITHUB_TOKEN`, `NODE_AUTH_TOKEN`, `CLOUDFLARE_API_TOKEN`, and `CLOUDFLARE_ACCOUNT_ID`.)_

## Preflight

Start from a clean `main` branch:

```powershell
git checkout main
git pull --ff-only
pnpm install
pnpm run release:preflight
```

The preflight verifies:

- the current branch is `main`;
- the worktree has uncommitted changes;
- local `main` is synchronized with `origin/main`;
- GitHub authentication is active (`gh auth status`);
- npm authentication is active (`npm whoami`).

## Dry Run

Preview the release before publishing:

```powershell
pnpm run release:dry
pnpm run docs:deploy -- --dry-run
```

The dry run skips remote mutations while previewing the version bump, changelog notes, package size metrics, and deployment commands.

## Publish

Choose the version increment:

```powershell
pnpm run release:patch
pnpm run release:minor
pnpm run release:major
```

Use `patch` for fixes, `minor` for new features or breaking changes on the `0.x` line, and `major` only when intentionally moving to the next major line.

The release pipeline validates lint, type-check, tests, build, and package size (`pnpm run size`) before bumping, then packages the distribution and records the size metrics.

After publishing finishes, verify:

- `CHANGELOG.md` has the new version section;
- `docs/.vitepress/data/package-size.json` is updated with the released version;
- the release commit and `vX.Y.Z` tag are pushed;
- the GitHub Release exists;
- npm shows the published `v-float` version.

## Documentation Deployment

Deploy the updated documentation site to Cloudflare Pages:

```powershell
pnpm run docs:deploy
```

The script automatically computes package size bundle metrics, runs `pnpm run docs:build`, and deploys the site to Cloudflare Pages using your active Wrangler session.
