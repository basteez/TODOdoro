import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import sqlocal from 'sqlocal/vite';

export default defineConfig({
  // sqlocal({ coi: false }): Cross-Origin Isolation headers are set manually
  // below rather than via the SQLocal plugin, for explicit control over CSP.
  plugins: [tailwindcss(), react(), sqlocal({ coi: false })],
  server: {
    headers: {
      // Cross-Origin Isolation headers — required for OPFS + WASM (architecture D9).
      // Must match production (vercel.json) exactly.
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      // Dev CSP mirrors production with two necessary relaxations:
      //   1. script-src adds 'unsafe-inline' — Vite HMR injects inline <script> tags
      //   2. connect-src is 'self' ws: — Vite HMR uses a WebSocket connection
      // Production CSP (vercel.json) uses script-src 'self' 'wasm-unsafe-eval'
      // and connect-src 'none'. These are the ONLY acceptable dev divergences.
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'", // 'unsafe-inline': Vite HMR inline scripts
        "style-src 'self' 'unsafe-inline'", // Tailwind CSS utility injection
        "img-src 'self' data:",
        "connect-src 'self' ws:", // Vite HMR WebSocket — production uses 'none'
        "frame-src 'none'",
        "worker-src 'self' blob:", // SQLocal Web Worker initialization
      ].join('; '),
    },
  },
});
