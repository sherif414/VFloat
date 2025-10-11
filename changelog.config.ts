import type { ChangelogConfig } from "changelogen"

// Changelogen configuration for VFloat
export default <Partial<ChangelogConfig>>{
  // Explicitly set the repository (auto-detected from git if omitted)
  repo: "github:sherif414/VFloat",

  // Output changelog file (kept default path)
  output: "CHANGELOG.md",

  // Keep release commit/tag format consistent with existing release-it style
  templates: {
    commitMessage: "chore: release v{{newVersion}}",
    tagMessage: "v{{newVersion}}",
    tagBody: "v{{newVersion}}",
  },

  // Avoid leaking author emails if GitHub username resolution fails
  hideAuthorEmail: true,

  // Leave default type sections; can be customized later if needed
  // types: { ... }

  // Optional publish defaults (only used when running with --publish)
  publish: {
    tag: "latest",
    private: false,
    args: [],
  },
};
