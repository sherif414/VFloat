import DefaultTheme from "vitepress/theme"
import { AntDesignContainer } from "@vitepress-demo-preview/component"
import TwoslashFloatingVue from "@shikijs/vitepress-twoslash/client"
import "@shikijs/vitepress-twoslash/style.css"
import "@vitepress-demo-preview/component/dist/style.css"
import "virtual:uno.css"
import './styles.css'

// Import demo components
import * as UseFloatingDemos from "../../demos/use-floating"

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component("demo-preview", AntDesignContainer)

    // Register all demo components globally
    for (const [name, component] of Object.entries(UseFloatingDemos)) {
      app.use(TwoslashFloatingVue)
      app.component(name, component)
    }
  },
}
