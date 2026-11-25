import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_SCENARIOS } from '../data/scenarios';
import type { CreateCampaignInput } from '../store/usePlatformStore';
import type {
  CampaignLaunchResult,
  IncidentReport,
  ScenarioDecision,
} from '../types';
import {
  click,
  getAllByRole,
  getByLabelText,
  getByRole,
  getByText,
  mockClipboard,
  mountStrict,
  queryByText,
  selectOption,
  setRangeValue,
  typeValue,
} from '../test/reactTestHarness';
import { calculateAnpdDeadline } from '../utils/anpd';
import { DashboardPage } from './DashboardPage';

function makeIncident(overrides: Partial<IncidentReport>): IncidentReport {
  return {
    id: 'inc-1',
    protocol: 'SHH-2026-0001',
    reportedAt: '2026-11-24T10:00:00.000Z',
    sector: 'Recepção',
    channel: 'E-mail de phishing',
    summary: 'Incidente padrão',
    involvesSensitiveHealthData: true,
    status: 'Em triagem TI',
    source: 'manual',
    checklist: {
      containedAccess: false,
      assessedPatientData: false,
      notifiedDpo: false,
      preparedAnpdNotice: false,
    },
    ...overrides,
  };
}

describe('DashboardPage (F7, UX-2, UX-3, UX-5, UX-7, B1, B7, B10, B12, B16, B17, B19)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('B10 & B19: handles null observedClickRatePercent, 0-100% SVG scale, baseline sectors, trapClicks vs falsePositives, and 0% clean sector', async () => {
    // Case 1: Only non-phishing evaluated (observedClickRatePercent === null)
    const nonPhishingOnly: Record<string, ScenarioDecision> = {
      'lab-safe-maintenance': {
        scenarioId: 'lab-safe-maintenance',
        action: 'marked_safe',
        isCorrect: true,
        decidedAt: '2026-11-24T12:00:00.000Z',
        firstAction: 'marked_safe',
        hadTrapClick: false,
      },
    };

    const { container, rerender } = await mountStrict(
      <DashboardPage
        scenarios={INITIAL_SCENARIOS}
        decisions={nonPhishingOnly}
        incidents={[]}
        completedLessonsCount={0}
        totalLessonsCount={4}
        onUpdateIncidentStatus={vi.fn()}
        onToggleIncidentChecklist={vi.fn()}
        onLaunchCampaign={vi.fn()}
        onDeleteCustomCampaign={vi.fn()}
        onGoToSimulator={vi.fn()}
      />
    );

    expect(
      Array.from(container.querySelectorAll('*')).filter((el) =>
        el.textContent?.includes('Sem phishing avaliado — usando linha de base (42%)')
      ).length
    ).toBeGreaterThanOrEqual(2);
    expect(getByText(container, '--')).toBeTruthy();

    const rects1 = Array.from(container.querySelectorAll('svg rect'));
    // Second rect is observedWidth in BenchmarkComparisonCard
    expect(rects1[1].getAttribute('width')).toBe('0');

    // Case 2: Evaluated phishing + clean sector (Laboratório 100% clean, Enfermagem trap click)
    const evaluatedDecisions: Record<string, ScenarioDecision> = {
      'lab-critical-result': {
        scenarioId: 'lab-critical-result',
        action: 'reported',
        isCorrect: true,
        decidedAt: '2026-11-24T12:00:00.000Z',
        firstAction: 'reported',
        hadTrapClick: false,
      },
      'lab-safe-maintenance': {
        scenarioId: 'lab-safe-maintenance',
        action: 'marked_safe',
        isCorrect: true,
        decidedAt: '2026-11-24T12:00:00.000Z',
        firstAction: 'marked_safe',
        hadTrapClick: false,
      },
      'enf-pep-mfa': {
        scenarioId: 'enf-pep-mfa',
        action: 'clicked',
        isCorrect: false,
        decidedAt: '2026-11-24T12:00:00.000Z',
        firstAction: 'clicked',
        hadTrapClick: true,
      },
      'enf-safe-protocol': {
        scenarioId: 'enf-safe-protocol',
        action: 'reported',
        isCorrect: false,
        decidedAt: '2026-11-24T12:00:00.000Z',
        firstAction: 'reported',
        hadTrapClick: false,
      },
    };

    await rerender(
      <DashboardPage
        scenarios={INITIAL_SCENARIOS}
        decisions={evaluatedDecisions}
        incidents={[]}
        completedLessonsCount={2}
        totalLessonsCount={4}
        onUpdateIncidentStatus={vi.fn()}
        onToggleIncidentChecklist={vi.fn()}
        onLaunchCampaign={vi.fn()}
        onDeleteCustomCampaign={vi.fn()}
        onGoToSimulator={vi.fn()}
      />
    );

    const rects2 = Array.from(container.querySelectorAll('svg rect'));
    // 1 of 2 phishing clicked => 50%
    expect(rects2[1].getAttribute('width')).toBe('50');
    // Laboratório clean => 0% (no 4% floor!)
    expect(getByText(container, 'Risco: 0%')).toBeTruthy();
    expect(
      getByText(
        container,
        '0/2 acertos • 1 clique(s) em isca • 1 falso(s) positivo(s)'
      )
    ).toBeTruthy();
  });

  it('UX-2/B7: filters, sorts ANPD deadlines, tests -1ms/+1ms boundary (no 0h), updates status/checklist, and copies redacted ANPD summary', async () => {
    vi.useFakeTimers();
    const reportedAt = '2026-11-23T12:00:00.000Z';
    const deadline = calculateAnpdDeadline(reportedAt);
    vi.setSystemTime(new Date(deadline.getTime() - 1));

    const writeText = mockClipboard();
    const onUpdateStatus = vi.fn();
    const onToggleChecklist = vi.fn();

    const incidents: IncidentReport[] = [
      makeIncident({
        id: 'inc-closed',
        protocol: 'SHH-2026-0001',
        reportedAt: '2026-11-20T10:00:00.000Z',
        sector: 'Recepção',
        status: 'Comunicado à ANPD',
        summary: 'Incidente encerrado',
      }),
      makeIncident({
        id: 'inc-active',
        protocol: 'SHH-2026-0002',
        reportedAt,
        sector: 'Laboratório',
        status: 'Em triagem TI',
        summary: 'Exposição \u202E123.456.789-09 detectada',
      }),
    ];

    const { container, rerender } = await mountStrict(
      <DashboardPage
        scenarios={INITIAL_SCENARIOS}
        decisions={{}}
        incidents={incidents}
        completedLessonsCount={0}
        totalLessonsCount={4}
        onUpdateIncidentStatus={onUpdateStatus}
        onToggleIncidentChecklist={onToggleChecklist}
        onLaunchCampaign={vi.fn()}
        onDeleteCustomCampaign={vi.fn()}
        onGoToSimulator={vi.fn()}
      />
    );

    expect(getByText(container, 'Exibindo 2 de 2')).toBeTruthy();
    expect(
      getByText(container, 'Comunicado dentro do prazo • Encerrado')
    ).toBeTruthy();
    expect(getByText(container, 'Urgente ANPD: Menos de 1h restante')).toBeTruthy();

    // Advance +2ms past deadline -> "Prazo vencido (1h)" (never 0h)
    vi.setSystemTime(new Date(deadline.getTime() + 1));
    await rerender(
      <DashboardPage
        scenarios={INITIAL_SCENARIOS}
        decisions={{}}
        incidents={incidents}
        completedLessonsCount={0}
        totalLessonsCount={4}
        onUpdateIncidentStatus={onUpdateStatus}
        onToggleIncidentChecklist={onToggleChecklist}
        onLaunchCampaign={vi.fn()}
        onDeleteCustomCampaign={vi.fn()}
        onGoToSimulator={vi.fn()}
      />
    );
    expect(getByText(container, 'Prazo vencido (1h)')).toBeTruthy();

    // Sort by deadline places 'Comunicado à ANPD' last
    await click(
      getByRole(container, 'button', { name: 'Ordenar por prazo ANPD' })
    );
    const protocolBadges = Array.from(container.querySelectorAll('span.font-mono'))
      .map((el) => el.textContent)
      .filter((t) => t?.startsWith('SHH-'));
    expect(protocolBadges).toEqual(['SHH-2026-0002', 'SHH-2026-0001']);

    // Filter by status & sector -> empty state
    await selectOption(
      getByLabelText(container, 'Filtrar por status'),
      'Acesso contido'
    );
    expect(getByText(container, 'Exibindo 0 de 2')).toBeTruthy();
    expect(
      getByText(
        container,
        'Nenhum alerta encontrado para os filtros selecionados.'
      )
    ).toBeTruthy();

    // Reset filters, update status & toggle checklist
    await selectOption(getByLabelText(container, 'Filtrar por status'), 'Todos');
    await selectOption(
      getByLabelText(container, 'Status do incidente SHH-2026-0002'),
      'Acesso contido'
    );
    expect(onUpdateStatus).toHaveBeenCalledWith('inc-active', 'Acesso contido');

    await click(
      getAllByRole(container, 'button', { name: '1. Bloquear conta / link' })[0]
    );
    expect(onToggleChecklist).toHaveBeenCalledWith(
      'inc-active',
      'containedAccess'
    );

    // Copy summary redacts CPF & Bidi and handles clipboard failure fallback
    const copyBtns = getAllByRole(container, 'button', {
      name: 'Copiar resumo ANPD',
    });
    await click(copyBtns[0]);
    expect(writeText).toHaveBeenCalledTimes(1);
    const copiedText = writeText.mock.calls[0][0] as string;
    expect(copiedText).toContain('[Resumo omitido por proteção LGPD]');
    expect(copiedText).not.toContain('123.456.789-09');
    expect(getByText(container, 'Resumo copiado!')).toBeTruthy();

    // Clipboard failure fallback
    mockClipboard({ reject: true });
    await click(copyBtns[1]);
    expect(
      getByText(
        container,
        'Não foi possível copiar automaticamente neste navegador.'
      )
    ).toBeTruthy();
  });

  it('UX-7: RoiCalculatorCard links labels and updates BRL estimates on range slider changes', async () => {
    const { container } = await mountStrict(
      <DashboardPage
        scenarios={INITIAL_SCENARIOS}
        decisions={{}}
        incidents={[]}
        completedLessonsCount={0}
        totalLessonsCount={4}
        onUpdateIncidentStatus={vi.fn()}
        onToggleIncidentChecklist={vi.fn()}
        onLaunchCampaign={vi.fn()}
        onDeleteCustomCampaign={vi.fn()}
        onGoToSimulator={vi.fn()}
      />
    );

    const staffSlider = getByLabelText(
      container,
      'Colaboradores treinados no hospital'
    );
    const costSlider = getByLabelText(
      container,
      'Custo mensal estimado por colaborador'
    );

    await setRangeValue(staffSlider, 1000);
    await setRangeValue(costSlider, 20);

    // 1000 * 20 * 12 = R$ 240.000
    expect(container.textContent).toContain('240.000');
  });

  it('UX-5/B1/B12/B17: CampaignLauncherCard validates CPF, email, duplicate guard, spoof badge, Clear, error propagation, and delete', async () => {
    const onLaunchCampaign = vi.fn<
      (input: CreateCampaignInput) => CampaignLaunchResult
    >(() => ({
      ok: true as const,
      scenario: {
        ...INITIAL_SCENARIOS[0],
        id: 'custom-launched-1',
        isCustomCampaign: true,
        sector: 'Recepção' as const,
        senderName: 'Suporte Sistemas Hospitalares',
        senderEmail: 'suporte@hospitalcentral.org.br',
        subject: 'URGENTE: atualização obrigatória de senha do cadastro de pacientes',
        bodyParagraphs: [
          'Olá equipe,',
          'Seu acesso à recepção expira em 15 minutos. Clique no link para confirmar sua credencial e manter o atendimento ativo.',
          'Clique.',
        ],
      },
    }));
    const onDelete = vi.fn();

    const { container, rerender } = await mountStrict(
      <DashboardPage
        scenarios={INITIAL_SCENARIOS}
        decisions={{}}
        incidents={[]}
        completedLessonsCount={0}
        totalLessonsCount={4}
        onUpdateIncidentStatus={vi.fn()}
        onToggleIncidentChecklist={vi.fn()}
        onLaunchCampaign={onLaunchCampaign}
        onDeleteCustomCampaign={onDelete}
        onGoToSimulator={vi.fn()}
      />
    );

    const emailInput = getByLabelText(container, /E-mail simulado/);
    const subjectInput = getByLabelText(
      container,
      'Assunto com gatilho de urgência'
    );
    const senderNameInput = getByLabelText(
      container,
      'Nome do remetente falso'
    );
    const messageInput = getByLabelText(container, 'Texto da isca educativa');
    const submitBtn = getByRole(container, 'button', {
      name: 'Enviar Simulação para o Simulador',
    }) as HTMLButtonElement;

    // Live spoof badge for @hospitalcentral.org.br
    await typeValue(emailInput, 'ti@hospitalcentral.org.br');
    expect(
      getByText(container, 'Spoof interno (@hospitalcentral.org.br)')
    ).toBeTruthy();

    // Invalid email rejected
    await typeValue(emailInput, 'a..b@hospital.example');
    await click(submitBtn);
    expect(getByRole(container, 'alert').textContent).toContain(
      'endereço de e-mail válido'
    );
    expect(onLaunchCampaign).not.toHaveBeenCalled();

    // Live Bidi+CPF block across fields disables submit
    await typeValue(emailInput, '123\u202E45678909@hospital.invalid');
    expect(submitBtn.disabled).toBe(true);
    expect(getByRole(container, 'alert').textContent).toContain(
      'semelhante a CPF'
    );

    // Clear resets fields
    await click(getByRole(container, 'button', { name: 'Limpar' }));
    expect((subjectInput as HTMLInputElement).value).toBe('');
    expect(submitBtn.disabled).toBe(false);

    // Store error propagation
    onLaunchCampaign.mockReturnValueOnce({
      ok: false,
      error: 'Erro retornado pela store',
    });
    await typeValue(senderNameInput, 'TI');
    await typeValue(emailInput, 'suporte@hospitalcentral.org.br');
    await typeValue(subjectInput, 'Teste válido');
    await typeValue(messageInput, 'Texto da campanha');
    await click(submitBtn);
    expect(getByRole(container, 'alert').textContent).toBe(
      'Erro retornado pela store'
    );

    // Successful launch + duplicate guard (B12) when activeCustomCampaigns contains matching signature
    await click(submitBtn);
    expect(onLaunchCampaign).toHaveBeenCalledTimes(2);
    expect(
      getByRole(container, 'button', {
        name: /Campanha enviada! Abrir no Simulador/,
      })
    ).toBeTruthy();

    const activeCustom = {
      ...INITIAL_SCENARIOS[0],
      id: 'custom-active-1',
      isCustomCampaign: true,
      sector: 'Recepção' as const,
      senderName: 'TI',
      senderEmail: 'suporte@hospitalcentral.org.br',
      subject: 'Teste válido',
      bodyParagraphs: ['Olá', 'Texto da campanha', 'Fim'],
    };
    await rerender(
      <DashboardPage
        scenarios={[activeCustom, ...INITIAL_SCENARIOS]}
        decisions={{}}
        incidents={[]}
        completedLessonsCount={0}
        totalLessonsCount={4}
        onUpdateIncidentStatus={vi.fn()}
        onToggleIncidentChecklist={vi.fn()}
        onLaunchCampaign={onLaunchCampaign}
        onDeleteCustomCampaign={onDelete}
        onGoToSimulator={vi.fn()}
      />
    );

    // Re-enter exact same campaign -> blocked by duplicate signature guard
    await typeValue(senderNameInput, 'TI');
    await typeValue(emailInput, 'suporte@hospitalcentral.org.br');
    await typeValue(subjectInput, 'Teste válido');
    await typeValue(messageInput, 'Texto da campanha');
    await click(submitBtn);
    expect(getByRole(container, 'alert').textContent).toContain(
      'Esta campanha já foi enviada ao Simulador'
    );
    expect(queryByText(container, /Campanha enviada!/)).toBeNull();

    // Delete custom campaign button triggers callback
    await click(
      getByRole(container, 'button', { name: 'Excluir campanha Teste válido' })
    );
    expect(onDelete).toHaveBeenCalledWith('custom-active-1');
  });
});
