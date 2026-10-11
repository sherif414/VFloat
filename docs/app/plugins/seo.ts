export default defineNuxtPlugin(() => {
  const appConfig = useAppConfig();
  (appConfig.seo as { titleTemplate?: unknown }).titleTemplate = (title?: string) =>
    title && title !== "VFloat" ? `${title} · VFloat` : "VFloat";
});
