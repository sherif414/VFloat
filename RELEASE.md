# Release VFloat

VFloat releases and deployments are fully automated and executed directly via **GitHub Actions**.

1. **Package Release & Publication**: GitHub Release generation and npm package publishing (`v-float`) are executed atomically in GitHub Actions with **npm Trusted Publishing (OIDC)** and cryptographic build provenance (`--provenance`).
2. **Documentation Deployment**: Dedicated GitHub Actions workflow builds the VitePress site and deploys to **Cloudflare Pages**.

---

## 1. One-Time Setup & Authentication

### A. npm Trusted Publishing (npmjs.com)

Package publishing uses OpenID Connect (OIDC). No long-lived `NODE_AUTH_TOKEN` or npm token is required:

1. Go to [npmjs.com/package/v-float/access](https://www.npmjs.com/package/v-float/access).
2. Under **Publishing Access** -> **Trusted Publishers**, click **Add Trusted Publisher** -> **GitHub Actions**.
3. Configure:
   - **GitHub organization / user**: `sherif414`
   - **Repository**: `VFloat`
   - **Workflow filename**: `release.yml`
   - **Environment name**: _(leave blank)_

### B. Cloudflare Pages Secrets (GitHub Repository Secrets)

To enable automated documentation deployments on Cloudflare Pages:

1. Go to **Repository Settings** -> **Secrets and variables** -> **Actions** on GitHub.
2. Add repository secrets:
   - `CLOUDFLARE_API_TOKEN`: API Token with Cloudflare Pages Edit permissions.
   - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Account ID.
   - `CLOUDFLARE_PAGES_PROJECT_NAME` _(optional)_: Project name (defaults to `vfloat`).

---

## 2. Local Simulation (Dry-Run)

Simulate version bumps, changelog generation, package packing, and documentation builds locally without mutating git remotes, GitHub, or npm:

```powershell
# 1. Simulate package release (previews version bump, changelog, and npm pack)
pnpm run release:dry

# 2. Simulate changelog generation only
pnpm run changelog:preview

# 3. Simulate docs deployment
pnpm run docs:deploy -- --dry-run
```

---

## 3. Triggering a Release on GitHub Actions

Releases are triggered directly from GitHub:

1. Navigate to **Actions** -> **[Release & Publish](https://github.com/sherif414/VFloat/actions/workflows/release.yml)**.
2. Click **Run workflow**.
3. Select:
   - **Branch**: `main`
   - **Semantic release bump type**: `patch` (bug fixes), `minor` (features), or `major` (breaking changes).
   - **Dry-run simulation**: Check this box to simulate the entire CI release run before publishing live.

### What Happens Automatically:

1. Restores Playwright Chromium from GitHub Actions cache.
2. Runs `lint`, `type-check`, `test`, and `build`.
3. Bumps `package.json` version.
4. Generates `CHANGELOG.md` entries via `changelogen`.
5. Updates `docs/.vitepress/data/package-size.json` bundle metrics.
6. Commits `chore: release vX.Y.Z` and creates tag `vX.Y.Z`.
7. Pushes commit & tag to `origin/main`.
8. Creates the GitHub Release with extracted changelog release notes.
9. Publishes `v-float@X.Y.Z` to npm with `--provenance` via OIDC.
10. Automatically triggers the **Deploy Documentation** workflow to publish the updated site to Cloudflare Pages.

---

## 4. Documentation Deployments

The **[Deploy Documentation](https://github.com/sherif414/VFloat/actions/workflows/docs.yml)** workflow:

- **Automatic**: Runs automatically whenever the **Release & Publish** workflow finishes successfully on `main`.
- **Manual**: Can be manually dispatched from GitHub Actions with a `dry_run` checkbox.
- **Local**: Can be deployed locally via `pnpm run docs:deploy` (after `pnpm exec wrangler login`).
