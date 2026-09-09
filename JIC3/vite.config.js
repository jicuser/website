import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Production-safe Vite config. All Hostinger Horizons editor/runtime plugins were
// intentionally removed so this repository is now a normal React/Vite app.
export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    sourcemap: false,
    target: 'es2020',
  },
});
