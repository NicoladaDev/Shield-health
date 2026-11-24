# Arquitetura — Shield Health

## Princípios de Projeto

1. **Zero Dado Real de Paciente (Privacy by Design):** Todo o ambiente de simulação usa cenários sintéticos. O botão de reporte orienta a não inserir dados reais e aplica validação automática (`containsPotentialCpf`) para impedir envio acidental de CPF.
2. **Feedback Educativo Não Punitivo:** Quando um profissional clica em um link simulado, recebe orientação imediata e clara em vez de bloqueio punitivo, incentivando a cultura de alerta rápido.
3. **Alinhamento Regulatório (LGPD / ANPD):** O módulo `src/utils/anpd.ts` calcula automaticamente o prazo de **3 dias úteis** da Resolução CD/ANPD nº 15/2024 a partir do horário de ciência do incidente.
4. **Hardening de Frontend e CI:** O build de produção aplica `Content-Security-Policy` restritiva (`script-src 'self'`, `object-src 'none'`), cabeçalhos HTTP de segurança (`vite.config.ts` e `vercel.json`), validação de esquema para `localStorage` (`src/utils/validation.ts`), limites `maxLength` e auditoria contínua (`npm audit --audit-level=moderate`) com permissão mínima no GitHub Actions.
5. **Execução Autônoma para Hackathon:** O MVP opera 100% no cliente com estado reativo validado e persistido em `localStorage`, permitindo demonstração confiável mesmo sem internet no palco.

## Fluxo de Dados no MVP

```text
[Colaborador]
   ├── Simulador de Plantão ──► recordDecision() ──► Atualiza métricas por setor
   │         └── Reportou phishing ──► Cria alerta automático na Fila TI/DPO
   ├── Microaulas (2 min) ────► completeLesson() ──► Desbloqueia Selo Guardião
   └── Botão Reportar TI ─────► reportIncident() ──► Protocolo + Prazo ANPD (3 dias úteis)

[Gestor TI / DPO]
   └── Painel TI & DPO
         ├── Acompanha taxa de cliques (42% baseline vs meta 4,2%)
         ├── Gerencia checklist de contenção e prazo ANPD
         ├── Simula retorno financeiro (ROI vs R$ 7M)
         └── Dispara nova campanha simulada ──► Injeta e-mail no Simulador ao vivo
```

## Evolução para Produção

Para implantação em hospitais e clínicas reais, a arquitetura desacopla `src/store/usePlatformStore.ts` para consumir uma API REST/GraphQL com:
- Autenticação corporativa via OpenID Connect / SAML (Entra ID, Okta, Google Workspace).
- Banco relacional (PostgreSQL) com trilha de auditoria imutável para relatórios à ANPD.
- Motor assíncrono de disparo de campanhas simuladas (SMTP interno com cabeçalhos seguros allowlisted) e integração SIEM/SOAR.
