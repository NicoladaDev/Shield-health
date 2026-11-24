import type { MicroLesson } from '../types';

export const MICRO_LESSONS: MicroLesson[] = [
  {
    id: 'lesson-why-health',
    title: 'Por que a saúde é o alvo nº 1 no Brasil',
    subtitle: 'Entenda por que criminosos miram hospitais e como isso afeta o paciente.',
    durationMinutes: 2,
    tag: 'Cenário Brasil',
    targetSectors: 'Todos os setores',
    keyPoints: [
      'Cada organização de saúde no Brasil recebeu mais de 3 mil tentativas de ataque por semana em 2025 (Check Point), quase 40% acima do ano anterior.',
      'Um vazamento custa cerca de R$ 7 milhões em média no Brasil (Brasscom), e a saúde segue como o setor mais caro do mundo (IBM 2026).',
      'Um prontuário vale mais que um cartão de crédito: o cartão se cancela, mas o histórico médico é permanente e o hospital não pode parar.',
    ],
    shiftRuleTitle: 'O que lembrar em todo plantão',
    shiftRuleSteps: [
      'Segurança da informação faz parte da segurança do paciente.',
      'Firewall e antivírus protegem a rede, mas cada colaborador é a primeira barreira.',
      'Parar 10 segundos para conferir um pedido evita dias de hospital parado.',
    ],
    realCase: {
      title: 'Synnovis — Hospitais de Londres',
      year: '2024',
      impact:
        'Ransomware parou o laboratório de sangue, adiou mais de 1.700 cirurgias e a demora em um exame foi apontada como fator na morte de um paciente.',
    },
    quiz: [
      {
        id: 'q1-1',
        question: 'Por que um prontuário médico é mais valioso para criminosos do que um cartão de crédito?',
        options: [
          'Porque tem menos dados pessoais registrados.',
          'Porque o cartão pode ser cancelado, mas o histórico médico é permanente.',
          'Porque não é protegido pela LGPD.',
        ],
        correctIndex: 1,
        explanation:
          'Dados de saúde são sensíveis e imutáveis: não podem ser trocados como um número de cartão.',
      },
      {
        id: 'q1-2',
        question: 'Qual é o impacto real de um ransomware em um laboratório hospitalar?',
        options: [
          'Apenas lentidão temporária no Wi-Fi dos visitantes.',
          'Atraso em exames críticos, adiamento de cirurgias e risco direto à vida do paciente.',
          'Somente troca de senhas no setor de TI.',
        ],
        correctIndex: 1,
        explanation:
          'No caso Synnovis (Londres), o ataque adiou mais de 1.700 cirurgias e colocou pacientes em risco real.',
      },
    ],
  },
  {
    id: 'lesson-phishing-shift',
    title: 'Phishing na correria do plantão',
    subtitle: 'Como detectar golpes disfarçados de urgência clínica em 10 segundos.',
    durationMinutes: 2,
    tag: 'Phishing',
    targetSectors: 'Laboratório, Enfermagem, Recepção e Faturamento',
    keyPoints: [
      'Segundo a Check Point, o phishing é a porta de entrada mais comum na saúde.',
      'No estudo da KnowBe4 (2025), quase 42% dos profissionais de saúde caíram em testes antes do treinamento.',
      'Isso não é falta de inteligência: profissionais de saúde são treinados para agir rápido diante de urgência — e o golpe explora esse reflexo.',
    ],
    shiftRuleTitle: 'Regra dos 10 segundos antes de clicar',
    shiftRuleSteps: [
      '1. Olhe o domínio exato após o "@" (ex.: hospita1central ≠ hospitalcentral).',
      '2. Desconfie de urgência extrema combinada com link de login ou anexo ".exe" / ".zip".',
      '3. Nunca faça login por link de e-mail: abra o sistema pelo atalho oficial da intranet.',
    ],
    realCase: {
      title: 'Simulação real de laboratório (Estudo KnowBe4)',
      year: '2025',
      impact:
        'Instituições que mantiveram treinamento contínuo com simulações reduziram cliques em e-mails falsos em cerca de 90% em um ano.',
    },
    quiz: [
      {
        id: 'q2-1',
        question: 'Você recebe "URGENTE: resultado crítico aguardando validação. Clique aqui e faça login". O que fazer?',
        options: [
          'Clicar imediatamente para não atrasar o atendimento.',
          'Não clicar no link, abrir o sistema de laudos pelo portal oficial e reportar o e-mail à TI.',
          'Encaminhar para colegas perguntando se também receberam.',
        ],
        correctIndex: 1,
        explanation:
          'Sempre acesse sistemas clínicos pelo caminho oficial e acione a TI para bloquear o golpe para todos.',
      },
      {
        id: 'q2-2',
        question: 'Qual foi a redução de cliques em phishing após 1 ano de treinamento contínuo na saúde?',
        options: ['Cerca de 15%', 'Cerca de 42%', 'Cerca de 90%'],
        correctIndex: 2,
        explanation:
          'Segundo a KnowBe4, o treinamento contínuo com simulações reduz cliques em cerca de 90% em um ano.',
      },
    ],
  },
  {
    id: 'lesson-mfa-passwords',
    title: 'Uma senha sem MFA pode derrubar a rede',
    subtitle: 'Proteja credenciais de prontuário, faturamento e acessos remotos.',
    durationMinutes: 2,
    tag: 'Credenciais e MFA',
    targetSectors: 'Enfermagem, Médicos, Faturamento e TI',
    keyPoints: [
      'A autenticação em dois fatores (MFA) impede que uma senha vazada sozinha dê acesso ao sistema.',
      'Senhas compartilhadas no posto de enfermagem ou anotadas no monitor impedem auditoria e facilitam invasões.',
      'Se uma página pedir para desativar o MFA ou digitar o código por telefone/e-mail, é golpe.',
    ],
    shiftRuleTitle: 'Checklist rápido de credenciais',
    shiftRuleSteps: [
      'Use senha única para sistemas hospitalares (nunca repita senha pessoal).',
      'Mantenha o MFA ativo e nunca aprove notificações de login que você não iniciou.',
      'Bloqueie a estação (Win + L) sempre que sair do balcão ou do posto.',
    ],
    realCase: {
      title: 'Change Healthcare (EUA)',
      year: '2024',
      impact:
        'Invadida com uma única senha roubada em um acesso sem MFA. Resultado: dados de quase 193 milhões de pessoas expostos.',
    },
    quiz: [
      {
        id: 'q3-1',
        question: 'Qual falha básica permitiu a invasão da Change Healthcare?',
        options: [
          'Falta de impressora na recepção.',
          'Uma única senha roubada usada em acesso sem autenticação em dois fatores (MFA).',
          'Uso de computadores com tela pequena.',
        ],
        correctIndex: 1,
        explanation:
          'A ausência de MFA transformou uma única credencial vazada em um dos maiores vazamentos da história da saúde.',
      },
      {
        id: 'q3-2',
        question: 'O que fazer se surgir um aviso de aprovação de MFA no celular enquanto você não está fazendo login?',
        options: [
          'Aprovar para o aviso sumir da tela.',
          'Recusar imediatamente, trocar sua senha e avisar a TI.',
          'Ignorar e deixar o celular no silencioso.',
        ],
        correctIndex: 1,
        explanation:
          'Um pedido de MFA inesperado indica que alguém já possui sua senha e está tentando entrar.',
      },
    ],
  },
  {
    id: 'lesson-lgpd-anpd',
    title: 'Alerta precoce, LGPD e o prazo de 3 dias úteis',
    subtitle: 'Por que avisar a TI cedo protege pacientes e cumpre a Resolução ANPD nº 15/2024.',
    durationMinutes: 2,
    tag: 'LGPD e ANPD',
    targetSectors: 'Todos os setores e Gestores',
    keyPoints: [
      'Pela LGPD, dado de saúde é dado pessoal sensível e exige proteção reforçada.',
      'A Resolução ANPD nº 15/2024 determina que incidentes relevantes sejam comunicados à ANPD em até 3 dias úteis.',
      'Um colaborador treinado não só evita clicar: ele reporta rapidamente à TI, dando tempo real de contenção.',
    ],
    shiftRuleTitle: 'Se você clicou ou viu algo estranho',
    shiftRuleSteps: [
      'Sem culpa e sem esconder: reporte à TI no mesmo minuto pelo botão de alerta.',
      'Não apague o e-mail suspeito antes de encaminhar/reportar (a TI precisa dos cabeçalhos).',
      'Se digitou senha em tela suspeita, troque a credencial imediatamente com apoio da TI.',
    ],
    realCase: {
      title: 'Hospitais brasileiros na mira (Einstein e Sírio-Libanês)',
      year: 'Outubro de 2026',
      impact:
        'Acesso a dados sensíveis como nome, CPF, prescrições e exames reforçou a urgência de detecção rápida e comunicação transparente dentro da LGPD.',
    },
    quiz: [
      {
        id: 'q4-1',
        question: 'Qual é o prazo geral da Resolução ANPD nº 15/2024 para comunicar um incidente relevante?',
        options: ['Até 30 dias corridos', 'Até 3 dias úteis', 'Apenas no fechamento anual'],
        correctIndex: 1,
        explanation:
          'A Resolução ANPD nº 15/2024 define o prazo de até 3 dias úteis para comunicação de incidente relevante.',
      },
      {
        id: 'q4-2',
        question: 'Se um colaborador percebe que clicou por engano em um link suspeito, qual é a melhor atitude?',
        options: [
          'Esconder o erro por medo de bronca.',
          'Avisar a TI imediatamente para conter o acesso e preservar os dados dos pacientes.',
          'Esperar até o fim da semana para ver se acontece algo.',
        ],
        correctIndex: 1,
        explanation:
          'Cultura sem punição acelera o alerta. Quem descobre cedo consegue bloquear a invasão antes do vazamento.',
      },
    ],
  },
];
