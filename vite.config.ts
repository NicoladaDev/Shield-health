import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
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
  plugins: [react(), tailwindcss(), productionCspPlugin()],
  server: {
    headers: SECURITY_HEADERS,
  },
  preview: {
    headers: {
      ...SECURITY_HEADERS,
      'Content-Security-Policy': `${PRODUCTION_CSP}; frame-ancestors 'none'`,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
