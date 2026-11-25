import type { EmailScenario } from '../types';

export const INITIAL_SCENARIOS: EmailScenario[] = [
  {
    id: 'lab-critical-result',
    sector: 'Laboratório',
    isPhishing: true,
    isFeaturedPitch: true,
    receivedAt: 'Hoje, 14:18 (Plantão Diurno)',
    senderName: 'Sistema de Laudos Críticos',
    senderEmail: 'alertas@laudos-validacao-urgente.invalid',
    recipientRole: 'Biomédico(a) — Laboratório Central',
    subject: 'URGENTE: resultado crítico de paciente aguardando validação',
    urgencyTag: 'ALTA PRIORIDADE',
    bodyParagraphs: [
      'Atenção, plantonista do Laboratório:',
      'Um exame de Troponina com valor crítico (Paciente #88412 — UTI Adulto) está aguardando sua validação imediata para liberação à equipe médica.',
      'O sistema detectou desconexão da sua sessão. Clique no botão abaixo e faça login novamente nos próximos 5 minutos para evitar atraso na conduta clínica.',
    ],
    ctaLabel: 'Validar resultado crítico agora',
    ctaDisplayUrl: 'portal.hospitalcentral.org.br/laudos/validar',
    ctaActualUrl: 'http://login-laudo-critico.invalid/auth/session-capture',
    relatedCaseTitle: 'Cenário do Roteiro + Estudo KnowBe4 (2025)',
    relatedCaseSummary:
      'Quase 42% dos profissionais de saúde clicam em e-mails falsos antes de treinamento. O golpe explora o reflexo treinado para agir rápido diante de uma urgência clínica.',
    indicators: [
      {
        id: 'ind-1',
        label: 'Domínio de remetente externo',
        field: 'Remetente',
        explanation:
          'O e-mail veio de "laudos-validacao-urgente.invalid" e não do domínio oficial "@hospitalcentral.org.br".',
        severity: 'danger',
      },
      {
        id: 'ind-2',
        label: 'Pressão extrema de tempo no plantão',
        field: 'Urgência',
        explanation:
          'Usa "URGENTE", paciente em UTI e prazo de 5 minutos para impedir que você verifique o remetente.',
        severity: 'danger',
      },
      {
        id: 'ind-3',
        label: 'Link mascarado sem HTTPS',
        field: 'Link',
        explanation:
          'O texto sugere o portal do hospital, mas o destino real é "http://login-laudo-critico.invalid" (página falsa de roubo de senha).',
        severity: 'danger',
      },
    ],
    learningTakeaway:
      'Nunca valide resultados críticos por link de e-mail. Abra o sistema de laudos diretamente pelo atalho fixo da intranet hospitalar.',
  },
  {
    id: 'enf-pep-mfa',
    sector: 'Enfermagem',
    isPhishing: true,
    receivedAt: 'Hoje, 13:52',
    senderName: 'Suporte TI — Prontuário Eletrônico',
    senderEmail: 'suporte-pep@hospita1central.invalid',
    recipientRole: 'Enfermeiro(a) — Posto de Enfermagem',
    subject: 'Ação obrigatória hoje: revalidação de acesso ao PEP antes do plantão noturno',
    urgencyTag: 'BLOQUEIO EM 1H',
    bodyParagraphs: [
      'Prezado(a) colaborador(a) de Enfermagem,',
      'Estamos migrando o servidor de autenticação do Prontuário Eletrônico do Paciente (PEP). Seu usuário será bloqueado às 19h se não concluir a revalidação.',
      'Para agilizar o acesso durante a troca de turno, utilize o link temporário abaixo com seu usuário e senha. O código de autenticação em dois fatores (MFA) está desabilitado nesta página de migração.',
    ],
    ctaLabel: 'Revalidar acesso ao PEP',
    ctaDisplayUrl: 'pep.hospitalcentral.org.br/revalidar',
    ctaActualUrl: 'https://hospita1central-sso.invalid/pep-login',
    relatedCaseTitle: 'Caso Change Healthcare (EUA)',
    relatedCaseSummary:
      'Uma única senha roubada em um acesso sem autenticação em dois fatores (MFA) expôs dados de quase 193 milhões de pessoas.',
    indicators: [
      {
        id: 'ind-enf-1',
        label: 'Typosquatting no domínio ("hospita1")',
        field: 'Remetente',
        explanation:
          'O remetente trocou a letra "l" pelo número "1" em "hospita1central.invalid" para enganar em leitura rápida.',
        severity: 'danger',
      },
      {
        id: 'ind-enf-2',
        label: 'Dispensa de autenticação em dois fatores (MFA)',
        field: 'Autenticação',
        explanation:
          'A equipe de TI legítima jamais pede login em páginas externas sem MFA.',
        severity: 'danger',
      },
      {
        id: 'ind-enf-3',
        label: 'Ameaça de bloqueio na troca de plantão',
        field: 'Urgência',
        explanation:
          'Cria medo de ficar sem acesso ao prontuário durante o turno para forçar o clique.',
        severity: 'danger',
      },
    ],
    learningTakeaway:
      'Sempre desconfie de qualquer pedido para digitar senha fora do portal oficial ou sem MFA. Em caso de dúvida, confirme no ramal oficial da TI.',
  },
  {
    id: 'rec-convenio-lgpd',
    sector: 'Recepção',
    isPhishing: true,
    receivedAt: 'Hoje, 11:30',
    senderName: 'Regulação Convênio SaúdeMais',
    senderEmail: 'auditoria@saudemais-regulacao.invalid',
    recipientRole: 'Recepcionista — Internação e Triagem',
    subject: 'Solicitação urgente: lista de pacientes internados (CPF e diagnóstico)',
    urgencyTag: 'AUDITORIA',
    bodyParagraphs: [
      'Olá equipe de Recepção,',
      'Para evitar suspensão imediata de autorizações do convênio SaúdeMais, precisamos que envie ainda hoje a planilha atualizada com Nome Completo, CPF, número da carteirinha e hipótese diagnóstica dos pacientes internados nas últimas 48 horas.',
      'Faça o upload direto pelo formulário externo abaixo até as 16h.',
    ],
    ctaLabel: 'Enviar planilha de pacientes',
    ctaDisplayUrl: 'portal.saudemais.example/auditoria',
    ctaActualUrl: 'https://upload-planilhas-med.invalid/saudemais',
    relatedCaseTitle: 'Casos Einstein / Sírio-Libanês (2026) + LGPD',
    relatedCaseSummary:
      'Dados de pacientes (CPF, prescrições, exames e diagnósticos) são dados sensíveis pela LGPD e o principal alvo comercial de grupos criminosos.',
    indicators: [
      {
        id: 'ind-rec-1',
        label: 'Domínio ".invalid" não oficial',
        field: 'Remetente',
        explanation:
          'Operadoras de saúde usam portais TISS homologados e domínios corporativos verificados, nunca domínios externos ".invalid" não oficiais.',
        severity: 'danger',
      },
      {
        id: 'ind-rec-2',
        label: 'Pedido de dados sensíveis fora do fluxo LGPD',
        field: 'Link',
        explanation:
          'Enviar planilhas com CPF e diagnóstico em formulários externos viola a LGPD e expõe pacientes.',
        severity: 'danger',
      },
    ],
    learningTakeaway:
      'Dados clínicos nunca saem por planilha em link recebido por e-mail. Valide pedidos de convênios com a coordenação e use somente o portal oficial.',
  },
  {
    id: 'fat-glosa-anexo',
    sector: 'Faturamento',
    isPhishing: true,
    receivedAt: 'Hoje, 10:05',
    senderName: 'Central de Glosas TISS',
    senderEmail: 'financeiro@portal-tiss-pagamentos.invalid',
    recipientRole: 'Analista de Faturamento Hospitalar',
    subject: 'RE: Lote #4491 bloqueado — Glosa de R$ 148.900,00 (conferir anexo)',
    attachmentName: 'Relatorio_Glosa_Lote4491.pdf.exe',
    bodyParagraphs: [
      'Prezado Faturamento,',
      'O lote de guias TISS #4491 foi retido por divergência de código TUSS. O repasse de R$ 148.900,00 permanecerá suspenso até a regularização.',
      'Abra o relatório anexo em sua estação de trabalho para visualizar os itens glosados e reenviar o arquivo XML hoje.',
    ],
    relatedCaseTitle: 'Caso Synnovis — Ransomware Hospitalar (2024)',
    relatedCaseSummary:
      'Anexos maliciosos abertos em estações administrativas são uma das principais portas de entrada para ransomware que paralisa exames e cirurgias.',
    indicators: [
      {
        id: 'ind-fat-1',
        label: 'Anexo com extensão dupla ".pdf.exe"',
        field: 'Anexo',
        explanation:
          'O arquivo se disfarça de PDF, mas termina em ".exe" — um executável capaz de instalar ransomware na rede.',
        severity: 'danger',
      },
      {
        id: 'ind-fat-2',
        label: 'Domínio genérico ".invalid"',
        field: 'Remetente',
        explanation:
          'O endereço "portal-tiss-pagamentos.invalid" não pertence a nenhuma operadora cadastrada.',
        severity: 'danger',
      },
      {
        id: 'ind-fat-3',
        label: 'Gatilho financeiro de alto valor',
        field: 'Assunto',
        explanation:
          'Usa um valor alto de glosa e o prefixo falso "RE:" para parecer uma conversa já existente.',
        severity: 'danger',
      },
    ],
    learningTakeaway:
      'Nunca execute arquivos ".exe", ".zip" ou planilhas com macros recebidos por e-mail. Confira glosas diretamente dentro do portal oficial da operadora.',
  },
  {
    id: 'lab-safe-maintenance',
    sector: 'Laboratório',
    isPhishing: false,
    receivedAt: 'Ontem, 17:40',
    senderName: 'Equipe de TI — Hospital Central',
    senderEmail: 'ti@hospitalcentral.org.br',
    recipientRole: 'Todos os setores — Laboratório e Apoio Diagnóstico',
    subject: 'Comunicado: manutenção programada do sistema de laudos no domingo (02h às 03h)',
    bodyParagraphs: [
      'Olá equipe,',
      'Informamos que no próximo domingo, entre 02h00 e 03h00, haverá manutenção preventiva programada no servidor de backup do sistema de laudos.',
      'Nenhuma ação ou recadastramento de senha é necessária. O plano de contingência em papel permanece disponível na intranet oficial (Menu Contingência). Em caso de dúvidas, acione o ramal interno 4100.',
    ],
    relatedCaseTitle: 'Boas Práticas de Comunicação Segura',
    relatedCaseSummary:
      'Treinar discernimento também significa reconhecer comunicados legítimos para evitar sobrecarga de falsos alertas na equipe de TI.',
    indicators: [
      {
        id: 'ind-safe-1',
        label: 'Domínio corporativo oficial verificado',
        field: 'Remetente',
        explanation:
          'Enviado exatamente por "ti@hospitalcentral.org.br", sem caracteres trocados ou domínios externos.',
        severity: 'safe',
      },
      {
        id: 'ind-safe-2',
        label: 'Sem links de login ou anexos executáveis',
        field: 'Canal Oficial',
        explanation:
          'Não pede senha, não pressiona por clique imediato e indica o ramal interno 4100 para confirmação.',
        severity: 'safe',
      },
    ],
    learningTakeaway:
      'Comunicados internos legítimos da TI informam horários e canais internos sem pedir credenciais nem pressionar por cliques imediatos.',
  },
  {
    id: 'enf-safe-protocol',
    sector: 'Enfermagem',
    isPhishing: false,
    receivedAt: 'Ontem, 15:10',
    senderName: 'Coordenação de Enfermagem',
    senderEmail: 'enfermagem@hospitalcentral.org.br',
    recipientRole: 'Equipe de Enfermagem — Ala Sul',
    subject: 'Atualização do protocolo de passagem de plantão — versão 2026.4',
    bodyParagraphs: [
      'Prezados enfermeiros e técnicos,',
      'A versão 2026.4 do protocolo de passagem de plantão da Ala Sul foi publicada hoje no Repositório de Qualidade da Intranet.',
      'Consulte o documento durante o seu turno acessando diretamente o ícone "Qualidade e Protocolos" na área de trabalho do posto. Não há necessidade de responder este e-mail.',
    ],
    relatedCaseTitle: 'Fluxo Seguro de Documentos Internos',
    relatedCaseSummary:
      'Instituições maduras centralizam protocolos na intranet autenticada em vez de circular anexos ou links externos por e-mail.',
    indicators: [
      {
        id: 'ind-safe-enf-1',
        label: 'Remetente interno autêntico',
        field: 'Remetente',
        explanation:
          'Domínio oficial "@hospitalcentral.org.br" consistente com a Coordenação de Enfermagem.',
        severity: 'safe',
      },
      {
        id: 'ind-safe-enf-2',
        label: 'Direciona para acesso interno seguro',
        field: 'Canal Oficial',
        explanation:
          'Orienta abrir o documento pelo atalho da intranet já presente na estação, sem links suspeitos.',
        severity: 'safe',
      },
    ],
    learningTakeaway:
      'E-mails legítimos orientam o acesso por caminhos conhecidos da intranet e não criam pânico artificial.',
  },
];
