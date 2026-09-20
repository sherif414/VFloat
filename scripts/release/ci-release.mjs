import { existsSync, readFileSync, writeFileSync, unlinkSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const isDryRun = args.includes("--dry-run");
const skipGitHubRelease = args.includes("--skip-github-release");
const skipNpm = args.includes("--skip-npm");
const releaseType = getReleaseType(args);
const explicitVersion = getArgValue("--version");

const rootPkgPath = resolve(process.cwd(), "package.json");
const pkgPath = resolve(process.cwd(), "packages/vue/package.json");
const changelogPath = resolve(process.cwd(), "CHANGELOG.md");
const packageReadmePath = resolve(process.cwd(), "packages/vue/README.md");
const rootReadmePath = resolve(process.cwd(), "README.md");

if (!existsSync(pkgPath)) {
  fail("Could not find packages/vue/package.json in workspace.");
}

const originalPkgContent = readFileSync(pkgPath, "utf8");
const originalRootPkgContent = existsSync(rootPkgPath) ? readFileSync(rootPkgPath, "utf8") : null;
const originalChangelogContent = existsSync(changelogPath)
  ? readFileSync(changelogPath, "utf8")
  : null;

const pkg = JSON.parse(originalPkgContent);
const currentVersion = pkg.version;

if (!currentVersion) {
  fail("packages/vue/package.json is missing a 'version' field.");
}

const targetVersion = explicitVersion || calculateNextVersion(currentVersion, releaseType);

console.log(`[release] Current version : v${currentVersion}`);
console.log(`[release] Target version  : v${targetVersion} (${isDryRun ? "DRY RUN" : "LIVE"})`);

// 0. Preflight check: Verify target version does not already exist on npm
if (!isDryRun && !skipNpm) {
  console.log(`[release:preflight] Checking npm registry for v-float@${targetVersion}...`);
  const checkNpm = spawnSync("npm", ["view", `v-float@${targetVersion}`, "version"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (checkNpm.status === 0 && checkNpm.stdout?.trim() === targetVersion) {
    fail(`Version v-float@${targetVersion} is already published on npm. Bump version to proceed.`);
  }
}

// 1. Update packages/vue/package.json and root package.json
pkg.version = targetVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
if (originalRootPkgContent) {
  const rootPkg = JSON.parse(originalRootPkgContent);
  rootPkg.version = targetVersion;
  writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + "\n", "utf8");
}

// 2. Generate Changelog with changelogen
console.log("[release] Generating changelog...");
run("pnpm", ["exec", "changelogen", "-r", targetVersion, "--output", "CHANGELOG.md"]);

// 3. Update bundle metrics
console.log("[release] Measuring bundle size...");
run("pnpm", ["run", "size"]);

// 4. Extract release notes using release-notes.mjs helper
let releaseNotes = "";
try {
  const notesResult = spawnSync("node", ["./scripts/release/release-notes.mjs", targetVersion], {
    encoding: "utf8",
    shell: false,
  });
  releaseNotes =
    notesResult.status === 0 && notesResult.stdout.trim()
      ? notesResult.stdout.trim()
      : `Release v${targetVersion}`;
} catch {
  releaseNotes = `Release v${targetVersion}`;
}

if (isDryRun) {
  console.log("\n--- [DRY RUN] Release Notes Preview ---");
  console.log(releaseNotes);
  console.log("---------------------------------------\n");

  const hasLocalReadme = existsSync(packageReadmePath);
  if (!hasLocalReadme && existsSync(rootReadmePath)) {
    copyFileSync(rootReadmePath, packageReadmePath);
  }

  console.log("[release] Simulating npm pack output...");
  run("pnpm", ["--filter", "v-float", "pack", "--dry-run"]);

  if (!hasLocalReadme && existsSync(packageReadmePath)) {
    unlinkSync(packageReadmePath);
  }

  // Restore original contents so worktree remains 100% clean
  writeFileSync(pkgPath, originalPkgContent, "utf8");
  if (originalRootPkgContent !== null) {
    writeFileSync(rootPkgPath, originalRootPkgContent, "utf8");
  }
  if (originalChangelogContent !== null) {
    writeFileSync(changelogPath, originalChangelogContent, "utf8");
  } else if (existsSync(changelogPath)) {
    unlinkSync(changelogPath);
  }

  console.log("\n[release] Dry-run simulation completed successfully.");
  console.log("[release] No changes were committed, pushed, released, or published.");
  process.exit(0);
}

// LIVE EXECUTION (Fail-Safe Sequence)
console.log("[release] Commencing live release execution...");

if (process.env.GITHUB_ACTIONS) {
  run("git", ["config", "user.name", "github-actions[bot]"]);
  run("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
}

// Step 1: Stage and commit release artifacts locally
run("git", ["add", "packages/vue/package.json", "package.json", "CHANGELOG.md"]);
run("git", ["commit", "-m", `chore: release v${targetVersion}`]);
run("git", ["tag", "-a", `v${targetVersion}`, "-m", `v${targetVersion}`]);

// Step 2: Push commit and tag to origin/main (required for npm provenance attestation)
console.log("[release] Pushing commit and tag to origin/main...");
run("git", ["push", "origin", "main"]);
run("git", ["push", "origin", `v${targetVersion}`]);

// Step 3: Publish to npm FIRST with fail-safe rollback
if (!skipNpm) {
  const hasLocalReadme = existsSync(packageReadmePath);
  if (!hasLocalReadme && existsSync(rootReadmePath)) {
    copyFileSync(rootReadmePath, packageReadmePath);
  }

  console.log("[release] Publishing to npm registry with provenance...");
  let publishResult;
  try {
    publishResult = spawnSync("npm", ["publish", "--provenance", "--access", "public"], {
      cwd: resolve(process.cwd(), "packages/vue"),
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });
  } finally {
    if (!hasLocalReadme && existsSync(packageReadmePath)) {
      unlinkSync(packageReadmePath);
    }
  }

  if (publishResult.status !== 0) {
    console.error(
      "\n[release:CRITICAL] npm publish failed! Initiating rollback to prevent broken release state...",
    );
    try {
      console.log(`[release:rollback] Deleting remote tag v${targetVersion} from origin...`);
      spawnSync("git", ["push", "origin", "--delete", `v${targetVersion}`], {
        stdio: "inherit",
        shell: process.platform === "win32",
      });
    } catch (e) {
      console.error(`[release:rollback] Failed to delete remote tag: ${e.message}`);
    }
    fail(
      `npm publish failed with status code ${publishResult.status}. GitHub Release creation was ABORTED and remote tag was rolled back.`,
    );
  }
}

// Step 4: Create GitHub Release ONLY after npm publish succeeds
if (!skipGitHubRelease) {
  console.log("[release] Creating GitHub Release...");
  const tempNotesFile = resolve(process.cwd(), ".release-notes.tmp.md");
  writeFileSync(tempNotesFile, releaseNotes, "utf8");
  try {
    run("gh", [
      "release",
      "create",
      `v${targetVersion}`,
      "--title",
      `v${targetVersion}`,
      "--notes-file",
      tempNotesFile,
    ]);
  } finally {
    if (existsSync(tempNotesFile)) {
      unlinkSync(tempNotesFile);
    }
  }
}

console.log(`\n[release] Successfully released and published v${targetVersion}!`);

function calculateNextVersion(current, type) {
  const parts = current.split(".").map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(isNaN)) {
    fail(`Invalid semver in package.json: "${current}". Must be format X.Y.Z.`);
  }

  let [major, minor, patch] = parts;

  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

function getReleaseType(cliArgs) {
  const explicitType = getArgValue("--type") || getArgValue("--release-type");
  if (explicitType && ["patch", "minor", "major"].includes(explicitType)) {
    return explicitType;
  }

  for (const arg of cliArgs) {
    if (["patch", "minor", "major"].includes(arg)) {
      return arg;
    }
  }

  return "patch";
}

function getArgValue(name) {
  const match = args.find((a) => a.startsWith(`${name}=`));
  if (match) return match.slice(name.length + 1);

  const index = args.indexOf(name);
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith("--")) {
    return args[index + 1];
  }

  return null;
}

function run(command, commandArgs, options = {}) {
  const isBinary = ["git", "gh", "node", "npm"].includes(command);
  const result = spawnSync(command, commandArgs, {
    stdio: options.stdio ?? "inherit",
    shell: isBinary ? false : process.platform === "win32",
    env: { ...process.env, ...options.env },
  });

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    fail(`Command failed with exit code ${result.status}: ${command} ${commandArgs.join(" ")}`);
  }

  return result;
}

function fail(message) {
  console.error(`[release] Error: ${message}`);
  process.exit(1);
}

function printHelp() {
  console.log(`VFloat CI & Local Release Runner

Usage:
  node scripts/release/ci-release.mjs [patch|minor|major] [options]

Options:
  --type=<type>             Bump type: "patch", "minor", or "major" (default: "patch")
  --version=<x.y.z>         Explicit version override
  --dry-run                 Simulate changelog and pack without pushing or publishing
  --skip-github-release     Publish to npm without creating a GitHub Release
  --skip-npm                Create GitHub Release and tag without publishing to npm
  --help, -h                Show this help message
`);
}
