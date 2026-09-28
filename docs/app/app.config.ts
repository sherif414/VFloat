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
        container: "flex flex-col items-center pt-8 pb-2 sm:pt-12 sm:pb-4 gap-5 sm:gap-6",
        wrapper: "max-w-3xl mx-auto text-center",
        title:
          "text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-highlighted text-balance",
        description:
          "text-base sm:text-lg text-muted text-balance mt-3 sm:mt-4 max-w-2xl mx-auto leading-relaxed",
        footer: "mt-6 sm:mt-7",
        links: "flex flex-wrap gap-3 sm:gap-3.5 justify-center",
      },
    },
  },
});
