# Release VFloat

VFloat releases are mostly local. The local release command validates the repo, updates the changelog, creates the release commit and tag, pushes them to GitHub, creates the GitHub Release, and publishes `v-float` to npm.

GitHub Actions verifies pushes, pull requests, and release tags. It does not publish releases on normal `main` pushes.

## Credentials

Set these environment variables before a real release:

```powershell
$env:GITHUB_TOKEN = "<github-token>"
$env:NODE_AUTH_TOKEN = "<npm-token>"
```

`GH_TOKEN` also works for the local release scripts. The wrapper copies it to `GITHUB_TOKEN` before running `release-it`.

Use an npm automation token for `NODE_AUTH_TOKEN`. The preflight checks `npm whoami` before a real release so a bad token fails before version files are changed.

## Preflight

Start from a clean `main` branch:

```powershell
git checkout main
git pull --ff-only
vp install
vp run release:preflight
```

The preflight fails when:

- the current branch is not `main`;
- the worktree has uncommitted changes;
- local `main` is behind or diverged from `origin/main`;
- release credentials are missing;
- npm authentication cannot be verified.

## Dry Run

Preview the release before publishing:

```powershell
vp run release:dry
```

The dry run skips GitHub release creation and npm publishing. It still exercises the configured release flow enough to preview the version, changelog, and release commands. Missing credentials are reported as warnings during a dry run.

## Publish

Choose the version type manually:

```powershell
vp run release:patch
vp run release:minor
vp run release:major
```

Use `patch` for fixes, `minor` for new features on the unstable `0.x` line, and `major` only when intentionally moving to the next major line.

After the command finishes, verify:

- `CHANGELOG.md` has the new version section;
- the release commit and `vX.Y.Z` tag are pushed;
- the GitHub Release exists;
- npm shows the published `v-float` version.
