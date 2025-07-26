<script setup lang="ts">
// import Menu from "./components/Menu.vue"
// import SubMenu from "./components/SubMenu.vue"
// import MenuItem from "./components/MenuItem.vue"
// import MenuTrigger from "./components/MenuTrigger.vue"
// import MenuDropdown from "./components/MenuDropdown.vue"
// import Tooltip from "./demo/Tooltip.vue"
import ArrowDemo from "./demo/ArrowDemo.vue"
// import DemoContainer from "./demo/DemoContainer.vue"
import { TwentyFirstToolbar } from "@21st-extension/toolbar-vue"
import { VuePlugin } from "@21st-extension/vue"
import TreeInteractionsDemo from "./demo/TreeInteractionsDemo.vue"

const toolbarConfig = {
  plugins: [VuePlugin],
}
</script>

<template>
  <!-- <TwentyFirstToolbar :config="toolbarConfig" /> -->
  <TreeInteractionsDemo />
</template>
