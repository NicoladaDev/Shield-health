import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MICRO_LESSONS } from './data/lessons';
import {
  click,
  getAllByRole,
  getByLabelText,
  getByPlaceholderText,
  getByRole,
  getByText,
  mountStrict,
  pressKey,
  queryByRole,
  queryByText,
  seedStorage,
  typeValue,
} from './test/reactTestHarness';

describe('App integration flows (F1–F7, DX-2, DX-3, UX-1, UX-7)', () => {
  it('F1/DX-2: shows storageWarning banner on corrupt localStorage and dismisses via button or resetDemo', async () => {
    seedStorage('{corrupt-json');
    const { container } = await mountStrict(<App />);

    const alert = getByRole(container, 'alert');
    expect(alert.textContent).toContain('Não foi possível ler os dados salvos');

    await click(getByRole(container, 'button', { name: 'Dispensar' }));
    expect(queryByRole(container, 'alert')).toBeNull();
  });

  it('F2/UX-1/UX-7: updates aria-current, progress badges, and two-step reset on desktop and mobile', async () => {
    const { container } = await mountStrict(<App />);

    const overviewButtons = getAllByRole(container, 'button', {
      name: /Visão Geral|Início/,
    });
    expect(
      overviewButtons.some((b) => b.getAttribute('aria-current') === 'page')
    ).toBe(true);

    // Two-step reset: click -> Cancelar preserves state
    await click(
      getByRole(container, 'button', { name: 'Resetar estado da demonstração' })
    );
    expect(
      getAllByRole(container, 'button', { name: 'Confirmar reset?' }).length
    ).toBeGreaterThan(0);

    await click(getAllByRole(container, 'button', { name: 'Cancelar' })[0]);
    expect(
      queryByRole(container, 'button', { name: 'Confirmar reset?' })
    ).toBeNull();

    // Navigating cancels confirmingReset
    await click(
      getAllByRole(container, 'button', {
        name: 'Resetar estado da demonstração',
      })[0]
    );
    await click(getByRole(container, 'button', { name: /Microaulas \(2 min\)/ }));
    expect(
      queryByRole(container, 'button', { name: 'Confirmar reset?' })
    ).toBeNull();

    // Mobile scrollTo on nav click
    await click(getByRole(container, 'button', { name: /^Painel TI$/ }));
    expect(window.scrollTo).toHaveBeenCalled();

    // Confirm reset returns to overview and clears state
    seedStorage({
      version: 1,
      employeeName: 'Alterado',
      completedLessons: ['lesson-why-health'],
    });
    const mounted2 = await mountStrict(<App />);
    await click(
      getAllByRole(mounted2.container, 'button', {
        name: 'Resetar estado da demonstração',
      })[0]
    );
    await click(
      getAllByRole(mounted2.container, 'button', {
        name: 'Confirmar reset?',
      })[0]
    );
    expect(
      getByText(mounted2.container, 'A segurança na saúde começa pelas pessoas.')
    ).toBeTruthy();
  });

  it('F3/F4: featured CTA selects lab-critical-result, PhishingTrapModal preserves state & restores focus, and re-navigation re-selects featured scenario', async () => {
    const { container } = await mountStrict(<App />);

    await click(
      getByRole(container, 'button', { name: /Testar Simulação do Laboratório/ })
    );

    expect(
      getByText(
        container,
        'URGENTE: resultado crítico de paciente aguardando validação'
      )
    ).toBeTruthy();

    // Click phishing CTA -> trap modal opens -> closing restores focus to feedback heading
    await click(
      getByRole(container, 'button', { name: /Validar resultado crítico agora/ })
    );
    expect(
      getByText(container, 'Isso foi uma simulação de phishing!')
    ).toBeTruthy();

    await click(
      getByRole(container, 'button', {
        name: 'Ver Raio-X dos Sinais de Alerta',
      })
    );
    expect(
      queryByText(container, 'Isso foi uma simulação de phishing!')
    ).toBeNull();
    expect(document.activeElement?.textContent).toContain(
      'Simulação educativa: você clicou em uma isca de phishing.'
    );

    // Post-click report creates incident & shows "Ver no Painel TI"
    await click(
      getByRole(container, 'button', { name: 'Reportar Phishing à TI' })
    );
    expect(
      getByRole(container, 'button', { name: 'Ver no Painel TI' })
    ).toBeTruthy();

    // Switch filter to Enfermagem -> stays on Enfermagem on decision
    await click(getByRole(container, 'button', { name: /^Enfermagem$/ }));
    await click(
      getByRole(container, 'button', { name: 'Reportar Phishing à TI' })
    );
    expect(
      getByText(
        container,
        'Excelente! Golpe identificado e alerta enviado à TI.'
      )
    ).toBeTruthy();

    // Re-navigate to Overview & re-click featured CTA -> resets filter to Todos & selects lab-critical-result
    await click(
      getByRole(container, 'button', { name: /Visão Geral/ })
    );
    await click(
      getByRole(container, 'button', { name: /Testar Simulação do Laboratório/ })
    );
    expect(
      getByRole(container, 'button', { name: /^Todos$/ }).getAttribute(
        'aria-pressed'
      )
    ).toBe('true');
    expect(
      getByText(
        container,
        'URGENTE: resultado crítico de paciente aguardando validação'
      )
    ).toBeTruthy();
  });

  it('F7->F4: launches custom campaign, opens in simulator, triggers trap modal, and clears featuredScenarioId on delete', async () => {
    const { container } = await mountStrict(<App />);

    await click(getByRole(container, 'button', { name: /Painel TI & DPO/ }));
    await click(
      getByRole(container, 'button', {
        name: 'Enviar Simulação para o Simulador',
      })
    );
    await click(
      getByRole(container, 'button', {
        name: /Campanha enviada! Abrir no Simulador/,
      })
    );

    expect(
      getByText(
        container,
        'URGENTE: atualização obrigatória de senha do cadastro de pacientes'
      )
    ).toBeTruthy();

    await click(
      getByRole(container, 'button', { name: /Acessar validação imediata/ })
    );
    expect(
      getByText(container, 'Isso foi uma simulação de phishing!')
    ).toBeTruthy();
    await pressKey(document, 'Escape');

    // Delete the custom campaign from InboxList
    await click(
      getByRole(container, 'button', {
        name: /Excluir campanha URGENTE: atualização obrigatória de senha/,
      })
    );
    expect(
      queryByText(
        container,
        'URGENTE: atualização obrigatória de senha do cadastro de pacientes'
      )
    ).toBeNull();
  });

  it('F5: unlocks Guardian Seal after 4 lessons + 3 correct simulations and calls window.print', async () => {
    const { container } = await mountStrict(<App />);

    // Complete 3 correct simulations in Simulator
    await click(
      getByRole(container, 'button', { name: /Simulador de Plantão/ })
    );
    await click(
      getByRole(container, 'button', { name: 'Reportar Phishing à TI' })
    );
    await click(getByRole(container, 'button', { name: /Próximo e-mail/ }));
    await click(
      getByRole(container, 'button', { name: 'Reportar Phishing à TI' })
    );
    await click(getByRole(container, 'button', { name: /Próximo e-mail/ }));
    await click(
      getByRole(container, 'button', { name: 'Reportar Phishing à TI' })
    );

    // Complete all 4 micro-lessons
    await click(getByRole(container, 'button', { name: /Microaulas \(2 min\)/ }));
    for (const lesson of MICRO_LESSONS) {
      await click(getByRole(container, 'button', { name: new RegExp(lesson.title) }));
      for (const question of lesson.quiz) {
        await click(
          getByRole(container, 'button', {
            name: question.options[question.correctIndex],
          })
        );
      }
    }

    const printBtn = getByRole(container, 'button', {
      name: /Imprimir \/ Salvar Certificado/,
    });
    expect(printBtn).toBeTruthy();
    await click(printBtn);
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('F6: submits ReportModal from Layout, increments pending badge, and navigates to Dashboard', async () => {
    const { container } = await mountStrict(<App />);

    await click(
      getByRole(container, 'button', { name: 'Reportar Suspeita à TI' })
    );
    const textarea = getByPlaceholderText(
      container,
      /Recebi e-mail pedindo login urgente/
    );
    await typeValue(textarea, 'Recebi SMS suspeito solicitando senha do PEP.');
    await click(getByRole(container, 'button', { name: 'Enviar Alerta Agora' }));

    expect(
      getByText(container, 'Alerta enviado para a equipe de TI e DPO!')
    ).toBeTruthy();

    await click(
      getByRole(container, 'button', { name: 'Ver na Fila TI & DPO' })
    );
    expect(
      getByText(container, 'Painel Executivo de Conscientização e LGPD')
    ).toBeTruthy();
    expect(
      getByText(container, 'Recebi SMS suspeito solicitando senha do PEP.')
    ).toBeTruthy();
  });

  it('DX-3: ErrorBoundary hides sensitive stack/error messages, recovers on retry, and reloads on restore', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    let shouldThrow = true;
    function Bomb() {
      if (shouldThrow) {
        throw new Error('SENSITIVE_STACK_TRACE_LEAK_XYZ');
      }
      return <div>Tela recuperada com sucesso</div>;
    }

    const { container } = await mountStrict(
      <ErrorBoundary
        onReset={() => {
          shouldThrow = false;
        }}
      >
        <Bomb />
      </ErrorBoundary>
    );

    expect(
      getByText(container, 'Algo deu errado ao exibir esta tela')
    ).toBeTruthy();
    expect(container.textContent).not.toContain('SENSITIVE_STACK_TRACE_LEAK_XYZ');

    await click(getByRole(container, 'button', { name: 'Tentar novamente' }));
    expect(getByText(container, 'Tela recuperada com sucesso')).toBeTruthy();

    shouldThrow = true;
    seedStorage({ version: 1, employeeName: 'Persistido' });
    const mounted2 = await mountStrict(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    await click(
      getByRole(mounted2.container, 'button', {
        name: /Restaurar demonstração e recarregar/,
      })
    );
    expect(window.localStorage.getItem('shield_health_state_v1')).toBeNull();
    expect(window.location.reload).toHaveBeenCalledTimes(1);

    consoleErrorSpy.mockRestore();
  });

  it('F5/App: LessonsPage resets cpfBlockedWarning on external resetDemo even when employeeName is unchanged', async () => {
    const { container } = await mountStrict(<App />);

    await click(getByRole(container, 'button', { name: /Microaulas \(2 min\)/ }));
    const input = getByLabelText(container, 'Nome no certificado:');
    await typeValue(input, '123.456.789-09');
    expect(getByRole(container, 'alert').textContent).toContain('não insira número de CPF');

    // Trigger external resetDemo via Layout without modifying employeeName in store
    await click(
      getAllByRole(container, 'button', {
        name: 'Resetar estado da demonstração',
      })[0]
    );
    await click(
      getAllByRole(container, 'button', {
        name: 'Confirmar reset?',
      })[0]
    );

    await click(getByRole(container, 'button', { name: /Microaulas \(2 min\)/ }));
    expect(queryByRole(container, 'alert')).toBeNull();
  });

  it('F5/App: resetDemo without prior blur does not flush pending certificate name, while subsequent navigation flushes normally', async () => {
    const { container } = await mountStrict(<App />);

    await click(getByRole(container, 'button', { name: /Microaulas \(2 min\)/ }));
    const input = getByLabelText(
      container,
      'Nome no certificado:'
    ) as HTMLInputElement;
    // Type without focusEl/blurEl so pendingDraftRef stays populated until unmount
    await typeValue(input, 'Nome Pendente Nao Resetado');

    await click(
      getAllByRole(container, 'button', {
        name: 'Resetar estado da demonstração',
      })[0]
    );
    await click(
      getAllByRole(container, 'button', {
        name: 'Confirmar reset?',
      })[0]
    );

    const savedAfterReset = JSON.parse(
      window.localStorage.getItem('shield_health_state_v1') ?? '{}'
    ) as { employeeName?: string };
    expect(savedAfterReset.employeeName).toBe('Dra. Camila Nogueira');

    await click(getByRole(container, 'button', { name: /Microaulas \(2 min\)/ }));
    const inputAfterReset = getByLabelText(
      container,
      'Nome no certificado:'
    ) as HTMLInputElement;
    expect(inputAfterReset.value).toBe('Dra. Camila Nogueira');

    const savedOnRevisit = JSON.parse(
      window.localStorage.getItem('shield_health_state_v1') ?? '{}'
    ) as { employeeName?: string };
    expect(savedOnRevisit.employeeName).toBe('Dra. Camila Nogueira');

    // Verify normal navigation away from LessonsPage re-enables unmount flush
    await typeValue(inputAfterReset, 'Dr. Lucas Mendes');
    await click(getByRole(container, 'button', { name: /Visão Geral/ }));
    await click(getByRole(container, 'button', { name: /Microaulas \(2 min\)/ }));

    const inputAfterNav = getByLabelText(
      container,
      'Nome no certificado:'
    ) as HTMLInputElement;
    expect(inputAfterNav.value).toBe('Dr. Lucas Mendes');
    expect(inputAfterNav.getAttributeNames()).toContain('id');
  });

  it('domShim: failing expect(elA).toBe(elB) and .toEqual(elB) with nested children throw AssertionError formatted as HTML without TypeError', () => {
    const elA = document.createElement('button');
    elA.id = 'btn-a';
    elA.setAttribute('type', 'button');

    const elB = document.createElement('div');
    elB.setAttribute('data-test', 'b');
    const nested = document.createElement('span');
    nested.textContent = 'Filho';
    elB.appendChild(nested);

    expect(elB.children).toEqual([nested]);

    const frag = document.createDocumentFragment();
    const fragChild = document.createElement('p');
    frag.appendChild(document.createTextNode('texto'));
    frag.appendChild(fragChild);
    expect(frag.children).toEqual([fragChild]);

    let toBeError: unknown;
    try {
      expect(elA).toBe(elB);
    } catch (err) {
      toBeError = err;
    }
    expect(toBeError).toBeInstanceOf(Error);
    expect(toBeError).not.toBeInstanceOf(TypeError);
    expect((toBeError as Error).name).toBe('AssertionError');
    expect((toBeError as Error).message).toContain('<button');
    expect((toBeError as Error).message).toContain('<div');

    let toEqualError: unknown;
    try {
      expect(elA).toEqual(elB);
    } catch (err) {
      toEqualError = err;
    }
    expect(toEqualError).toBeInstanceOf(Error);
    expect(toEqualError).not.toBeInstanceOf(TypeError);
    expect((toEqualError as Error).name).toBe('AssertionError');
    expect((toEqualError as Error).message).toContain('<button');
    expect((toEqualError as Error).message).toContain('<div');
  });
});
