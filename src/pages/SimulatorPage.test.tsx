import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_SCENARIOS } from '../data/scenarios';
import type { EmailScenario, ScenarioDecision } from '../types';
import {
  blurEl,
  click,
  focusEl,
  getByRole,
  getByText,
  hover,
  mountStrict,
  queryByText,
  unhover,
} from '../test/reactTestHarness';
import { SimulatorPage } from './SimulatorPage';

describe('SimulatorPage (F4, UX-4, B2, B4, B15)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('B4: shows ctaDisplayUrl before hover and reveals ctaActualUrl on hover, focus, and Inspecionar link toggle', async () => {
    const { container } = await mountStrict(
      <SimulatorPage
        scenarios={INITIAL_SCENARIOS}
        decisions={{}}
        onRecordDecision={vi.fn()}
        onGoToDashboard={vi.fn()}
      />
    );

    expect(
      getByText(container, 'portal.hospitalcentral.org.br/laudos/validar')
    ).toBeTruthy();
    expect(queryByText(container, /Destino real:/)).toBeNull();

    const ctaBtn = getByRole(container, 'button', {
      name: /Validar resultado crítico agora/,
    });

    await hover(ctaBtn);
    expect(
      getByText(
        container,
        'http://login-laudo-critico.invalid/auth/session-capture'
      )
    ).toBeTruthy();

    await unhover(ctaBtn);
    expect(queryByText(container, /Destino real:/)).toBeNull();

    await focusEl(ctaBtn);
    expect(
      getByText(
        container,
        'http://login-laudo-critico.invalid/auth/session-capture'
      )
    ).toBeTruthy();

    await blurEl(ctaBtn);
    expect(queryByText(container, /Destino real:/)).toBeNull();

    await click(getByRole(container, 'button', { name: 'Inspecionar link' }));
    expect(
      getByText(
        container,
        'http://login-laudo-critico.invalid/auth/session-capture'
      )
    ).toBeTruthy();
    expect(
      getByRole(container, 'button', { name: 'Ocultar destino' }).getAttribute(
        'aria-expanded'
      )
    ).toBe('true');
  });

  it('B15: syncs selectedId on sector filter and disables Próximo e-mail when only 1 scenario matches', async () => {
    const { container } = await mountStrict(
      <SimulatorPage
        scenarios={INITIAL_SCENARIOS}
        decisions={{ 'rec-convenio-lgpd': {
          scenarioId: 'rec-convenio-lgpd',
          action: 'reported',
          isCorrect: true,
          decidedAt: '2026-11-24T10:00:00.000Z',
          firstAction: 'reported',
          hadTrapClick: false,
        } }}
        onRecordDecision={vi.fn()}
        onGoToDashboard={vi.fn()}
      />
    );

    await click(getByRole(container, 'button', { name: /^Recepção$/ }));
    expect(
      getByText(
        container,
        'Solicitação urgente: lista de pacientes internados (CPF e diagnóstico)'
      )
    ).toBeTruthy();

    const nextBtn = getByRole(container, 'button', {
      name: /Próximo e-mail/,
    }) as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(true);

    await click(getByRole(container, 'button', { name: /^Todos$/ }));
    expect(
      (
        getByRole(container, 'button', {
          name: /Próximo e-mail/,
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);
  });

  it('F4: handles non-phishing emails (marked_safe, false-positive report, and safe CTA click without Ver no Painel TI)', async () => {
    const safeWithCta: EmailScenario = {
      ...INITIAL_SCENARIOS[4],
      id: 'safe-with-cta',
      ctaLabel: 'Abrir Intranet Oficial',
      ctaDisplayUrl: 'intranet.hospitalcentral.org.br',
      ctaActualUrl: 'https://intranet.hospitalcentral.org.br/aviso',
    };

    const decisions: Record<string, ScenarioDecision> = {};
    const onRecordDecision = vi.fn((id: string, action: ScenarioDecision['action']) => {
      decisions[id] = {
        scenarioId: id,
        action,
        isCorrect: action === 'marked_safe',
        decidedAt: '2026-11-24T12:00:00.000Z',
        firstAction: action,
        hadTrapClick: action === 'clicked',
      };
    });

    const { container, rerender } = await mountStrict(
      <SimulatorPage
        scenarios={[safeWithCta]}
        decisions={{ ...decisions }}
        onRecordDecision={onRecordDecision}
        onGoToDashboard={vi.fn()}
      />
    );

    await click(
      getByRole(container, 'button', { name: /Abrir Intranet Oficial/ })
    );
    await rerender(
      <SimulatorPage
        scenarios={[safeWithCta]}
        decisions={{ ...decisions }}
        onRecordDecision={onRecordDecision}
        onGoToDashboard={vi.fn()}
      />
    );

    expect(
      getByText(container, 'Link aberto em comunicado legítimo.')
    ).toBeTruthy();
    expect(
      queryByText(container, 'Ver no Painel TI')
    ).toBeNull();
    expect(
      queryByText(container, 'Isso foi uma simulação de phishing!')
    ).toBeNull();

    // False positive report omits Ver no Painel TI
    const fpDecision: Record<string, ScenarioDecision> = {
      'lab-safe-maintenance': {
        scenarioId: 'lab-safe-maintenance',
        action: 'reported',
        isCorrect: false,
        decidedAt: '2026-11-24T12:00:00.000Z',
        firstAction: 'reported',
        hadTrapClick: false,
      },
    };
    await rerender(
      <SimulatorPage
        scenarios={[INITIAL_SCENARIOS[4]]}
        decisions={fpDecision}
        onRecordDecision={onRecordDecision}
        onGoToDashboard={vi.fn()}
      />
    );
    expect(
      getByText(
        container,
        'Falso positivo: este e-mail era um comunicado oficial.'
      )
    ).toBeTruthy();
    expect(queryByText(container, 'Ver no Painel TI')).toBeNull();

    // Correct marked_safe
    await rerender(
      <SimulatorPage
        scenarios={[INITIAL_SCENARIOS[4]]}
        decisions={{
          'lab-safe-maintenance': {
            scenarioId: 'lab-safe-maintenance',
            action: 'marked_safe',
            isCorrect: true,
            decidedAt: '2026-11-24T12:00:00.000Z',
            firstAction: 'marked_safe',
            hadTrapClick: false,
          },
        }}
        onRecordDecision={onRecordDecision}
        onGoToDashboard={vi.fn()}
      />
    );
    expect(
      getByText(container, 'Correto! Este comunicado interno é legítimo.')
    ).toBeTruthy();
  });

  it('InboxList & mobile: shows delete button only on custom campaigns and calls scrollIntoView below 1024px', async () => {
    vi.useFakeTimers();
    window.innerWidth = 375;

    const customScenario: EmailScenario = {
      ...INITIAL_SCENARIOS[0],
      id: 'custom-1',
      isCustomCampaign: true,
      subject: 'Campanha Customizada Teste',
    };
    const onDelete = vi.fn();

    const { container } = await mountStrict(
      <SimulatorPage
        scenarios={[customScenario, INITIAL_SCENARIOS[1]]}
        decisions={{}}
        onRecordDecision={vi.fn()}
        onDeleteCustomCampaign={onDelete}
        onGoToDashboard={vi.fn()}
      />
    );

    const deleteBtns = container.querySelectorAll(
      'button[title="Excluir campanha customizada"]'
    );
    expect(deleteBtns).toHaveLength(1);

    await click(
      getByRole(container, 'button', {
        name: /Ação obrigatória hoje: revalidação/,
      })
    );
    vi.advanceTimersByTime(60);

    expect(Element.prototype.scrollIntoView).toBeDefined();
    const viewerEl = container.querySelector('.scroll-mt-20');
    expect(viewerEl?.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });

    await click(
      getByRole(container, 'button', {
        name: 'Excluir campanha Campanha Customizada Teste',
      })
    );
    expect(onDelete).toHaveBeenCalledWith('custom-1');
  });
});
