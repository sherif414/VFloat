import { readFileSync } from "node:fs";

const version = process.argv[2];

if (!version) {
  fail("Missing release version.");
}

const changelog = readFileSync("CHANGELOG.md", "utf8");
const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const headingPattern = new RegExp(`^#{1,3} \\[?v?${escapedVersion}\\]?\\b.*$`, "m");
const headingMatch = changelog.match(headingPattern);

if (!headingMatch || headingMatch.index === undefined) {
  fail(`Could not find CHANGELOG.md entry for ${version}.`);
}

const start = headingMatch.index;
const rest = changelog.slice(start);
const nextHeadingMatch = rest
  .slice(headingMatch[0].length)
  .match(/\n#{1,3} \[?\d+\.\d+\.\d+\]?\b/m);
const end =
  nextHeadingMatch?.index !== undefined
    ? headingMatch[0].length + nextHeadingMatch.index
    : rest.length;

const notes = rest.slice(0, end).trim();

if (!notes) {
  fail(`CHANGELOG.md entry for ${version} is empty.`);
}

console.log(notes);

function fail(message) {
  console.error(`[release-notes] ${message}`);
  process.exit(1);
}
