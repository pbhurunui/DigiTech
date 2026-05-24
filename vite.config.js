import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  root: 'DigiTech',
  // Repo Pages deploys under /<repo-name>/, keep dev at '/'.
  base: command === 'build' ? '/DigiTech/' : '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
}))
