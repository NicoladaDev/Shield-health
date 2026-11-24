import type { RealCaseBenchmark } from '../types';

export const REAL_CASES: RealCaseBenchmark[] = [
  {
    id: 'einstein-2026',
    organization: 'Hospital Israelita Albert Einstein',
    location: 'Brasil',
    date: 'Outubro de 2026',
    vector: 'Acesso não autorizado à base de pacientes',
    impact: 'Exposição de nomes, CPFs, prescrições e resultados de exames.',
    lesson: 'Prontuário vale mais que cartão de crédito: cartão se cancela, histórico médico não.',
  },
  {
    id: 'sirio-2026',
    organization: 'Hospital Sírio-Libanês',
    location: 'Brasil',
    date: 'Outubro de 2026',
    vector: 'Incidente cibernético comunicado dias após o caso Einstein',
    impact: 'Reforçou a exposição contínua de instituições de referência no Brasil.',
    lesson: 'Mesmo hospitais com alto investimento em TI sofrem tentativas constantes.',
  },
  {
    id: 'synnovis-2024',
    organization: 'Synnovis (Hospitais de Londres)',
    location: 'Reino Unido',
    date: '2024',
    vector: 'Ransomware no laboratório de análises clínicas',
    impact: 'Mais de 1.700 cirurgias adiadas e demora em exame ligada à morte de um paciente.',
    lesson: 'Na saúde, ciberataque não é só problema de TI. É risco direto à vida do paciente.',
  },
  {
    id: 'change-healthcare-2024',
    organization: 'Change Healthcare',
    location: 'Estados Unidos',
    date: '2024',
    vector: 'Uma única senha roubada em acesso sem MFA',
    impact: 'Dados de 192,7 milhões de pessoas expostos e paralisação de pagamentos.',
    lesson: 'Uma credencial sem autenticação em dois fatores abre uma brecha em escala nacional.',
  },
  {
    id: 'conectesus-2021',
    organization: 'ConecteSUS',
    location: 'Brasil',
    date: '2021',
    vector: 'Ataque cibernético em plena pandemia',
    impact: 'Milhões de brasileiros ficaram sem acesso ao comprovante de vacinação.',
    lesson: 'Hospitais e redes públicas de saúde não podem parar.',
  },
];

export const OFFICIAL_SOURCES = [
  { label: 'Check Point (2025)', detail: '+3.000 ataques/semana por organização de saúde no Brasil (+40% vs ano anterior)' },
  { label: 'Brasscom (2024)', detail: 'Custo médio de ~R$ 7 milhões por vazamento de dados no Brasil' },
  { label: 'IBM (2026)', detail: 'Saúde segue como o setor com maior custo médio de vazamento no mundo' },
  { label: 'KnowBe4 Phishing by Industry (2025)', detail: '42% de cliques na saúde antes do treino; redução de ~90% em 1 ano de treinamento contínuo' },
  { label: 'Resolução CD/ANPD nº 15/2024', detail: 'Prazo de até 3 dias úteis para comunicar incidente relevante envolvendo dados sensíveis' },
];
