export default defineAppConfig({
  header: {
    title: "VFloat",
    logo: {
      light: "/vfloat-mark.svg",
      dark: "/vfloat-mark.svg",
      alt: "VFloat",
    },
  },

  navigation: {
    sub: "header",
  },

  socials: {
    github: "https://github.com/sherif414/VFloat",
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
    pageHero: {
      slots: {
        container: "pt-10 pb-4 sm:pt-16 sm:pb-6 gap-6 sm:gap-y-8",
        title: "text-4xl sm:text-6xl font-bold tracking-tight text-highlighted text-balance",
        description: "text-base sm:text-lg text-muted text-balance mt-3 sm:mt-4",
      },
    },
  },
});
