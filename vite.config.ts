import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import react from '@vitejs/plugin-react-swc'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [tsconfigPaths(), react(), TanStackRouterVite()],
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      format: {
        comments: false,
      },
    },
  },
})
