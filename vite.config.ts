import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Toda requisição do seu Axios que começar com '/api' será capturada aqui
      '/api': {
        // O Vite vai repassar a chamada para o seu Load Balancer na AWS
        target: 'http://api.thianolima.com',
        // Altera o cabeçalho 'Origin' da requisição para o destino da AWS, enganando o CORS
        changeOrigin: true,
        // Remove o prefixo '/api' antes de entregar a requisição para o Spring Boot
        // Assim, '/api/tokens' vira apenas '/tokens' quando chegar na AWS
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})