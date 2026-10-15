import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { validateBuildSettings } from './scripts/build-settings.mjs';

// Allow only this Codespace's preview host; keep Vite's host protection enabled.
const codespaceHost = process.env.CODESPACE_NAME
  ? `${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'}`
  : null;

// The @ alias points to src/. Production builds are static files in dist/.
export default defineConfig(({ command, mode }) => {
  if (command === 'build') validateBuildSettings(loadEnv(mode, process.cwd(), 'VITE_'));
  return {
    plugins: [react()],
    server: { allowedHosts: codespaceHost ? [codespaceHost] : [] },
    resolve: {
      extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
      alias: { '@': path.resolve(__dirname, './src') },
    },
    build: {
      sourcemap: false,
      target: 'es2020',
    },
  };
});
