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
  build: {
    outDir: 'dist/web',
    rollupOptions: {
      output: {
        // vendor 拆块:react 系一块、radix+sonner 一块、excalidraw 一块,其余默认(懒 chunk 不动)。
        // 注意用锚定 node_modules/<pkg>/ 的正则,防止 react-is/.pnpm 路径误入。
        // excalidraw 仅被 DiagramViewer 动态 import:此处只定名,不影响懒加载性质。
        // preload-helper 必须显式钉回入口块:否则 rollup 会把它归进首个手动块(曾致入口
        // 静态 import excalidraw 块,1.7MB 变 eager)。
        manualChunks(id) {
          if (id.includes('vite/preload-helper')) return 'index';
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          if (/[\\/]node_modules[\\/](@radix-ui[\\/][^\\/]+|sonner)[\\/]/.test(id)) return 'vendor-ui';
          if (/[\\/]node_modules[\\/]@excalidraw[\\/]excalidraw[\\/]/.test(id)) return 'excalidraw';
          return undefined;
        },
      },
    },
  },
});
