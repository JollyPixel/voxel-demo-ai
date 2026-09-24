import { defineConfig } from 'vite';
export default defineConfig({
  server: {
    allowedHosts: true
  },
  resolve: { dedupe: ['three'] }
});
