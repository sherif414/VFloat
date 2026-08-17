import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const requiredBranch = "main";
const dryRun = process.env.VFLOAT_RELEASE_DRY_RUN === "1";

const branch = read("git", ["branch", "--show-current"]);
if (branch !== requiredBranch) {
  fail(`Release must run from ${requiredBranch}. Current branch: ${branch || "(detached)"}.`);
}

const status = read("git", ["status", "--porcelain"]);
if (status) {
  fail("Release requires a clean worktree. Commit, stash, or discard local changes first.");
}

run("git", ["fetch", "--quiet", "origin", requiredBranch]);

const localSha = read("git", ["rev-parse", requiredBranch]);
const upstreamSha = read("git", ["rev-parse", `origin/${requiredBranch}`]);
const mergeBase = read("git", ["merge-base", requiredBranch, `origin/${requiredBranch}`]);

if (localSha !== upstreamSha && mergeBase === localSha) {
  fail(`Local ${requiredBranch} is behind origin/${requiredBranch}. Pull with --ff-only first.`);
}

if (localSha !== upstreamSha && mergeBase !== upstreamSha) {
  fail(
    `Local ${requiredBranch} has diverged from origin/${requiredBranch}. Resolve before releasing.`,
  );
}

const githubToken = getGitHubToken();
if (!githubToken) {
  reportCredentialProblem(
    "Missing GitHub authentication. Please log in with `gh auth login` or set GITHUB_TOKEN / GH_TOKEN.",
  );
}

const npmEnv = { ...process.env };
configureNpmAuth(npmEnv);

if (!npmEnv.NODE_AUTH_TOKEN) {
  if (process.env.VFLOAT_RELEASE_SKIP_NPM_WHOAMI !== "1") {
    try {
      execSync("npm whoami --registry=https://registry.npmjs.org/", {
        stdio: ["ignore", "pipe", "ignore"],
        env: npmEnv,
      });
    } catch {
      reportCredentialProblem(
        "Missing npm authentication. Please log in with `npm login` or set NODE_AUTH_TOKEN.",
      );
    }
  }
} else if (process.env.VFLOAT_RELEASE_SKIP_NPM_WHOAMI !== "1") {
  try {
    execSync("npm whoami --registry=https://registry.npmjs.org/", {
      stdio: "inherit",
      env: { ...npmEnv, NPM_CONFIG_PROVENANCE: "false" },
    });
  } catch {
    fail("npm whoami failed with configured authentication.");
  }
}

console.log("[release:preflight] Local release preflight passed.");

function getGitHubToken(env = process.env) {
  if (env.GITHUB_TOKEN) return env.GITHUB_TOKEN;
  if (env.GH_TOKEN) return env.GH_TOKEN;

  try {
    const result = spawnSync("gh", ["auth", "token"], {
      encoding: "utf8",
      shell: false,
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (result.status === 0 && result.stdout?.trim()) {
      return result.stdout.trim();
    }
  } catch {
    // gh CLI might not be installed
  }

  return null;
}

function reportCredentialProblem(message) {
  if (dryRun) {
    console.warn(`[release:preflight] ${message}`);
    console.warn("[release:preflight] Continuing because this is a dry run.");
    return;
  }

  fail(message);
}

function read(command, args) {
  const result = run(command, args, { stdio: "pipe" });
  return result.stdout.trim();
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
    stdio: options.stdio ?? "inherit",
    env: options.env ?? process.env,
  });

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    fail(stderr || `${command} ${args.join(" ")} failed.`);
  }

  return result;
}

function fail(message) {
  console.error(`[release:preflight] ${message}`);
  process.exit(1);
}

function configureNpmAuth(env) {
  if (!env.NODE_AUTH_TOKEN || env.NPM_CONFIG_USERCONFIG) {
    return;
  }

  const dir = mkdtempSync(join(tmpdir(), "vfloat-release-"));
  const userConfigPath = join(dir, ".npmrc");

  writeFileSync(
    userConfigPath,
    [
      "registry=https://registry.npmjs.org/",
      "//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}",
      "",
    ].join("\n"),
  );

  env.NPM_CONFIG_USERCONFIG = userConfigPath;

  const cleanup = () => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  };
  process.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}
