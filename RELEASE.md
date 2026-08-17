# Release VFloat

VFloat releases are streamlined, local-driven, and zero-configuration. The release command validates the repo, calculates semantic versions, updates the changelog and bundle metrics, creates the release commit and tag, pushes to GitHub, and creates the GitHub Release.

Publishing to the **npm registry** is executed automatically by **GitHub Actions** via **npm Trusted Publishing (OIDC)** with cryptographic build provenance (`--provenance`).

---

## 1. Authentication (One-Time Setup)

Local release operations authenticate via the **GitHub CLI (`gh`)**:

```powershell
# 1. GitHub CLI login (used for tag pushes and GitHub Release creation)
gh auth login

# 2. Cloudflare login (used for documentation site deployment)
pnpm exec wrangler login
```

_(No `$env:GITHUB_TOKEN` or `$env:NODE_AUTH_TOKEN` environment variables are required)._

---

## 2. npm Trusted Publishing (One-Time npmjs.com Setup)

npm package publishing uses OpenID Connect (OIDC). To configure on npmjs.com:

1. Open [npmjs.com/package/v-float/access](https://www.npmjs.com/package/v-float/access)
2. Under **Publishing Access** -> **Trusted Publishers**, click **Add Trusted Publisher** -> **GitHub Actions**
3. Configure:
   - **GitHub organization / user**: `sherif414`
   - **Repository**: `VFloat`
   - **Workflow filename**: `release.yml`
   - **Environment name**: _(leave blank)_

---

## 3. Preflight & Dry Run

Verify repository readiness before publishing:

```powershell
# Preflight health checks (branch, worktree, remote sync, gh auth)
pnpm run release:preflight

# Dry-run release simulation (previews version bump and changelog without mutating remotes)
pnpm run release:dry

# Dry-run docs deployment
pnpm run docs:deploy -- --dry-run
```

---

## 4. Publish Release

Execute the target release command:

```powershell
# For bug fixes:
pnpm run release:patch

# For new features & minor updates:
pnpm run release:minor

# For major milestone releases:
pnpm run release:major
```

### What Happens Automatically:

1. Runs lint, type-check, test suite, and bundle build.
2. Updates `package.json` version.
3. Generates release notes in `CHANGELOG.md` via `changelogen`.
4. Updates `docs/.vitepress/data/package-size.json` with fresh bundle metrics.
5. Commits `chore: release v<version>` and creates tag `v<version>`.
6. Pushes commit and tag to `origin/main`.
7. Creates the GitHub Release with extracted release notes.
8. Triggers GitHub Actions (`.github/workflows/release.yml`) to publish `v-float@<version>` to npm with `--provenance`.

---

## 5. Documentation Deployment

Deploy the updated documentation site to Cloudflare Pages:

```powershell
pnpm run docs:deploy
```
