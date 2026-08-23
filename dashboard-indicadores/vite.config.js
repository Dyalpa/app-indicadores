import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path' // 1. Importamos path para manejar las rutas del sistema

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    // 🛠️ Forzamos el uso de una única instancia de React para evitar el error de los Hooks en librerías externas
    dedupe: ['react', 'react-dom'],
    alias: {
      // 2. Definimos que '@' apunte directamente a la carpeta 'src'
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // 🌐 Permite que Vite acepte requests que lleguen con un Host header de
    // Cloudflare Tunnel (por defecto Vite los bloquea como protección anti
    // DNS-rebinding). El wildcard ".trycloudflare.com" cubre cualquier
    // subdominio, ya que los "quick tunnels" generan una URL nueva cada vez
    // que se reinicia `cloudflared` — así no hay que editar esto cada vez.
    allowedHosts: [
      '.trycloudflare.com',
      'fs9xp008-5173.use.devtunnels.ms' // se deja por si vuelves a usar devtunnels
    ],
  },
})