import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  extends: ['docus'],
  alias: {
    'v-float': fileURLToPath(new URL('../src', import.meta.url)),
  },
})
