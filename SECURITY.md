# Política de Segurança — Shield Health

## Versões Suportadas

| Versão | Suporte de Segurança |
| :--- | :--- |
| `1.x` (branch `main`) | Sim |

## Controles e Testes Registrados (OWASP / CWE / LGPD)

| Referência | Controle Aplicado | Verificação Automatizada |
| :--- | :--- | :--- |
| **OWASP A03 / CWE-79 (XSS)** | Escape nativo JSX, bloqueio de esquemas `javascript:`/`data:`/`vbscript:` e gate SAST contra `innerHTML`/`eval`. | `src/utils/security.test.ts` |
| **OWASP A03 / CWE-93 (CRLF Injection)** | Remoção de caracteres de controle ASCII (C0/C1) e rejeição de quebras de linha em e-mails. | `src/utils/security.test.ts` |
| **CVE-2021-42574 / CWE-451 (RTLO/Bidi)** | Remoção de caracteres Unicode bidirecionais invisíveis (`\u202A-\u202E`, `\u2066-\u2069`) contra falsificação visual de extensões. | `src/utils/security.test.ts` |
| **CWE-1321 (Prototype Pollution)** | Bloqueio explícito de chaves `__proto__`, `constructor` e `prototype` + `Object.defineProperty` na leitura do `localStorage`. | `src/utils/security.test.ts` |
| **CWE-400 (Resource Exhaustion)** | Limites estritos `maxLength` em formulários e teto máximo de coleções no `localStorage`. | `src/utils/security.test.ts` |
| **W3C CSP3 & HTTP Headers** | `script-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`, `HSTS`, `X-Frame-Options: DENY`, `nosniff` e `Referrer-Policy`. | `src/utils/security.test.ts` + inspeção HTTPS |
| **OWASP A06 (Supply Chain)** | `npm audit --audit-level=moderate` no CI + verificação de registro HTTPS oficial e integridade SHA-512 em `package-lock.json`. | `src/utils/security.test.ts` + `.github/workflows/ci.yml` |
| **LGPD / Resolução ANPD nº 15/2024** | Cenários 100% sintéticos, bloqueio preventivo de padrões de CPF (`containsPotentialCpf`) e cálculo de 3 dias úteis. | `src/utils/anpd.test.ts` + `src/utils/security.test.ts` |

## Escopo de Produção (Fora do MVP de Hackathon)

Antes de implantar o sistema em ambiente hospitalar real, implemente:

1. Autenticação corporativa (SSO) com MFA obrigatório.
2. Controle de acesso baseado em papéis (RBAC) no servidor separando colaboradores de gestores de TI e DPO.
3. Persistência criptografada no backend com trilha de auditoria imutável para relatórios à ANPD.

## Como Reportar uma Vulnerabilidade

Não abra issues públicas para falhas de segurança.
Utilize a aba **Security > Advisories > Report a vulnerability** deste repositório no GitHub ou contate os mantenedores diretamente com os passos de reprodução.
