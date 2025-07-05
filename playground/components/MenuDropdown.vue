<script setup lang="ts">
import type { UseFloatingTreeReturn } from "@/composables"
import { inject, ref } from "vue"

const menuId = inject<string>("currentMenuId")
const tree = inject<UseFloatingTreeReturn>("floatingTree")

if (!tree || !menuId) {
  throw new Error("no menu parent found")
}

const node = tree.findNodeById(menuId)
const floatingEl = node?.data.refs.floatingEl ?? ref(null)
</script>

<template>
  <div
    ref="floatingEl"
    :style="{ ...node?.data.floatingStyles.value }"
    v-if="node?.data.open.value"
    :id="`menu-panel-${node.id}`"
    class="menu-panel flex flex-col items-start"
    role="menu"
    aria-labelledby="menu-trigger-button"
  >
    <slot></slot>
  </div>
</template>
