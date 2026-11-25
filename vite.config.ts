import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

// CSP exclusiva para servidor de desenvolvimento (vite dev): omite upgrade-insecure-requests
// para suportar http://localhost e permite HMR do Vite/React Refresh apenas localmente.
const DEV_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self' ws: wss:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
};

function productionCspPlugin(): Plugin {
  return {
    name: 'shield-health-production-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const cspMeta = `    <meta http-equiv="Content-Security-Policy" content="${PRODUCTION_CSP}" />`;
      return html.replace(
        '<meta name="referrer" content="strict-origin-when-cross-origin" />',
        `<meta name="referrer" content="strict-origin-when-cross-origin" />\n${cspMeta}`
      );
    },
  };
}

export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 0,
  },
  plugins: [react(), tailwindcss(), productionCspPlugin()],
  server: {
    headers: {
      ...SECURITY_HEADERS,
      'Content-Security-Policy': DEV_CSP,
    },
  },
  preview: {
    headers: {
      ...SECURITY_HEADERS,
      'Content-Security-Policy': `${PRODUCTION_CSP}; frame-ancestors 'none'`,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/test/setupDom.ts'],
  },
});
