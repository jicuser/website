import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { validateBuildSettings } from './scripts/build-settings.mjs';
import { pagePreviews } from './scripts/page-previews.mjs';

// Explicit preview hosts keep Vite's host protection enabled.
const codespaceHost = process.env.CODESPACE_NAME
  ? `${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'}`
  : null;

// The @ alias points to src/. Production builds are static files in dist/.
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'JIC_PUBLIC_PREVIEWS']);
  if (command === 'build') validateBuildSettings(env);
  return {
    plugins: [react(), pagePreviews({ env })],
    server: { allowedHosts: ['terminal.local', ...(codespaceHost ? [codespaceHost] : [])] },
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
