export default defineNuxtPlugin(() => {
  const appConfig = useAppConfig();
  (appConfig.seo as { titleTemplate?: unknown }).titleTemplate = (title?: string) =>
    title && title !== "VFloat" ? `${title} · VFloat` : "VFloat";

  useSeoMeta({
    ogImage: "https://vfloat.pages.dev/og-image.png",
    ogImageWidth: 2400,
    ogImageHeight: 1260,
    ogImageType: "image/png",
    ogImageAlt: "VFloat - Headless floating UI primitives for Vue 3",
    twitterImage: "https://vfloat.pages.dev/og-image.png",
    twitterCard: "summary_large_image",
  });
});
