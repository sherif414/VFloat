import { spawnSync } from "node:child_process";

const defaultProjectName = "vfloat";
const distDir = "docs/.vitepress/dist";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const options = {
  branch: getArgValue("--branch") ?? "main",
  projectName:
    getArgValue("--project") ?? process.env.CLOUDFLARE_PAGES_PROJECT_NAME ?? defaultProjectName,
  dryRun: args.includes("--dry-run"),
  skipBuild: args.includes("--skip-build"),
};

if (!options.dryRun && !process.env.CLOUDFLARE_API_TOKEN) {
  fail("Missing CLOUDFLARE_API_TOKEN.");
}

if (!options.dryRun && !process.env.CLOUDFLARE_ACCOUNT_ID) {
  fail("Missing CLOUDFLARE_ACCOUNT_ID.");
}

if (!options.skipBuild) {
  run("vp", ["run", "docs:build"]);
}

const deployCommand = [
  "exec",
  "wrangler",
  "pages",
  "deploy",
  distDir,
  `--project-name=${options.projectName}`,
  `--branch=${options.branch}`,
];

if (options.dryRun) {
  console.log(`[docs:deploy] Dry run. Would run: vp ${deployCommand.join(" ")}`);
  process.exit(0);
}

run("vp", deployCommand);

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;

  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    fail(`Missing value for ${name}.`);
  }

  return value;
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function fail(message) {
  console.error(`[docs:deploy] ${message}`);
  process.exit(1);
}

function printHelp() {
  console.log(`Deploy VFloat documentation to Cloudflare Pages.

Usage:
  vp run docs:deploy
  vp run docs:deploy -- --project vfloat --branch main
  vp run docs:deploy -- --dry-run
  vp run docs:deploy -- --skip-build

Environment:
  CLOUDFLARE_API_TOKEN          Cloudflare API token with Pages deploy access.
  CLOUDFLARE_ACCOUNT_ID         Cloudflare account ID.
  CLOUDFLARE_PAGES_PROJECT_NAME Optional project name. Defaults to "vfloat".

Options:
  --project <name>  Cloudflare Pages project name.
  --branch <name>   Pages branch name. Defaults to "main".
  --dry-run         Build docs and print the deploy command without deploying.
  --skip-build      Deploy the existing docs/.vitepress/dist directory.
`);
}
