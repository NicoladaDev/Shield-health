import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MICRO_LESSONS } from '../data/lessons';
import type { ActionResult } from '../types';
import {
  blurEl,
  click,
  getByLabelText,
  getByRole,
  getByText,
  mountStrict,
  queryByRole,
  typeValue,
} from '../test/reactTestHarness';
import { LessonsPage } from './LessonsPage';

describe('LessonsPage (F5, UX-6, B5, B6, B13)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('B5: renders hydrated lessonAnswers safely, ignores prototype keys, shows wrong/right feedback, and completes at 2/2', async () => {
    const onCompleteLesson = vi.fn();
    const onSaveLessonAnswer = vi.fn();
    const pollutedAnswers = JSON.parse(
      '{"__proto__:q1":0,"toString":1,"lesson-why-health:q1-1":0}'
    ) as Record<string, number>;

    function StatefulLessons() {
      const [answers, setAnswers] = useState<Record<string, number>>(pollutedAnswers);
      return (
        <LessonsPage
          completedLessons={[]}
          lessonAnswers={answers}
          employeeName="Dra. Camila Nogueira"
          onCompleteLesson={onCompleteLesson}
          onSaveLessonAnswer={(lessonId, questionId, optionIndex) => {
            onSaveLessonAnswer(lessonId, questionId, optionIndex);
            setAnswers((prev) => ({
              ...prev,
              [`${lessonId}:${questionId}`]: optionIndex,
            }));
          }}
          onChangeEmployeeName={() => ({ ok: true })}
          correctSimulationsCount={3}
        />
      );
    }

    const { container } = await mountStrict(<StatefulLessons />);

    expect(getByText(container, 'Tente novamente:')).toBeTruthy();

    await click(
      getByRole(container, 'button', {
        name: MICRO_LESSONS[0].quiz[0].options[1],
      })
    );
    expect(onSaveLessonAnswer).toHaveBeenCalledWith(
      'lesson-why-health',
      'q1-1',
      1
    );
    expect(onCompleteLesson).not.toHaveBeenCalled();

    await click(
      getByRole(container, 'button', {
        name: MICRO_LESSONS[0].quiz[1].options[1],
      })
    );
    expect(onCompleteLesson).toHaveBeenCalledWith('lesson-why-health');
  });

  it('B6/B13: fake-timer debounce preserves cpfBlockedWarning across paste, blur, and unmount without flushing stale draft', async () => {
    vi.useFakeTimers();
    const onChangeEmployeeName = vi.fn((): ActionResult => ({ ok: true }));

    const { container, unmount } = await mountStrict(
      <LessonsPage
        completedLessons={[]}
        lessonAnswers={{}}
        employeeName="Dra. Camila Nogueira"
        onCompleteLesson={vi.fn()}
        onSaveLessonAnswer={vi.fn()}
        onChangeEmployeeName={onChangeEmployeeName}
        correctSimulationsCount={0}
      />
    );

    const input = getByLabelText(container, 'Nome no certificado:') as HTMLInputElement;

    await typeValue(input, 'Ana Maria');
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(onChangeEmployeeName).not.toHaveBeenCalled();

    // Paste Bidi + CPF -> cancels timer, clears pending draft, shows warning
    await typeValue(input, '123\u202E.456.789-09');
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(onChangeEmployeeName).not.toHaveBeenCalled();
    expect(getByRole(container, 'alert').textContent).toContain(
      'não insira número de CPF'
    );
    expect(input.getAttribute('aria-invalid')).toBe('true');

    // Blur does NOT flush stale draft or clear warning
    await blurEl(input);
    expect(onChangeEmployeeName).not.toHaveBeenCalled();
    expect(getByRole(container, 'alert')).toBeTruthy();

    // Selecting quiz option (re-render) does NOT clear warning
    await click(
      getByRole(container, 'button', {
        name: MICRO_LESSONS[0].quiz[0].options[1],
      })
    );
    expect(getByRole(container, 'alert')).toBeTruthy();

    // Unmount after CPF block does NOT flush stale draft
    await unmount();
    expect(onChangeEmployeeName).not.toHaveBeenCalled();

    // Remount and test valid edit -> clears warning & commits after debounce; unmount flushes pending valid draft
    const m2 = await mountStrict(
      <LessonsPage
        completedLessons={[]}
        lessonAnswers={{}}
        employeeName="Dra. Camila Nogueira"
        onCompleteLesson={vi.fn()}
        onSaveLessonAnswer={vi.fn()}
        onChangeEmployeeName={onChangeEmployeeName}
        correctSimulationsCount={0}
      />
    );
    const input2 = getByLabelText(m2.container, 'Nome no certificado:') as HTMLInputElement;
    await typeValue(input2, 'Dr. João Souza');
    await act(async () => {
      vi.advanceTimersByTime(260);
    });
    expect(onChangeEmployeeName).toHaveBeenCalledWith('Dr. João Souza');

    await typeValue(input2, 'Dr. João P. Souza');
    await m2.unmount();
    expect(onChangeEmployeeName).toHaveBeenCalledWith('Dr. João P. Souza');

    // External employeeName change syncs nameDraft & clears warning
    const m3 = await mountStrict(
      <LessonsPage
        completedLessons={[]}
        lessonAnswers={{}}
        employeeName="Inicial"
        onCompleteLesson={vi.fn()}
        onSaveLessonAnswer={vi.fn()}
        onChangeEmployeeName={onChangeEmployeeName}
        correctSimulationsCount={0}
      />
    );
    const input3 = getByLabelText(m3.container, 'Nome no certificado:') as HTMLInputElement;
    await typeValue(input3, '123.456.789-09');
    expect(getByRole(m3.container, 'alert')).toBeTruthy();
    await m3.rerender(
      <LessonsPage
        completedLessons={[]}
        lessonAnswers={{}}
        employeeName="Dra. Camila Nogueira"
        onCompleteLesson={vi.fn()}
        onSaveLessonAnswer={vi.fn()}
        onChangeEmployeeName={onChangeEmployeeName}
        correctSimulationsCount={0}
      />
    );
    expect(queryByRole(m3.container, 'alert')).toBeNull();
    expect(input3.value).toBe('Dra. Camila Nogueira');
  });

  it('M2 fix: resetVersion clears cpfBlockedWarning, nameDraft, selectedLessonId, and timers even when employeeName is unchanged', async () => {
    vi.useFakeTimers();
    const onChangeEmployeeName = vi.fn((): ActionResult => ({ ok: true }));

    const { container, rerender } = await mountStrict(
      <LessonsPage
        completedLessons={[]}
        lessonAnswers={{}}
        employeeName="Dra. Camila Nogueira"
        resetVersion={0}
        onCompleteLesson={vi.fn()}
        onSaveLessonAnswer={vi.fn()}
        onChangeEmployeeName={onChangeEmployeeName}
        correctSimulationsCount={0}
      />
    );

    // Switch to lesson 2 and trigger CPF warning
    await click(
      getByRole(container, 'button', {
        name: /Phishing na correria do plantão/,
      })
    );
    expect(
      getByRole(container, 'button', {
        name: /Phishing na correria do plantão/,
      }).getAttribute('aria-pressed')
    ).toBe('true');

    const input = getByLabelText(container, 'Nome no certificado:') as HTMLInputElement;
    await typeValue(input, '123.456.789-09');
    expect(getByRole(container, 'alert')).toBeTruthy();

    // External resetDemo increments resetVersion with identical employeeName
    await rerender(
      <LessonsPage
        completedLessons={[]}
        lessonAnswers={{}}
        employeeName="Dra. Camila Nogueira"
        resetVersion={1}
        onCompleteLesson={vi.fn()}
        onSaveLessonAnswer={vi.fn()}
        onChangeEmployeeName={onChangeEmployeeName}
        correctSimulationsCount={0}
      />
    );

    expect(queryByRole(container, 'alert')).toBeNull();
    expect(input.value).toBe('Dra. Camila Nogueira');
    expect(
      getByRole(container, 'button', {
        name: /Por que a saúde é o alvo nº 1 no Brasil/,
      }).getAttribute('aria-pressed')
    ).toBe('true');
  });

  it('UX-6: renders fallback name "Colaborador(a) do Hospital" when employeeName is empty and flushes before print', async () => {
    const onChangeEmployeeName = vi.fn((): ActionResult => ({ ok: true }));
    const { container } = await mountStrict(
      <LessonsPage
        completedLessons={MICRO_LESSONS.map((l) => l.id)}
        lessonAnswers={{}}
        employeeName=""
        onCompleteLesson={vi.fn()}
        onSaveLessonAnswer={vi.fn()}
        onChangeEmployeeName={onChangeEmployeeName}
        correctSimulationsCount={3}
      />
    );

    expect(
      Array.from(container.querySelectorAll('*')).some((el) =>
        el.textContent?.includes('Colaborador(a) do Hospital')
      )
    ).toBe(true);
    const printSection = container.querySelector(
      'section[aria-label="Certificado para impressão"]'
    );
    expect(printSection?.textContent).toContain('Colaborador(a) do Hospital');

    const input = getByLabelText(container, 'Nome no certificado:');
    await typeValue(input, 'Enf. Mariana Silva');

    await click(
      getByRole(container, 'button', {
        name: /Imprimir \/ Salvar Certificado/,
      })
    );
    expect(onChangeEmployeeName).toHaveBeenCalledWith('Enf. Mariana Silva');
    expect(window.print).toHaveBeenCalledTimes(1);
  });
});
