import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INITIAL_SCENARIOS } from '../data/scenarios';
import { addBusinessDays, formatPtBrDateTime } from './anpd';
import { calculateTrainingRoi, computeSectorMetrics } from './metrics';
import {
  containsPotentialCpf,
  INPUT_LIMITS,
  isSafeHttpUrl,
  isSafeIdentifier,
  isValidEmailAddress,
  isValidIsoDate,
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
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.test.tsx')
    ) {
      results.push(full);
    }
  }
  return results;
}

describe('OWASP Top 10 & ASVS Security Test Suite', () => {
  it('CWE-1321: blocks __proto__, constructor, prototype, and Object.prototype keys across validators and metrics', () => {
    const maliciousJson = JSON.parse(
      '{"__proto__":{"scenarioId":"__proto__","action":"reported","isCorrect":true,"decidedAt":"2026-11-24T00:00:00.000Z"},"constructor":{"scenarioId":"constructor","action":"reported","isCorrect":true,"decidedAt":"2026-11-24T00:00:00.000Z"},"toString":{"scenarioId":"toString","action":"reported","isCorrect":true,"decidedAt":"2026-11-24T00:00:00.000Z"}}'
    );

    const validated = validateScenarioDecisions(maliciousJson);
    expect(Object.keys(validated)).toHaveLength(0);
    expect(({} as Record<string, unknown>).scenarioId).toBeUndefined();

    expect(isSafeIdentifier('__proto__')).toBe(false);
    expect(isSafeIdentifier('toString')).toBe(false);
    expect(isSafeIdentifier('hasOwnProperty')).toBe(false);
    expect(isSafeIdentifier('lab-critical-result')).toBe(true);

    const protoScenario = validateCustomScenarios([
      {
        id: 'toString',
        sector: 'Laboratório',
        isPhishing: true,
        senderName: 'Teste',
        senderEmail: 'teste@simulado.invalid',
        subject: 'Assunto',
        bodyParagraphs: ['Texto'],
        indicators: [],
      },
    ]);
    expect(protoScenario).toHaveLength(0);

    const sectorMetrics = computeSectorMetrics(
      [
        {
          id: 'toString',
          sector: 'Laboratório',
          isPhishing: true,
          receivedAt: 'Hoje',
          senderName: 'Teste',
          senderEmail: 'teste@simulado.invalid',
          recipientRole: 'Lab',
          subject: 'Teste',
          bodyParagraphs: ['Corpo'],
          relatedCaseTitle: 'Caso',
          relatedCaseSummary: 'Resumo',
          indicators: [],
          learningTakeaway: 'Lição',
        },
      ],
      {}
    );
    expect(sectorMetrics[0].evaluated).toBe(0);
  });

  it('CVE-2021-42574 / CWE-451: strips Unicode Bidi RTLO and C0/C1 control characters', () => {
    const spoofed = 'Relatorio_\u202Efdp.exe\u0000\u0085\u2066\u200F';
    const cleaned = sanitizeText(spoofed, 100);
    expect(cleaned).not.toMatch(/[\u202A-\u202E\u2066-\u2069\u200E\u200F\u0000-\u001F\u007F-\u009F]/);
    expect(cleaned).toBe('Relatorio_ fdp.exe');
  });

  it('CWE-79 & CWE-93: rejects XSS, dangerous URI schemes, and CRLF header injection in email and URL validators', () => {
    const maliciousEmails = [
      'javascript:alert(document.cookie)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      '<script>alert(1)</script>@evil.example',
      'victim@hospital.example\r\nBcc:attacker@evil.example',
      'user"quote@evil.example',
      'user@domain .invalid',
      'a@b',
      `${'a'.repeat(200)}@example.com`,
    ];

    for (const payload of maliciousEmails) {
      expect(isValidEmailAddress(payload)).toBe(false);
    }

    for (const dangerousUrl of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'blob:https://evil.example/123',
    ]) {
      expect(isSafeHttpUrl(dangerousUrl)).toBe(false);
    }

    expect(isSafeHttpUrl('https://portal.hospitalcentral.org.br/login')).toBe(true);

    const customWithJsUrl = validateCustomScenarios([
      {
        id: 'custom-xss-url',
        sector: 'Recepção',
        isPhishing: true,
        senderName: 'Teste',
        senderEmail: 'teste@dominio-simulado.invalid',
        subject: 'Campanha segura',
        bodyParagraphs: ['Mensagem de teste'],
        ctaLabel: 'Clicar',
        ctaActualUrl: 'javascript:alert(document.domain)',
        indicators: [],
      },
    ]);
    expect(customWithJsUrl).toHaveLength(1);
    expect(customWithJsUrl[0].ctaActualUrl).toBeUndefined();
  });

  it('CWE-400 & CWE-835: enforces bounds on storage, loops, dates, and numeric calculations', () => {
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
      senderEmail: 'teste@dominio-simulado.invalid',
      subject: `Campanha ${i}`,
      bodyParagraphs: ['Mensagem de teste'],
      indicators: [],
    }));

    expect(validateCustomScenarios(floodScenarios)).toHaveLength(
      INPUT_LIMITS.MAX_CUSTOM_SCENARIOS
    );

    expect(isValidIsoDate('1')).toBe(false);
    expect(isValidIsoDate('2026-11-24T00:00:00.000Z')).toBe(true);
    expect(formatPtBrDateTime('invalid-date')).toBe('Data inválida');
    expect(
      addBusinessDays(new Date('2026-11-24T10:00:00Z'), Number.POSITIVE_INFINITY)
    ).toBeInstanceOf(Date);

    const nanRoi = calculateTrainingRoi(Number.NaN, Number.POSITIVE_INFINITY);
    expect(Number.isFinite(nanRoi.annualTrainingCostBrl)).toBe(true);
    expect(Number.isFinite(nanRoi.costRatioTimesCheaper)).toBe(true);
  });

  it('LGPD Privacy by Design: detects CPF variations and blocks CPF persistence in incidents and campaigns', () => {
    expect(containsPotentialCpf('Relato normal sem dados pessoais')).toBe(false);
    expect(containsPotentialCpf('Protocolo SHH-2026-0001')).toBe(false);
    expect(containsPotentialCpf('CPF do paciente: 111.444.777-35')).toBe(true);
    expect(containsPotentialCpf('Documento 98765432100 anexado')).toBe(true);
    expect(containsPotentialCpf('id_111.444.777-35')).toBe(true);
    expect(containsPotentialCpf('CPF 111 444 777 35')).toBe(true);
    expect(containsPotentialCpf('CPF 111.444.777/35')).toBe(true);

    expect(
      validateIncidents([
        {
          id: 'inc-cpf',
          protocol: 'SHH-2026-0099',
          reportedAt: '2026-11-24T00:00:00.000Z',
          sector: 'Recepção',
          channel: 'E-mail de phishing',
          summary: 'Paciente CPF 111.444.777-35 exposto',
          involvesSensitiveHealthData: true,
          status: 'Em triagem TI',
          source: 'manual',
          checklist: {
            containedAccess: false,
            assessedPatientData: false,
            notifiedDpo: false,
            preparedAnpdNotice: false,
          },
        },
      ])
    ).toEqual([]);

    // B1: senderEmail containing CPF must also be rejected
    expect(
      validateCustomScenarios([
        {
          id: 'custom-sender-cpf',
          sector: 'Recepção',
          isPhishing: true,
          senderName: 'Teste',
          senderEmail: '11144477735@dominio-simulado.invalid',
          subject: 'Campanha teste',
          bodyParagraphs: ['Mensagem normal'],
          indicators: [],
        },
      ])
    ).toEqual([]);
  });

  it('RFC 2606 Gate: ensures synthetic simulation lure domains use .invalid or .example', () => {
    for (const scenario of INITIAL_SCENARIOS) {
      const senderDomain = scenario.senderEmail.split('@')[1]?.toLowerCase() ?? '';
      if (senderDomain !== 'hospitalcentral.org.br') {
        expect(
          senderDomain.endsWith('.invalid') || senderDomain.endsWith('.example'),
          `Non-reserved sender domain ${senderDomain} in scenario ${scenario.id}`
        ).toBe(true);
      }

      if (scenario.ctaActualUrl) {
        const hostname = new URL(scenario.ctaActualUrl).hostname.toLowerCase();
        expect(
          hostname.endsWith('.invalid') || hostname.endsWith('.example'),
          `Non-reserved CTA domain ${hostname} in scenario ${scenario.id}`
        ).toBe(true);
      }
    }
  });

  it('SAST Gate: verifies zero dangerous DOM sinks, inline styles, or hardcoded secrets in application source', () => {
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
      /\bstyle=\{\{/,
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

  it('CSP & Security Headers Gate: enforces offline local fonts, strict production CSP, dev CSP, and HTTP framing headers (QA-M14)', () => {
    const indexHtml = readFileSync(join(PROJECT_ROOT, 'index.html'), 'utf8');
    const viteConfig = readFileSync(join(PROJECT_ROOT, 'vite.config.ts'), 'utf8');
    const vercelConfig = readFileSync(join(PROJECT_ROOT, 'vercel.json'), 'utf8');

    expect(indexHtml).not.toContain('fonts.googleapis.com');
    expect(indexHtml).not.toContain('fonts.gstatic.com');
    expect(viteConfig).not.toContain('fonts.googleapis.com');
    expect(viteConfig).not.toContain('fonts.gstatic.com');
    expect(vercelConfig).not.toContain('fonts.googleapis.com');
    expect(vercelConfig).not.toContain('fonts.gstatic.com');

    const prodCspMatch = viteConfig.match(
      /const PRODUCTION_CSP = \[([\s\S]*?)\]\.join\('; '\);/
    );
    expect(prodCspMatch).not.toBeNull();
    const prodCspBlock = prodCspMatch?.[1] ?? '';

    expect(prodCspBlock).not.toContain("'unsafe-inline'");
    expect(prodCspBlock).not.toContain("'unsafe-eval'");
    expect(vercelConfig).not.toContain("'unsafe-inline'");
    expect(vercelConfig).not.toContain("'unsafe-eval'");

    for (const directive of [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      'upgrade-insecure-requests',
    ]) {
      expect(prodCspBlock).toContain(directive);
      expect(vercelConfig).toContain(directive);
    }

    // QA-M14: frame-ancestors & X-Frame-Options must be enforced in HTTP response headers (server/preview/vercel), not <meta> CSP
    expect(prodCspBlock).not.toContain('frame-ancestors');
    // DX-5: assetsInlineLimit: 0 prevents Vite from inlining .woff2 subsets as data:font/ URIs under font-src 'self'
    expect(viteConfig).toMatch(/assetsInlineLimit\s*:\s*0/);
    expect(viteConfig).toContain('server:');
    expect(viteConfig).toContain('DEV_CSP');
    expect(viteConfig).toContain("'Content-Security-Policy': DEV_CSP");
    expect(viteConfig).toContain("frame-ancestors 'none'");
    expect(viteConfig).toContain('Cross-Origin-Opener-Policy');
    expect(viteConfig).toContain('Cross-Origin-Resource-Policy');
    expect(vercelConfig).toContain("frame-ancestors 'none'");
    expect(vercelConfig).toContain('Cross-Origin-Opener-Policy');
    expect(vercelConfig).toContain('Cross-Origin-Resource-Policy');
    expect(vercelConfig).toContain('Strict-Transport-Security');
    expect(vercelConfig).toContain('X-Content-Type-Options');
    expect(vercelConfig).toContain('X-Frame-Options');
  });

  it('CI/CD & Supply Chain Gate: verifies SHA-pinned GitHub Actions, official HTTPS npm registry, and SHA-512 integrity', () => {
    const ciWorkflow = readFileSync(
      join(PROJECT_ROOT, '.github', 'workflows', 'ci.yml'),
      'utf8'
    );
    const usesMatches = [...ciWorkflow.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)];
    expect(usesMatches.length).toBeGreaterThan(0);
    for (const [, actionRef] of usesMatches) {
      expect(
        actionRef,
        `GitHub Action ${actionRef} must be pinned to a 40-char commit SHA`
      ).toMatch(/^[^@]+@[0-9a-f]{40}$/);
    }
    expect(ciWorkflow).toContain('persist-credentials: false');

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
