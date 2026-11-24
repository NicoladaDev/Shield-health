<p align="center">
  <img src="public/logo.png" alt="Logo Shield Health" width="136" />
</p>

# Shield Health

> **A segurança na saúde começa pelas pessoas.**  
> Plataforma web de conscientização cibernética, simulação segura de phishing e alerta precoce (LGPD/ANPD) focada no setor da saúde.
>
> **Página Pública (HTTPS):** [https://nicoladadev.github.io/Shield-health/](https://nicoladadev.github.io/Shield-health/)

---

## O Problema

O setor da saúde é um dos mais atacados no Brasil e no mundo:

- **+3.000 tentativas de ataque por semana** por organização de saúde no Brasil em 2025 — alta de quase **40%** frente ao ano anterior e acima da média mundial *(Check Point)*.
- **~R$ 7 milhões** de custo médio por vazamento de dados no Brasil *(Brasscom)*; globalmente, a saúde segue como o setor onde um vazamento custa mais caro *(IBM 2026)*.
- **Impacto humano real:** ataques a hospitais e laboratórios (como Einstein, Sírio-Libanês, ConecteSUS, Synnovis em Londres e Change Healthcare nos EUA) expõem dados sensíveis permanentes e podem atrasar exames e cirurgias.
- **A porta de entrada são as pessoas:** quase **42%** dos profissionais de saúde clicam em testes de phishing antes de treinamento *(KnowBe4 2025)*, pois são treinados para agir rápido diante de urgências no plantão.

---

## A Solução

O **Shield Health** protege ambientes hospitalares onde há mais variedade e imprevisibilidade: **as pessoas** (recepção, laboratório, enfermagem e faturamento).

### Principais Módulos do MVP (Hackathon)

1. **Visão Geral e Contexto Brasil**
   - Painel executivo com os dados de impacto no Brasil, os 3 ganhos da conscientização e casos reais da saúde.
2. **Simulador de Plantão (Caixa de Entrada Segura)**
   - Recria a pressão real do turno, incluindo o cenário de **resultado crítico no laboratório** e golpes voltados para **enfermagem (MFA)**, **recepção (LGPD)** e **faturamento (anexo `.pdf.exe`)**, além de e-mails legítimos de controle.
   - Permite inspecionar a URL real ao passar o mouse, decidir entre **Reportar Phishing à TI** ou **Marcar como Legítimo**, e oferece **Raio-X educativo imediato** sem punição.
3. **Microaulas Curtas (Pílulas de 2 minutos)**
   - 4 pílulas objetivas para leitura entre plantões com checklist prático ("Regra dos 10 segundos"), estudo de caso real, quiz de verificação e desbloqueio do **Selo Guardião da Saúde**.
4. **Canal de Alerta Rápido + Monitor LGPD / ANPD**
   - Botão global para reportar suspeitas à TI em 3 cliques, gerando protocolo (`SHH-2026-XXXX`) e iniciando automaticamente a contagem de **3 dias úteis** prevista na **Resolução CD/ANPD nº 15/2024**.
5. **Painel Executivo TI & DPO**
   - Compara a taxa de cliques observada contra a linha de base da saúde (**42%**) e a meta de 12 meses (**-90%**, segundo a KnowBe4).
   - Exibe mapa de risco por setor, fila de incidentes com checklist de resposta do DPO, **Calculadora de ROI** contra um vazamento de R$ 7 milhões e **Disparador de Nova Campanha Simulada** ao vivo.

---

## Stack Tecnológica

- **Frontend:** React 19 + TypeScript + Vite
- **Estilização:** Tailwind CSS v4 + Lucide React
- **Testes:** Vitest
- **Persistência (MVP):** `localStorage` com botão **Resetar estado da demonstração** para apresentações em banca

---

## Como Executar Localmente

### Pré-requisitos
- Node.js 20+ e npm 10+

### Passo a passo

```bash
# 1. Instalar dependências
npm install

# 2. Executar em modo de desenvolvimento
npm run dev

# 3. Rodar testes unitários (cálculo de dias úteis ANPD, métricas e ROI)
npm test

# 4. Gerar build de produção
npm run build
```

Acesse `http://localhost:5173` no navegador.

---

## Estrutura do Projeto

```text
shield-health/
├── docs/
│   ├── ARQUITETURA.md      # Decisões técnicas e Privacy by Design (LGPD)
│   └── PITCH_DEMO.md       # Roteiro de demonstração sincronizado com o pitch de 5 min
├── src/
│   ├── components/         # Layout clínico responsivo e Modal de Alerta Rápido à TI
│   ├── data/               # Cenários hospitalares, microaulas e benchmarks oficiais
│   ├── pages/              # Visão Geral, Simulador, Microaulas e Painel TI & DPO
│   ├── store/              # Estado global reativo e persistente
│   ├── types/              # Contratos TypeScript
│   └── utils/              # Cálculo de prazo ANPD (3 dias úteis), métricas e testes
├── LICENSE
└── package.json
```

---

## Roteiro de Demonstração na Banca

Consulte [docs/PITCH_DEMO.md](docs/PITCH_DEMO.md) para o guia exato de navegação sincronizado com os 4 apresentadores.

---

## Roadmap Pós-Hackathon

- Integração SSO (Microsoft Entra ID / Google Workspace) para autenticação corporativa hospitalar.
- Botão nativo de reporte como add-in para Outlook e Gmail.
- Envio real de campanhas periódicas agendadas por setor com relatórios PDF para auditoria LGPD/ANPD.
- Trilha gamificada contínua por unidade hospitalar com envio de microaulas via WhatsApp corporativo.

---

## Fontes Utilizadas

- **Check Point (2025):** Ataques semanais ao setor da saúde no Brasil.
- **Brasscom (2024):** Custo médio de vazamento de dados no Brasil.
- **IBM (2026):** Custo médio de vazamento por setor no mundo.
- **KnowBe4 (2025):** Phishing by Industry — taxa inicial na saúde e redução após treinamento contínuo.
- **Resolução CD/ANPD nº 15/2024:** Prazo de comunicação de incidentes de segurança (3 dias úteis).

---

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.
