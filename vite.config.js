import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {

    proxy: {
      '/api/v1': {
        target: 'http://192.168.0.120:8090',
        changeOrigin: true,
      },
    },
  },
})
