import DefaultTheme from "vitepress/theme"
import { AntDesignContainer } from "@vitepress-demo-preview/component"
import TwoslashFloatingVue from "@shikijs/vitepress-twoslash/client"
import CustomHome from "../components/CustomHome.vue"
import DemoPreview from "../components/demo/DemoPreview.vue"
import "@shikijs/vitepress-twoslash/style.css"
// import "@vitepress-demo-preview/component/dist/style.css"
import "virtual:uno.css"
import './styles.css'

// Import demo components
import * as Demos from "../../demos/index"
import { h } from "vue"

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component("demo-container", DemoPreview)
    app.use(TwoslashFloatingVue)

    // Register all demo components globally
    for (const [name, component] of Object.entries(Demos)) {
      app.component(name, component)
    }
  },
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-before': () => h(CustomHome)
    })}
}
