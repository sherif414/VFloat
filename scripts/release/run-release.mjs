import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const env = { ...process.env };

const githubToken = getGitHubToken(env);
if (githubToken && !env.GITHUB_TOKEN) {
  env.GITHUB_TOKEN = githubToken;
}

if (args.includes("--dry-run")) {
  env.VFLOAT_RELEASE_DRY_RUN = "1";
}

const result = spawnSync("pnpm", ["exec", "release-it", ...args], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env,
});

if (result.error) {
  console.error(`[release] ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);

function getGitHubToken(environment = process.env) {
  if (environment.GITHUB_TOKEN) return environment.GITHUB_TOKEN;
  if (environment.GH_TOKEN) return environment.GH_TOKEN;

  try {
    const res = spawnSync("gh", ["auth", "token"], {
      encoding: "utf8",
      shell: false,
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (res.status === 0 && res.stdout?.trim()) {
      return res.stdout.trim();
    }
  } catch {
    // gh CLI might not be installed
  }

  return null;
}
