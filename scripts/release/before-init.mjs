import { execSync } from "node:child_process";

if (process.env.CI) {
  console.log("Skipping git pull in CI.");
  process.exit(0);
}

execSync("git pull --ff-only", { stdio: "inherit" });
