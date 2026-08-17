# Release VFloat

VFloat releases are mostly local. The local release command validates the repo, updates the changelog, creates the release commit and tag, pushes them to GitHub, creates the GitHub Release, and publishes `v-float` to npm.

GitHub Actions verifies pushes, pull requests, and release tags. It does not publish releases on normal `main` pushes.

## Authentication & Credentials

### GitHub Authentication

GitHub authentication defaults to the **GitHub CLI (`gh`)**. If you are logged in via `gh auth login`, no environment variables are required.

Alternatively, you can provide a token via `$env:GITHUB_TOKEN` (or `$env:GH_TOKEN`):

```powershell
gh auth login
# OR
$env:GITHUB_TOKEN = "<github-token>"
```

### npm Authentication

Authenticate with npm via `npm login` or by providing an automation token in `$env:NODE_AUTH_TOKEN`:

```powershell
npm login
# OR
$env:NODE_AUTH_TOKEN = "<npm-token>"
```

The preflight checks `npm whoami` before a real release so invalid credentials fail before version files are modified.

### Cloudflare Documentation Deployment

Cloudflare Pages deployment requires Cloudflare credentials:

```powershell
$env:CLOUDFLARE_API_TOKEN = "<cloudflare-api-token>"
$env:CLOUDFLARE_ACCOUNT_ID = "<cloudflare-account-id>"
```

## Preflight

Start from a clean `main` branch:

```powershell
git checkout main
git pull --ff-only
pnpm install
pnpm run release:preflight
```

The preflight fails when:

- the current branch is not `main`;
- the worktree has uncommitted changes;
- local `main` is behind or diverged from `origin/main`;
- GitHub authentication cannot be verified (`gh` CLI or token);
- npm authentication cannot be verified (`npm login` or token).

## Dry Run

Preview the release before publishing:

```powershell
pnpm run release:dry
```

The dry run skips GitHub release creation and npm publishing. It still exercises the configured release flow enough to preview the version, changelog, and release commands. Missing credentials are reported as warnings during a dry run.

## Publish

Choose the version type manually:

```powershell
pnpm run release:patch
pnpm run release:minor
pnpm run release:major
```

Use `patch` for fixes, `minor` for new features on the unstable `0.x` line, and `major` only when intentionally moving to the next major line.

The release pipeline validates lint, type-check, tests, build, and package size (`pnpm run size`) before bumping, then packages the distribution and records the size metrics.

After the command finishes, verify:

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

The script automatically runs `pnpm run size` to compute and embed the latest bundle metrics, runs `pnpm run docs:build`, and deploys the site to Cloudflare Pages.
