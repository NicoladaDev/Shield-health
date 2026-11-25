# Política de Segurança — Shield Health

## Versões Suportadas

| Versão | Suporte de Segurança |
| :--- | :--- |
| `1.x` (branch `main`) | Sim |

## Controles e Testes Registrados (OWASP / CWE / LGPD)

| Referência | Controle Aplicado | Verificação Automatizada |
| :--- | :--- | :--- |
| **OWASP A03 / CWE-79 (XSS)** | Escape nativo JSX, validação `isSafeHttpUrl` (bloqueio de esquemas `javascript:`/`data:`/`vbscript:`/`file:`) e gate SAST contra `innerHTML`/`eval`/estilos inline. | `src/utils/security.test.ts` |
| **OWASP A03 / CWE-93 (CRLF Injection)** | Remoção de caracteres de controle ASCII (C0/C1) e rejeição de quebras de linha e aspas em e-mails. | `src/utils/security.test.ts` |
| **CVE-2021-42574 / CWE-451 (RTLO/Bidi)** | Remoção de caracteres Unicode bidirecionais invisíveis (`\u202A-\u202E`, `\u2066-\u2069`) contra falsificação visual de extensões. | `src/utils/security.test.ts` |
| **CWE-1321 (Prototype Pollution)** | Validador `isSafeIdentifier` contra chaves de `Object.prototype` (`__proto__`, `constructor`, `toString`, etc.), `Object.hasOwn` e `Object.defineProperty`. | `src/utils/security.test.ts` |
| **CWE-400 / CWE-835 (Resource Exhaustion)** | Limites estritos `maxLength` em formulários, teto de coleções no `localStorage`, teto em loops de dias úteis e sanitização numérica (`NaN`/`Infinity`). | `src/utils/security.test.ts` |
| **W3C CSP3 & HTTP Headers** | Fontes locais empacotadas (`@fontsource-variable/inter` e `@fontsource-variable/jetbrains-mono`), CSP de produção sem `'unsafe-inline'` nem `'unsafe-eval'` (`script-src 'self'`, `style-src 'self'`, `font-src 'self'`, `object-src 'none'`), `HSTS`, `X-Frame-Options: DENY`, `nosniff`, `COOP`, `CORP` e `Referrer-Policy`. Em hospedagens estáticas sem cabeçalhos HTTP customizados (ex.: GitHub Pages), a tag `<meta http-equiv="Content-Security-Policy">` aplica as diretivas de execução, porém `frame-ancestors` e `X-Frame-Options` exigem cabeçalhos HTTP (configurados em `vercel.json` e `vite preview`). | `src/utils/security.test.ts` + inspeção HTTPS |
| **OWASP A06 / CICD-SEC-8 (Supply Chain)** | GitHub Actions fixadas por SHA-1 de 40 caracteres com `persist-credentials: false`, `npm audit --audit-level=moderate` e verificação de integridade SHA-512 em `package-lock.json`. | `src/utils/security.test.ts` + `.github/workflows/ci.yml` |
| **LGPD / Resolução ANPD nº 15/2024** | Cenários 100% sintéticos, bloqueio preventivo de CPF (`containsPotentialCpf`) em formulários e camada de persistência, IDs com `crypto.randomUUID()` e cálculo de 3 dias úteis. | `src/utils/anpd.test.ts` + `src/utils/security.test.ts` |

## Escopo de Produção (Fora do MVP de Hackathon)

Antes de implantar o sistema em ambiente hospitalar real, implemente:

1. Autenticação corporativa (SSO) com MFA obrigatório.
2. Controle de acesso baseado em papéis (RBAC) no servidor separando colaboradores de gestores de TI e DPO.
3. Persistência criptografada no backend com trilha de auditoria imutável para relatórios à ANPD.

## Como Reportar uma Vulnerabilidade

Não abra issues públicas para falhas de segurança.
Utilize a aba **Security > Advisories > Report a vulnerability** deste repositório no GitHub ou contate os mantenedores diretamente com os passos de reprodução.
