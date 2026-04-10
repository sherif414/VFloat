import "../env.js";
import { createApp } from "vue";
import App from "./App.vue";
import "../tailwind.css";

/** Mount the playground app. */
const app = createApp(App);
app.mount("#app");
