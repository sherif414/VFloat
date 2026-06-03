import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const env = { ...process.env };

if (!env.GITHUB_TOKEN && env.GH_TOKEN) {
  env.GITHUB_TOKEN = env.GH_TOKEN;
}

if (args.includes("--dry-run")) {
  env.VFLOAT_RELEASE_DRY_RUN = "1";
}

configureNpmAuth(env);

const result = spawnSync("vp", ["exec", "release-it", ...args], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env,
});

if (result.error) {
  console.error(`[release] ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);

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
