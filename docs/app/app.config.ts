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
});
