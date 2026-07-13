import { defineConfig } from 'cypress'
import react from '@vitejs/plugin-react'

export default defineConfig({
  component: {
    devServer: { framework: 'react', bundler: 'vite', viteConfig: { plugins: [react()] } },
    specPattern: 'src/**/*.cy.{ts,tsx}',
    supportFile: false,
  },
  e2e: { baseUrl: 'http://127.0.0.1:5173' },
  viewportWidth: 390,
  viewportHeight: 844,
  video: false,
})
