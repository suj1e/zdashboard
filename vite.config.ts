import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    port: 5175,
    proxy: {
      '/__files': 'http://localhost:4190',
      '/__reload': { target: 'http://localhost:4190', ws: false },
      '/__config': 'http://localhost:4190',
      '/__stop': 'http://localhost:4190',
      '/__detect': 'http://localhost:4190',
      '/__just': 'http://localhost:4190',
      '/__design': 'http://localhost:4190',
      '/__plugins': 'http://localhost:4190',
      '/__stats': 'http://localhost:4190',
      '/__worktrees': 'http://localhost:4190',
      '/__file-content': 'http://localhost:4190',
    },
  },
  build: { outDir: 'dist/web' },
});
