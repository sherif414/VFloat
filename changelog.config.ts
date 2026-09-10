import type { ChangelogConfig } from "changelogen";

// Changelogen configuration for VFloat
export default <Partial<ChangelogConfig>>{
  // Explicitly set the repository (auto-detected from git if omitted)
  repo: "github:sherif414/VFloat",

  // Output changelog file (kept default path)
  output: "CHANGELOG.md",

  // Generate changelog from the last tag to current HEAD
  // This helps when running manually to see what would be in the next release
  from: "", // Will be auto-detected to the latest tag
  to: "HEAD",

  // Keep release commit/tag format consistent with existing release-it style
  templates: {
    commitMessage: "chore: release v{{newVersion}}",
    tagMessage: "v{{newVersion}}",
    tagBody: "v{{newVersion}}",
  },

  // Avoid leaking author emails if GitHub username resolution fails
  hideAuthorEmail: true,

  // Only render user-facing types. All other types are explicitly disabled
  // because c12 deep-merges config and would otherwise keep defaults.
  types: {
    feat: { title: "🚀 Enhancements", semver: "minor" },
    fix: { title: "🩹 Fixes", semver: "patch" },
    perf: { title: "🔥 Performance", semver: "patch" },
    refactor: false,
    docs: false,
    build: false,
    types: false,
    chore: false,
    examples: false,
    test: false,
    style: false,
    ci: false,
  },

  // Optional publish defaults (only used when running with --publish)
  publish: {
    tag: "latest",
    private: false,
    args: [],
  },
};
