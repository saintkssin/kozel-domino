import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@kozel/shared': path.resolve(__dirname, '../shared/src/types.ts') },
  },
  server: { proxy: { '/socket.io': { target: 'http://localhost:3001', ws: true } } },
});
