import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [tsconfigPaths(), react(), TanStackRouterVite()],
  resolve: {
    extensions: ['.ts', '.tsx', '.mts', '.mjs', '.js', '.jsx', '.json'],
  },
  build: {
    target: 'esnext',
    minify: 'oxc',
    terserOptions: {
      format: {
        comments: false,
      },
    },
  },
})
