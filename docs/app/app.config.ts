export default defineAppConfig({
  header: {
    title: "VFloat",
  },

  navigation: {
    sub: "header",
  },

  search: {
    fts: true,
  },

  socials: {
    github: "https://github.com/sherif414/VFloat",
  },

  github: {
    url: "https://github.com/sherif414/VFloat",
    branch: "main",
    rootDir: "docs",
  },

  toc: {
    title: "On this page",
  },

  seo: {
    title: "VFloat",
    titleTemplate: "%s · VFloat",
    description: "A headless, primitive floating library for Vue 3",
  },

  ui: {
    colors: {
      primary: "white",
      neutral: "zinc",
      tertiary: "tertiary",
    },
    pageHero: {
      slots: {
        container: "flex flex-col items-center pt-8 pb-2 sm:pt-12 sm:pb-4 gap-5 sm:gap-6",
        wrapper: "max-w-3xl mx-auto text-center",
        title:
          "text-3xl sm:text-4xl lg:text-[64px] font-bold tracking-tight text-highlighted text-balance",
        description:
          "text-[14px] sm:text-[15px] text-muted text-balance mt-3 sm:mt-4 max-w-xl mx-auto leading-relaxed",
        footer: "mt-6 sm:mt-7",
        links: "flex flex-wrap gap-2.5 sm:gap-3 justify-center",
      },
    },
    pageHeader: {
      slots: {
        root: "relative border-b border-default py-6",
        headline: "mb-2 text-xs font-semibold text-tertiary flex items-center gap-1.5",
        title: "text-2xl sm:text-[28px] text-pretty font-medium text-highlighted tracking-tight",
        description: "text-[14px] leading-relaxed text-pretty text-muted",
      },
    },
    contentNavigation: {
      defaultVariants: {
        highlightColor: "tertiary",
      },
      slots: {
        trigger: "text-[12px] font-semibold text-highlighted/90 py-1.5 flex items-center gap-2",
        link: "group relative w-full px-2.5 py-1.5 before:inset-y-px before:inset-x-0 flex items-center gap-2 text-[13px] leading-normal text-muted hover:text-highlighted before:absolute before:z-[-1] before:rounded-md focus:outline-none focus-visible:outline-none focus-visible:before:outline-3",
        linkLeadingIcon: "shrink-0 size-4 text-muted group-hover:text-highlighted",
        linkTrailingIcon:
          "size-3.5 text-dimmed group-hover:text-muted transform transition-transform duration-200 ease-out motion-reduce:transition-none shrink-0 group-data-[state=open]:rotate-180",
      },
    },
    contentToc: {
      defaultVariants: {
        highlightColor: "tertiary",
      },
      slots: {
        trigger:
          "group text-[13px] font-medium text-muted flex-1 flex items-center gap-1.5 py-1 -mt-1.5 rounded-sm outline-primary/25 focus-visible:outline-3 lg:shrink-0",
        link: "group relative text-[13px] leading-5 text-muted hover:text-highlighted flex items-center rounded-sm outline-primary/25 focus-visible:outline-3 py-1 transition-colors",
      },
    },
    prose: {
      p: {
        base: "my-3 text-[14px] leading-relaxed text-pretty",
      },
      h1: {
        slots: {
          base: "text-4xl sm:text-[28px] text-highlighted font-medium mb-5 tracking-tight scroll-mt-[calc(45px+var(--ui-header-height))] lg:scroll-mt-(--ui-header-height)",
        },
      },
      h2: {
        slots: {
          base: [
            "relative text-[28px] text-highlighted font-medium mt-9 mb-3 tracking-tight scroll-mt-[calc(48px+45px+var(--ui-header-height))] lg:scroll-mt-[calc(48px+var(--ui-header-height))] [&>a]:rounded-sm [&>a]:outline-primary/25 [&>a]:focus-visible:outline-3 [&>a>code]:border-dotted hover:[&>a>code]:border-primary hover:[&>a>code]:text-primary [&>a>code]:text-base/6 [&>a>code]:font-medium",
            "[&>a>code]:transition-colors",
          ],
        },
      },
      h3: {
        slots: {
          base: [
            "relative text-[16px] text-highlighted font-medium mt-7 mb-2 tracking-tight scroll-mt-[calc(32px+45px+var(--ui-header-height))] lg:scroll-mt-[calc(32px+var(--ui-header-height))] [&>a]:rounded-sm [&>a]:outline-primary/25 [&>a]:focus-visible:outline-3 [&>a>code]:border-dotted hover:[&>a>code]:border-primary hover:[&>a>code]:text-primary [&>a>code]:text-sm/5 [&>a>code]:font-medium",
            "[&>a>code]:transition-colors",
          ],
        },
      },
      h4: {
        slots: {
          base: "text-[14px] text-highlighted font-medium mt-5 mb-1.5 scroll-mt-[calc(24px+45px+var(--ui-header-height))] lg:scroll-mt-[calc(24px+var(--ui-header-height))] [&>a]:rounded-sm [&>a]:outline-primary/25 [&>a]:focus-visible:outline-3",
        },
      },
      hr: {
        base: "my-8 border-t border-dotted border-default",
      },
      a: {
        base: "text-highlighted underline decoration-dimmed underline-offset-[3px] transition-colors hover:text-primary hover:decoration-primary",
      },
      strong: {
        base: "font-medium text-highlighted",
      },
      code: {
        base: "px-1.5 py-0.5 text-[12.5px] font-mono font-medium rounded-md inline-block text-(--vf-code-text) bg-(--vf-code-bg) border border-(--vf-code-border) shadow-2xs",
      },
      pre: {
        slots: {
          base: "group font-mono text-[12.5px]/relaxed border border-(--vf-code-border) bg-muted/60 shadow-(--vf-elevation-code) rounded-xl px-4 py-3.5 whitespace-pre-wrap wrap-break-word overflow-x-auto outline-primary/25 focus-visible:outline-3 focus-visible:border-primary **:[.line]:block **:[.line.highlight]:-mx-4 **:[.line.highlight]:px-4 **:[.line.highlight]:bg-accented/50!",
          filename: "text-muted text-xs/5 font-mono",
        },
      },
      li: {
        base: "my-1 ps-1 text-[14px] leading-relaxed [&>ul]:my-0",
      },
    },
  },
});
