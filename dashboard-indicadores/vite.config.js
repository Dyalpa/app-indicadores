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
})