/// <reference types="vite/client" />

declare module "*.css";
declare module "@docsearch/css";
declare module "body-scroll-lock";

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>;
  export default component;
}
