import { useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { MICRO_LESSONS } from '../data/lessons';
import { INPUT_LIMITS } from '../utils/validation';

interface LessonsPageProps {
  completedLessons: string[];
  employeeName: string;
  onCompleteLesson: (lessonId: string) => void;
  onChangeEmployeeName: (name: string) => void;
  correctSimulationsCount: number;
}

export function LessonsPage({
  completedLessons,
  employeeName,
  onCompleteLesson,
  onChangeEmployeeName,
  correctSimulationsCount,
}: LessonsPageProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    MICRO_LESSONS[0].id
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const activeLesson =
    MICRO_LESSONS.find((l) => l.id === selectedLessonId) ?? MICRO_LESSONS[0];
  const isCompleted = completedLessons.includes(activeLesson.id);

  const allQuestionsAnswered = activeLesson.quiz.every(
    (q) => answers[q.id] !== undefined
  );
  const allQuestionsCorrect = activeLesson.quiz.every(
    (q) => answers[q.id] === q.correctIndex
  );

  const allLessonsFinished = completedLessons.length === MICRO_LESSONS.length;
  const badgeUnlocked = allLessonsFinished && correctSimulationsCount >= 3;

  function handleSelectOption(questionId: string, optionIndex: number) {
    const nextAnswers = { ...answers, [questionId]: optionIndex };
    setAnswers(nextAnswers);

    const nowAllCorrect = activeLesson.quiz.every(
      (q) => nextAnswers[q.id] === q.correctIndex
    );
    if (nowAllCorrect) {
      onCompleteLesson(activeLesson.id);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            Conteúdos Curtos para Plantão
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Microaulas de Conscientização
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Pílulas de 2 minutos com linguagem direta, casos reais da saúde e
            quiz prático.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 text-xs">
          <span className="text-slate-500">Concluídas:</span>{' '}
          <strong className="text-teal-700">
            {completedLessons.length} de {MICRO_LESSONS.length} pílulas
          </strong>
        </div>
      </div>

      {/* Lesson Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {MICRO_LESSONS.map((lesson, idx) => {
          const done = completedLessons.includes(lesson.id);
          const selected = lesson.id === activeLesson.id;

          return (
            <button
              key={lesson.id}
              type="button"
              onClick={() => setSelectedLessonId(lesson.id)}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                selected
                  ? 'bg-teal-50 border-teal-400 ring-1 ring-teal-300 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  Pílula {idx + 1} • {lesson.durationMinutes} min
                </span>
                {done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="text-sm font-bold text-slate-900 leading-snug">
                {lesson.title}
              </div>
              <div className="text-xs text-slate-500 mt-1">{lesson.tag}</div>
            </button>
          );
        })}
      </div>

      {/* Active Lesson Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5 sm:space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900">
                {activeLesson.tag}
              </span>
              <span className="text-xs font-medium text-slate-500">
                Público: {activeLesson.targetSectors}
              </span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Concluída
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              {activeLesson.title}
            </h2>
            <p className="text-sm text-slate-600">{activeLesson.subtitle}</p>
          </div>

          {/* Key Points */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pontos Essenciais
            </h3>
            <ul className="space-y-2.5">
              {activeLesson.keyPoints.map((point, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-700 leading-relaxed"
                >
                  <span className="w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Shift Rule */}
          <div className="rounded-2xl bg-teal-50/80 border border-teal-200 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-teal-950">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              {activeLesson.shiftRuleTitle}
            </div>
            <ul className="space-y-1.5 text-sm text-teal-900">
              {activeLesson.shiftRuleSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-teal-600 font-bold">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Real Case */}
          <div className="rounded-2xl bg-rose-50/70 border border-rose-200 p-4 space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Caso Real — {activeLesson.realCase.title} ({activeLesson.realCase.year})
            </div>
            <p className="text-sm text-rose-950 leading-relaxed">
              {activeLesson.realCase.impact}
            </p>
          </div>
        </div>

        {/* Right: Quick Quiz + Guardian Seal */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Verificação Rápida (2 perguntas)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Acerte as 2 perguntas para marcar esta microaula como concluída.
              </p>
            </div>

            {activeLesson.quiz.map((question, qIndex) => {
              const selectedOption = answers[question.id];
              const hasAnswered = selectedOption !== undefined;
              const isRight = selectedOption === question.correctIndex;

              return (
                <div key={question.id} className="space-y-2.5">
                  <div className="text-sm font-bold text-slate-900">
                    {qIndex + 1}. {question.question}
                  </div>
                  <div className="space-y-2">
                    {question.options.map((option, optIdx) => {
                      const isThisSelected = selectedOption === optIdx;
                      const isThisCorrect = optIdx === question.correctIndex;

                      let buttonStyle =
                        'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100';
                      if (hasAnswered && isThisSelected && isThisCorrect) {
                        buttonStyle =
                          'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
                      } else if (hasAnswered && isThisSelected && !isThisCorrect) {
                        buttonStyle =
                          'bg-rose-50 border-rose-400 text-rose-950 font-semibold';
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(question.id, optIdx)}
                          className={`w-full min-h-11 text-left p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed transition-colors cursor-pointer ${buttonStyle}`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {hasAnswered && (
                    <div
                      className={`flex items-start gap-2 p-3 rounded-xl text-xs ${
                        isRight
                          ? 'bg-emerald-50 text-emerald-900'
                          : 'bg-rose-50 text-rose-900'
                      }`}
                    >
                      {isRight ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
                      ) : (
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" />
                      )}
                      <span>
                        <strong>{isRight ? 'Correto!' : 'Tente novamente:'}</strong>{' '}
                        {question.explanation}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {allQuestionsAnswered && allQuestionsCorrect && (
              <div className="p-3.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-xs font-bold text-emerald-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Microaula concluída com 100% de acerto!
              </div>
            )}
          </div>

          {/* Guardian Seal Card */}
          <div
            className={`rounded-2xl border p-5 space-y-3 ${
              badgeUnlocked
                ? 'bg-gradient-to-br from-teal-800 to-emerald-800 text-white border-teal-700 shadow-md'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  badgeUnlocked
                    ? 'bg-white/20 text-amber-300'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div
                  className={`text-xs font-bold uppercase tracking-wider ${
                    badgeUnlocked ? 'text-teal-200' : 'text-slate-500'
                  }`}
                >
                  Reconhecimento Contínuo
                </div>
                <div className="text-base font-extrabold">
                  Selo Guardião da Saúde
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                className={`block text-[11px] font-semibold ${
                  badgeUnlocked ? 'text-teal-100' : 'text-slate-500'
                }`}
              >
                Nome no certificado:
              </label>
              <input
                type="text"
                maxLength={INPUT_LIMITS.EMPLOYEE_NAME}
                value={employeeName}
                onChange={(e) => onChangeEmployeeName(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs font-semibold border ${
                  badgeUnlocked
                    ? 'bg-white/15 border-white/25 text-white placeholder:text-teal-200'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span>Microaulas concluídas (4/4):</span>
                <strong>
                  {completedLessons.length}/{MICRO_LESSONS.length}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Simulações corretas (mín. 3):</span>
                <strong>{correctSimulationsCount}/3</strong>
              </div>
            </div>

            {badgeUnlocked ? (
              <div className="pt-2 border-t border-white/20 text-xs text-teal-100">
                Parabéns, <strong>{employeeName}</strong>! Selo desbloqueado e
                registrado no painel de conformidade do hospital.
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
                Conclua as 4 microaulas e acerte 3 simulações para desbloquear o
                selo de plantão seguro.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
