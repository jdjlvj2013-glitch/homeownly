import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
export default defineConfig({ root: '/workspace/hvac-app', plugins: [react(), viteSingleFile()], build: { outDir: '/workspace/hvac-app/single', emptyOutDir: true } })
