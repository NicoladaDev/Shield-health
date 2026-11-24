import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  containsPotentialCpf,
  INPUT_LIMITS,
  isValidEmailAddress,
  sanitizeText,
  validateCompletedLessons,
  validateCustomScenarios,
  validateIncidents,
  validateScenarioDecisions,
} from './validation';

const PROJECT_ROOT = resolve(__dirname, '..', '..');

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (
      /\.(ts|tsx|html)$/.test(entry) &&
      !entry.endsWith('.test.ts')
    ) {
      results.push(full);
    }
  }
  return results;
}

describe('OWASP Top 10 & ASVS Security Test Suite', () => {
  it('CWE-1321: blocks __proto__, constructor, and prototype pollution in localStorage decisions', () => {
    const maliciousJson = JSON.parse(
      '{"__proto__":{"scenarioId":"__proto__","action":"reported","isCorrect":true,"decidedAt":"2026-11-24T00:00:00.000Z"},"constructor":{"scenarioId":"constructor","action":"reported","isCorrect":true,"decidedAt":"2026-11-24T00:00:00.000Z"},"prototype":{"scenarioId":"prototype","action":"reported","isCorrect":true,"decidedAt":"2026-11-24T00:00:00.000Z"}}'
    );

    const validated = validateScenarioDecisions(maliciousJson);
    expect(Object.keys(validated)).toHaveLength(0);
    expect(({} as Record<string, unknown>).scenarioId).toBeUndefined();
  });

  it('CVE-2021-42574 / CWE-451: strips Unicode Bidi RTLO and C0/C1 control characters', () => {
    const spoofed = 'Relatorio_\u202Efdp.exe\u0000\u0085\u2066\u200F';
    const cleaned = sanitizeText(spoofed, 100);
    expect(cleaned).not.toMatch(/[\u202A-\u202E\u2066-\u2069\u200E\u200F\u0000-\u001F\u007F-\u009F]/);
    expect(cleaned).toBe('Relatorio_ fdp.exe');
  });

  it('CWE-79 & CWE-93: rejects XSS, dangerous URI schemes, and CRLF header injection in email validator', () => {
    const maliciousEmails = [
      'javascript:alert(document.cookie)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      '<script>alert(1)</script>@evil.com',
      'victim@hospital.org\r\nBcc:attacker@evil.com',
      'user@domain .com',
      'a@b',
      `${'a'.repeat(200)}@example.com`,
    ];

    for (const payload of maliciousEmails) {
      expect(isValidEmailAddress(payload)).toBe(false);
    }
  });

  it('CWE-400: enforces upper bounds on storage collections and string lengths (DoS resistance)', () => {
    const hugeString = 'X'.repeat(100_000);
    expect(sanitizeText(hugeString, INPUT_LIMITS.INCIDENT_SUMMARY)).toHaveLength(
      INPUT_LIMITS.INCIDENT_SUMMARY
    );

    const floodIncidents = Array.from({ length: 250 }, (_, i) => ({
      id: `inc-${i}`,
      protocol: `SHH-2026-${String(i).padStart(4, '0')}`,
      reportedAt: '2026-11-24T00:00:00.000Z',
      sector: 'Laboratório',
      channel: 'E-mail de phishing',
      summary: 'Teste de limite de fila',
      involvesSensitiveHealthData: true,
      status: 'Em triagem TI',
      source: 'manual',
      checklist: {
        containedAccess: false,
        assessedPatientData: false,
        notifiedDpo: false,
        preparedAnpdNotice: false,
      },
    }));

    const validatedIncidents = validateIncidents(floodIncidents);
    expect(validatedIncidents).toHaveLength(INPUT_LIMITS.MAX_INCIDENTS);

    const floodScenarios = Array.from({ length: 50 }, (_, i) => ({
      id: `custom-${i}`,
      sector: 'Recepção',
      isPhishing: true,
      senderName: 'Teste',
      senderEmail: 'teste@dominio-simulado.com',
      subject: `Campanha ${i}`,
      bodyParagraphs: ['Mensagem de teste'],
      indicators: [],
    }));

    expect(validateCustomScenarios(floodScenarios)).toHaveLength(
      INPUT_LIMITS.MAX_CUSTOM_SCENARIOS
    );
  });

  it('LGPD Privacy by Design: detects formatted and unformatted CPF strings inside free text', () => {
    expect(containsPotentialCpf('Relato normal sem dados pessoais')).toBe(false);
    expect(containsPotentialCpf('Protocolo SHH-2026-0001')).toBe(false);
    expect(containsPotentialCpf('CPF do paciente: 111.222.333-44')).toBe(true);
    expect(containsPotentialCpf('Documento 98765432100 anexado')).toBe(true);
  });

  it('SAST Gate: verifies zero dangerous DOM sinks or hardcoded secrets in application source', () => {
    const files = [
      ...collectSourceFiles(join(PROJECT_ROOT, 'src')),
      join(PROJECT_ROOT, 'index.html'),
    ];

    const forbiddenSinks = [
      /dangerouslySetInnerHTML/,
      /\.innerHTML\s*=/,
      /\.outerHTML\s*=/,
      /insertAdjacentHTML\s*\(/,
      /document\.write\s*\(/,
      /\beval\s*\(/,
      /new\s+Function\s*\(/,
      /target="_blank"(?![^>]*rel="noopener noreferrer")/,
    ];

    const secretPatterns = [
      /ghp_[A-Za-z0-9]{30,}/,
      /github_pat_[A-Za-z0-9_]{30,}/,
      /AIza[0-9A-Za-z\-_]{35}/,
      /AKIA[0-9A-Z]{16}/,
      /BEGIN [A-Z ]*PRIVATE KEY/,
    ];

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      for (const pattern of forbiddenSinks) {
        expect(content, `Forbidden sink ${pattern} in ${file}`).not.toMatch(
          pattern
        );
      }
      for (const secret of secretPatterns) {
        expect(content, `Hardcoded secret ${secret} in ${file}`).not.toMatch(
          secret
        );
      }
    }
  });

  it('CSP & Security Headers Gate: verifies strict directives in vite.config.ts and vercel.json', () => {
    const viteConfig = readFileSync(join(PROJECT_ROOT, 'vite.config.ts'), 'utf8');
    const vercelConfig = readFileSync(join(PROJECT_ROOT, 'vercel.json'), 'utf8');

    for (const directive of [
      "default-src 'self'",
      "script-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      'upgrade-insecure-requests',
    ]) {
      expect(viteConfig).toContain(directive);
      expect(vercelConfig).toContain(directive);
    }

    expect(vercelConfig).toContain('Strict-Transport-Security');
    expect(vercelConfig).toContain('X-Content-Type-Options');
    expect(vercelConfig).toContain('X-Frame-Options');
  });

  it('Supply Chain Gate: verifies all resolved npm packages use official HTTPS registry and SHA-512', () => {
    const lock = JSON.parse(
      readFileSync(join(PROJECT_ROOT, 'package-lock.json'), 'utf8')
    ) as {
      packages?: Record<string, { resolved?: string; integrity?: string; optional?: boolean }>;
    };

    const entries = Object.entries(lock.packages ?? {}).filter(([k]) => k !== '');
    expect(entries.length).toBeGreaterThan(0);

    for (const [name, meta] of entries) {
      if (meta.resolved) {
        expect(
          meta.resolved.startsWith('https://registry.npmjs.org/'),
          `Non-official registry for ${name}`
        ).toBe(true);
      }
      if (meta.resolved && !meta.optional) {
        expect(
          meta.integrity?.startsWith('sha512-'),
          `Missing SHA-512 integrity for ${name}`
        ).toBe(true);
      }
    }

    expect(validateCompletedLessons(['unknown'], new Set())).toEqual([]);
  });
});
