import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "../..");
const distFile = join(rootDir, "dist/index.mjs");
const packageJsonFile = join(rootDir, "package.json");
const outputJsonFile = join(rootDir, "docs/.vitepress/data/package-size.json");

const args = process.argv.slice(2);
const isJsonOutput = args.includes("--json");
const isQuiet = args.includes("--quiet");
const shouldBuild = args.includes("--build") || !existsSync(distFile);

export function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} kB`;
}

export function measurePackageSize(options = {}) {
  const { build = false } = options;

  if (build || !existsSync(distFile)) {
    const result = spawnSync("pnpm", ["run", "build"], {
      cwd: rootDir,
      stdio: isQuiet ? "ignore" : "inherit",
      shell: process.platform === "win32",
    });

    if (result.status !== 0) {
      throw new Error(`Build failed with exit code ${result.status ?? 1}`);
    }
  }

  if (!existsSync(distFile)) {
    throw new Error(`Build artifact not found at ${distFile}`);
  }

  const pkg = JSON.parse(readFileSync(packageJsonFile, "utf8"));
  const content = readFileSync(distFile);

  const rawBytes = content.length;
  const gzipBytes = zlib.gzipSync(content, { level: 9 }).length;
  const brotliBytes = zlib.brotliCompressSync(content).length;

  const data = {
    version: pkg.version || "0.0.0",
    rawBytes,
    rawFormatted: formatBytes(rawBytes),
    minifiedBytes: rawBytes,
    minifiedFormatted: formatBytes(rawBytes),
    gzipBytes,
    gzipFormatted: formatBytes(gzipBytes),
    brotliBytes,
    brotliFormatted: formatBytes(brotliBytes),
    measuredAt: new Date().toISOString(),
  };

  mkdirSync(dirname(outputJsonFile), { recursive: true });
  writeFileSync(outputJsonFile, JSON.stringify(data, null, 2) + "\n", "utf8");

  return data;
}

// Execute if run directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const data = measurePackageSize({ build: shouldBuild });

    if (isJsonOutput) {
      console.log(JSON.stringify(data, null, 2));
    } else if (!isQuiet) {
      console.log("\n📦 VFloat Package Size Summary");
      console.log("===============================");
      console.log(`Version:            v${data.version}`);
      console.log(
        `Bundle (ESM):       ${data.minifiedFormatted} (${data.minifiedBytes.toLocaleString()} bytes)`,
      );
      console.log(
        `Minified + Gzip:    ${data.gzipFormatted} (${data.gzipBytes.toLocaleString()} bytes)`,
      );
      console.log(
        `Minified + Brotli:  ${data.brotliFormatted} (${data.brotliBytes.toLocaleString()} bytes)`,
      );
      console.log(`Data saved to:      docs/.vitepress/data/package-size.json\n`);
    }
  } catch (error) {
    console.error(`[measure-size] Error: ${error.message}`);
    process.exit(1);
  }
}
