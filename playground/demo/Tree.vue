<script setup lang="ts">
import { ref, computed, watch, shallowRef } from "vue"
import { useFloatingTree } from "@/composables/use-floating-tree"

const tree = useFloatingTree({} as any)

const nodeParent1 = tree.addNode({} as any)
const nodeParent2 = tree.addNode({} as any)

const nodeChild1 = tree.addNode({} as any, nodeParent1.id)
const nodeChild2 = tree.addNode({} as any, nodeParent1.id)

const nodeChild3 = tree.addNode({} as any, nodeParent2.id)
const nodeChild4 = tree.addNode({} as any, nodeParent2.id)

console.log("dfs: ", tree.traverse("dfs"))
console.log("bfs: ", tree.traverse("bfs"))
</script>

<template>
  <div>hello world</div>
</template>
