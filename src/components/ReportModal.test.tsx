import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import {
  click,
  getByLabelText,
  getByRole,
  getByText,
  mountStrict,
  pressKey,
  queryByRole,
  selectOption,
  toggleCheckbox,
  typeValue,
} from '../test/reactTestHarness';
import { ReportModal } from './ReportModal';

describe('ReportModal & useModalAccessibility (F6, UX-7, B9, B11, B13, B14)', () => {
  it('UX-7/useModalAccessibility: locks body scroll, focuses inside dialog, wraps Tab/Shift+Tab, closes on Escape, and restores focus', async () => {
    function Wrapper() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setIsOpen(true)}>
            Abrir Reporte
          </button>
          <ReportModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onSubmit={() => ({
              ok: false,
              error: 'Erro',
            })}
            onGoToDashboard={vi.fn()}
          />
        </div>
      );
    }

    document.body.style.overflow = 'auto';
    const { container } = await mountStrict(<Wrapper />);

    const trigger = getByRole(container, 'button', { name: 'Abrir Reporte' });
    await click(trigger);

    expect(document.body.style.overflow).toBe('hidden');
    const dialog = getByRole(container, 'dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);

    // Shift+Tab on first focusable wraps to last focusable (Cancelar or Enviar? Cancelar is before submit)
    const firstBtn = getByRole(container, 'button', { name: 'Fechar janela' });
    expect(document.activeElement).toBe(firstBtn);
    await pressKey(document, 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(
      getByRole(container, 'button', { name: 'Enviar Alerta Agora' })
    );

    // Tab on last focusable wraps back to first focusable
    await pressKey(document, 'Tab', { shiftKey: false });
    expect(document.activeElement).toBe(firstBtn);

    // Escape closes modal, restores body overflow, and restores focus to trigger
    await pressKey(document, 'Escape');
    expect(queryByRole(container, 'dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('auto');
    expect(document.activeElement).toBe(trigger);
  });

  it('useModalAccessibility: keeps focus on container when 0 focusables and uses fallbackFocusRef when trigger disabled', async () => {
    function EmptyDialogWrapper() {
      const [open, setOpen] = useState(true);
      const [triggerDisabled, setTriggerDisabled] = useState(false);
      const containerRef = useRef<HTMLDivElement>(null);
      const fallbackRef = useRef<HTMLHeadingElement>(null);
      const triggerRef = useRef<HTMLButtonElement>(null);

      useModalAccessibility({
        isOpen: open,
        onClose: () => setOpen(false),
        containerRef,
        fallbackFocusRef: fallbackRef,
      });

      return (
        <div>
          <button
            ref={triggerRef}
            type="button"
            disabled={triggerDisabled}
            onClick={() => {
              setTriggerDisabled(true);
              setOpen(true);
            }}
          >
            Trigger
          </button>
          <h2 ref={fallbackRef} tabIndex={-1}>
            Fallback Heading
          </h2>
          {open && (
            <div ref={containerRef} role="dialog" tabIndex={-1}>
              Sem elementos focáveis
            </div>
          )}
        </div>
      );
    }

    const { container } = await mountStrict(<EmptyDialogWrapper />);
    const dialog = getByRole(container, 'dialog');
    expect(document.activeElement).toBe(dialog);

    const tabEv = await pressKey(document, 'Tab');
    expect(tabEv.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(dialog);

    await pressKey(document, 'Escape');
    expect(queryByRole(container, 'dialog')).toBeNull();

    // Reopen via trigger which becomes disabled -> Escape falls back to fallbackRef
    await click(getByRole(container, 'button', { name: 'Trigger' }));
    await pressKey(document, 'Escape');
    expect(document.activeElement?.textContent).toBe('Fallback Heading');
  });

  it('B9/B13: blocks Bidi-obfuscated valid CPF, rejects whitespace summary, and allows 11-digit phones', async () => {
    const onSubmit = vi.fn(() => ({
      ok: true as const,
      incident: {
        id: 'inc-1',
        protocol: 'SHH-2026-0002',
        reportedAt: '2026-11-24T12:00:00.000Z',
        sector: 'Laboratório' as const,
        channel: 'E-mail de phishing' as const,
        summary: 'Telefone 11987654321 suspeito',
        involvesSensitiveHealthData: true,
        status: 'Em triagem TI' as const,
        source: 'manual' as const,
        checklist: {
          containedAccess: false,
          assessedPatientData: false,
          notifiedDpo: false,
          preparedAnpdNotice: false,
        },
      },
    }));

    const { container } = await mountStrict(
      <ReportModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        onGoToDashboard={vi.fn()}
      />
    );

    const textarea = getByLabelText(
      container,
      /Descreva brevemente o ocorrido/
    );
    const submitBtn = getByRole(container, 'button', {
      name: 'Enviar Alerta Agora',
    }) as HTMLButtonElement;

    // Whitespace-only submit error
    await typeValue(textarea, '   \u202E   ');
    await click(submitBtn);
    expect(getByRole(container, 'alert').textContent).toContain(
      'Descreva brevemente o ocorrido'
    );
    expect(onSubmit).not.toHaveBeenCalled();

    // Bidi-obfuscated valid CPF disables submit & blocks submission
    await typeValue(textarea, 'Paciente CPF \u202E123.456.789-09');
    expect(submitBtn.disabled).toBe(true);
    expect(getByRole(container, 'alert').textContent).toContain(
      'semelhante a CPF'
    );

    // 11-digit phone number allowed
    await typeValue(textarea, 'Telefone 11987654321 suspeito');
    expect(submitBtn.disabled).toBe(false);
    await click(submitBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(getByText(container, 'SHH-2026-0002')).toBeTruthy();
  });

  it('B14 + M3 punctuation fix: shows role="status" advisory for CNS, RG, and Prontuário nº: 998123 while ignoring Paciente #88412', async () => {
    const onSubmit = vi.fn(() => ({
      ok: true as const,
      incident: {
        id: 'inc-2',
        protocol: 'SHH-2026-0003',
        reportedAt: '2026-11-24T12:00:00.000Z',
        sector: 'Laboratório' as const,
        channel: 'E-mail de phishing' as const,
        summary: 'Prontuário nº: 998123',
        involvesSensitiveHealthData: true,
        status: 'Em triagem TI' as const,
        source: 'manual' as const,
        checklist: {
          containedAccess: false,
          assessedPatientData: false,
          notifiedDpo: false,
          preparedAnpdNotice: false,
        },
      },
    }));

    const { container } = await mountStrict(
      <ReportModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        onGoToDashboard={vi.fn()}
      />
    );

    const textarea = getByLabelText(
      container,
      /Descreva brevemente o ocorrido/
    );
    const submitBtn = getByRole(container, 'button', {
      name: 'Enviar Alerta Agora',
    }) as HTMLButtonElement;

    // Generic code must NOT trigger advisory
    await typeValue(textarea, 'Paciente #88412 na UTI');
    expect(queryByRole(container, 'status')).toBeNull();

    // CNS triggers role="status" advisory and keeps submit enabled
    await typeValue(textarea, 'CNS 700000000000005');
    expect(getByRole(container, 'status').textContent).toContain(
      'CNS, RG ou prontuário'
    );
    expect(submitBtn.disabled).toBe(false);

    // RG triggers advisory
    await typeValue(textarea, 'RG 12.345.678-9');
    expect(getByRole(container, 'status')).toBeTruthy();

    // Prontuário nº: 998123 / n.º: / número: all trigger advisory
    for (const pattern of [
      'Prontuário nº: 998123',
      'Prontuário n.º: 998123',
      'Prontuário número: 998123',
    ]) {
      await typeValue(textarea, pattern);
      expect(getByRole(container, 'status')).toBeTruthy();
    }

    await click(submitBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('B11: resets all 6 internal state fields (sector, channel, summary, checkbox, createdReport, submitError) when closed and reopened', async () => {
    function StatefulReportModal() {
      const [isOpen, setIsOpen] = useState(true);
      return (
        <div>
          <button type="button" onClick={() => setIsOpen(true)}>
            Reabrir
          </button>
          <ReportModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onSubmit={() => ({ ok: false, error: 'Falha controlada' })}
            onGoToDashboard={vi.fn()}
          />
        </div>
      );
    }

    const { container } = await mountStrict(<StatefulReportModal />);

    await selectOption(
      getByLabelText(container, 'Seu setor no hospital'),
      'Faturamento'
    );
    await selectOption(
      getByLabelText(container, 'Tipo de suspeita'),
      'Mensagem WhatsApp / SMS'
    );
    await typeValue(
      getByLabelText(container, /Descreva brevemente o ocorrido/),
      'Texto temporário'
    );
    await toggleCheckbox(
      getByLabelText(container, /Pode envolver dados sensíveis/),
      false
    );
    await click(getByRole(container, 'button', { name: 'Enviar Alerta Agora' }));
    expect(getByRole(container, 'alert').textContent).toBe('Falha controlada');

    // Close and reopen
    await click(getByRole(container, 'button', { name: 'Cancelar' }));
    await click(getByRole(container, 'button', { name: 'Reabrir' }));

    expect(
      (getByLabelText(container, 'Seu setor no hospital') as HTMLSelectElement)
        .value
    ).toBe('Laboratório');
    expect(
      (getByLabelText(container, 'Tipo de suspeita') as HTMLSelectElement).value
    ).toBe('E-mail de phishing');
    expect(
      (
        getByLabelText(
          container,
          /Descreva brevemente o ocorrido/
        ) as HTMLTextAreaElement
      ).value
    ).toBe('');
    expect(
      (
        getByLabelText(
          container,
          /Pode envolver dados sensíveis/
        ) as HTMLInputElement
      ).checked
    ).toBe(true);
    expect(queryByRole(container, 'alert')).toBeNull();
  });
});
