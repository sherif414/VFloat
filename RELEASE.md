# Release Guide

This document outlines the release process for V-Float using release-it.

## Prerequisites

1. **Clean working directory**: Ensure all changes are committed and the working directory is clean
2. **Main branch**: You must be on the `main` branch
3. **Authenticated**: Ensure you're authenticated with npm and GitHub (if publishing)

## Release Commands

### Interactive Release (Recommended)

```bash
pnpm run release
```

This will:

- Prompt for version type (patch, minor, major)
- Run pre-release checks (lint, type-check, tests)
- Build the project
- Generate changelog
- Create git tag
- Create GitHub release
- Publish to npm (if configured)

### Specific Version Types

```bash
# Patch release (bug fixes): 0.2.1 -> 0.2.2
pnpm run release:patch

# Minor release (new features): 0.2.1 -> 0.3.0
pnpm run release:minor

# Major release (breaking changes): 0.2.1 -> 1.0.0
pnpm run release:major
```

### Dry Run (Testing)

```bash
pnpm run release:dry
```

This shows what would happen without actually performing the release.

## Release Process

When you run a release command, release-it will:

1. **Validation**:
   - Check that working directory is clean
   - Verify you're on the main branch
   - Confirm npm authentication (if publishing)

2. **Pre-release hooks**:
   - `pnpm run lint` - Code linting
   - `pnpm run type-check` - TypeScript compilation
   - `pnpm run test:unit` - Unit tests

3. **Version bump**:
   - Update version in package.json
   - Commit changes with conventional commit message

4. **Build**:
   - `pnpm run build` - Build the project for distribution

5. **Post-release**:
   - Generate/update CHANGELOG.md
   - Create Git tag
   - Push changes and tags to origin
   - Create GitHub release with release notes
   - Publish to npm (if configured)

## Configuration

The release configuration is in `.release-it.json`:

- **Git**: Conventional commit messages, tagging, branch protection
- **npm**: Publishing configuration (currently disabled)
- **GitHub**: Automatic release creation with generated notes
- **Changelog**: Automatic generation using conventional commits
- **Hooks**: Pre and post-release scripts

## Conventional Commits

For best results, use conventional commit format:

```
feat: add new floating tree API
fix: resolve positioning issue with arrows
docs: update readme with examples
chore: update dependencies
```

Types:

- `feat`: New features (minor bump)
- `fix`: Bug fixes (patch bump)
- `docs`: Documentation changes
- `chore`: Maintenance tasks
- `BREAKING CHANGE`: Major version bump

## Troubleshooting

### "Working dir must be clean"

Commit or stash all changes before releasing:

```bash
git add .
git commit -m "chore: prepare for release"
```

### "Not on main branch"

Switch to main branch:

```bash
git checkout main
```

### npm authentication issues

Login to npm:

```bash
npm login
```

### GitHub authentication issues

Ensure GitHub CLI is authenticated or use a personal access token:

```bash
gh auth login
```
