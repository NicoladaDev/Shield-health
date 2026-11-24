# Guia de Demonstração no Pitch (5 minutos)

Este guia sincroniza as falas dos 4 apresentadores do roteiro **"A segurança na saúde começa pelas pessoas"** com telas reais do **Shield Health**.

## Preparação antes de subir ao palco
1. Execute `npm run dev` e abra `http://localhost:5173`.
2. Clique em **Resetar estado da demonstração** no rodapé da barra lateral para começar com os dados limpos.
3. Deixe o navegador em tela cheia (`F11`).

---

## Roteiro Sincronizado

### Apresentador 1 — O cenário no Brasil (~1 min)
- **Tela:** `Visão Geral`
- **Ação:** Mostre os 4 cartões de indicadores no topo (`+3.000/semana`, `R$ 7 milhões`, `-90% em 1 ano`, `3 dias úteis`).

### Apresentador 2 — Hospitais na mira: casos reais (~1 min)
- **Tela:** `Visão Geral` (role até **Hospitais na mira: casos reais**)
- **Ação:** Aponte os cartões de Einstein, Sírio-Libanês, ConecteSUS e Synnovis (Londres) para reforçar que ataque na saúde é risco ao paciente.

### Apresentador 3 — A segurança começa por baixo (~1 min 30)
- **Tela:** Clique no botão branco do topo **Testar Simulação do Laboratório**.
- **Ação ao vivo:**
  1. Mostre o e-mail exato do roteiro: `URGENTE: resultado crítico de paciente aguardando validação`.
  2. Passe o mouse sobre o botão **Validar resultado crítico agora** para revelar o domínio falso `http://login-laudo-critico.net/auth/session-capture`.
  3. (Opcional) Clique primeiro no link para mostrar o **modal educativo seguro** ("Nenhum dado real foi exposto") ou clique direto em **Reportar Phishing à TI**.
  4. Mostre o **Raio-X dos Sinais** destacando remetente externo, urgência artificial e link sem HTTPS.

### Apresentador 4 — Por que conscientizar importa + encerramento (~1 min 30)
- **Tela:** Clique em **Ver no Painel TI** (ou navegue para `Painel TI & DPO`).
- **Ação ao vivo:**
  1. Mostre que o alerta acabado de reportar no Laboratório já entrou na **Fila de Alertas Precoces** com o **prazo automático de 3 dias úteis da ANPD** calculado.
  2. Mostre o gráfico **42% → 4,2% (-90% em 1 ano)** e o mapa de risco por setor atualizado.
  3. Ajuste o slider da **Calculadora de ROI** (ex.: 400 colaboradores = **122x mais barato** que um único vazamento de R$ 7 milhões).
  4. (Bônus para perguntas da banca) Crie uma **Nova Simulação de Phishing** no final do painel e abra no Simulador para provar a agilidade do sistema.
