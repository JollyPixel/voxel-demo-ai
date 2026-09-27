import { defineConfig } from 'vite';

// Mesh workers read chunk storage through SharedArrayBuffer, which needs a
// cross-origin isolated page.
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp'
};

export default defineConfig({
  server: {
    allowedHosts: true,
    headers: crossOriginIsolation
  },
  preview: {
    headers: crossOriginIsolation
  },
  worker: {
    format: 'es'
  },
  resolve: { dedupe: ['three'] }
});
