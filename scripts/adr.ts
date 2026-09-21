import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

type NewAdrOptions = {
  group: string;
  title: string;
  dryRun: boolean;
};

type AdrRecord = {
  date: string;
  group: string;
  number: number;
  path: string;
  status: string;
  title: string;
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repositoryDir = dirname(scriptDir);
const adrDir = join(repositoryDir, "ADR");
const templatePath = join(adrDir, "_template.md");
const indexPath = join(adrDir, "README.md");
const indexStart = "<!-- adr-index:start -->";
const indexEnd = "<!-- adr-index:end -->";

const command = process.argv[2] ?? "help";

const options = {
  group: { type: "string" },
  title: { type: "string" },
  "dry-run": { type: "boolean", default: false },
} as const;

function showHelp() {
  console.log(`Usage:
  pnpm adr:new -- --group <group> --title <title>
  pnpm adr:index

Options for adr:new:
  --group <group>   Technical area, for example architecture
  --title <title>   Decision title
  --dry-run         Show the destination without creating a file`);
}

/** Converts a decision title into a stable filename segment. */
function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** Turns a kebab-case directory name into a readable index heading. */
function formatGroupTitle(group: string): string {
  return group.replace(/-/g, " ").replace(/^./, (character) => character.toUpperCase());
}

/** Reads one simple frontmatter field from an ADR document. */
function parseMetadata(content: string, field: "date" | "status"): string {
  const match = content.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

/** Reads the document title used in the generated index. */
function parseTitle(content: string): string {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "Untitled ADR";
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Collects grouped ADR metadata for the generated index. */
async function collectRecords(): Promise<AdrRecord[]> {
  if (!(await pathExists(adrDir))) {
    return [];
  }

  const groups = await readdir(adrDir, { withFileTypes: true });
  const records: AdrRecord[] = [];

  for (const groupEntry of groups) {
    if (!groupEntry.isDirectory() || groupEntry.name.startsWith(".")) {
      continue;
    }

    const groupDir = join(adrDir, groupEntry.name);
    const files = await readdir(groupDir, { withFileTypes: true });

    for (const fileEntry of files) {
      if (!fileEntry.isFile() || extname(fileEntry.name) !== ".md") {
        continue;
      }

      const match = fileEntry.name.match(/^(\d+)-.+\.md$/);
      if (!match) {
        continue;
      }

      const filePath = join(groupDir, fileEntry.name);
      const content = await readFile(filePath, "utf8");

      records.push({
        date: parseMetadata(content, "date"),
        group: groupEntry.name,
        number: Number(match[1]),
        path: `./${relative(adrDir, filePath).split("\\").join("/")}`,
        status: parseMetadata(content, "status") || "unknown",
        title: parseTitle(content),
      });
    }
  }

  return records.toSorted((left, right) => {
    const groupOrder = left.group.localeCompare(right.group);
    return groupOrder || left.number - right.number;
  });
}

/** Renders the grouped Markdown tables for the ADR index. */
function renderRecords(records: AdrRecord[]): string {
  if (records.length === 0) {
    return "No ADRs have been recorded yet.";
  }

  const sections: string[] = [];
  let currentGroup = "";

  for (const record of records) {
    if (record.group !== currentGroup) {
      currentGroup = record.group;
      sections.push(
        `## ${formatGroupTitle(record.group)}\n\n| ADR | Decision | Status | Date |\n| --- | --- | --- | --- |`,
      );
    }

    const id = `ADR-${record.group}-${String(record.number).padStart(4, "0")}`;
    sections.push(
      `| [${id}](${record.path}) | ${record.title} | ${record.status} | ${record.date || ""} |`,
    );
  }

  return sections.join("\n");
}

/** Replaces only the generated section while preserving the README introduction. */
async function updateIndex(): Promise<void> {
  const records = await collectRecords();
  const current = (await pathExists(indexPath))
    ? await readFile(indexPath, "utf8")
    : "# Architecture decision records";
  const start = current.indexOf(indexStart);
  const end = current.indexOf(indexEnd);
  const prefix = (start === -1 ? current : current.slice(0, start)).trimEnd();
  const suffix = end === -1 ? "" : current.slice(end + indexEnd.length).trim();
  const generated = renderRecords(records);
  const trailingContent = suffix ? `\n\n${suffix}` : "";

  await writeFile(indexPath, `${prefix}\n\n${indexStart}\n\n${generated}\n\n${indexEnd}${trailingContent}\n`, "utf8");
}

/** Validates and normalizes command-line input before creating an ADR. */
function parseNewAdrOptions(): NewAdrOptions {
  const { values } = parseArgs({ args: process.argv.slice(3), options, strict: true });
  const group = values.group?.trim();
  const title = values.title?.trim();

  if (!group || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(group)) {
    throw new Error("Provide a lowercase kebab-case group with --group.");
  }

  if (!title) {
    throw new Error("Provide a decision title with --title.");
  }

  return {
    dryRun: values["dry-run"],
    group,
    title,
  };
}

/** Creates one ADR and refreshes the grouped index. */
async function createAdr({ dryRun, group, title }: NewAdrOptions): Promise<void> {
  const slug = slugify(title);
  if (!slug) {
    throw new Error("The title must contain at least one letter or number.");
  }

  const groupDir = join(adrDir, group);
  await mkdir(groupDir, { recursive: true });
  const files = await readdir(groupDir, { withFileTypes: true });
  const numbers = files
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name.match(/^(\d+)-.+\.md$/)?.[1])
    .filter(Boolean)
    .map(Number);
  const number = Math.max(0, ...numbers) + 1;
  const fileName = `${String(number).padStart(4, "0")}-${slug}.md`;
  const filePath = join(groupDir, fileName);
  const date = new Date().toISOString().slice(0, 10);

  if (dryRun) {
    console.log(`Would create ${relative(repositoryDir, filePath)}`);
    return;
  }

  const template = await readFile(templatePath, "utf8");
  const content = template.replaceAll("{{DATE}}", date).replaceAll("{{TITLE}}", title);

  await writeFile(filePath, content, { encoding: "utf8", flag: "wx" });
  await updateIndex();
  console.log(`Created ${relative(repositoryDir, filePath)}`);
}

async function main(): Promise<void> {
  if (command === "help" || command === "--help" || command === "-h") {
    showHelp();
    return;
  }

  if (command === "index") {
    await mkdir(adrDir, { recursive: true });
    await updateIndex();
    console.log(`Updated ${relative(repositoryDir, indexPath)}`);
    return;
  }

  if (command === "new") {
    await createAdr(parseNewAdrOptions());
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

try {
  await main();
} catch (error) {
  console.error(`[adr] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
