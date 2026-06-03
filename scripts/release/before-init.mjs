import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
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

const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!githubToken) {
  reportCredentialProblem("Missing GITHUB_TOKEN or GH_TOKEN for creating the GitHub Release.");
}

const npmEnv = { ...process.env };
configureNpmAuth(npmEnv);

if (!npmEnv.NODE_AUTH_TOKEN) {
  reportCredentialProblem("Missing NODE_AUTH_TOKEN for publishing to npm.");
} else if (process.env.VFLOAT_RELEASE_SKIP_NPM_WHOAMI !== "1") {
  run("npm", ["whoami", "--registry=https://registry.npmjs.org/"], {
    env: { ...npmEnv, NPM_CONFIG_PROVENANCE: "false" },
  });
}

console.log("[release:preflight] Local release preflight passed.");

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
    shell: process.platform === "win32",
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
}
