import { useId, useState } from 'react';
import { Eraser, PlusCircle, Send, Trash2 } from 'lucide-react';
import { HOSPITAL_SECTORS } from '../../types';
import type {
  CampaignLaunchResult,
  EmailScenario,
  HospitalSector,
} from '../../types';
import type { CreateCampaignInput } from '../../store/usePlatformStore';
import {
  containsPotentialCpf,
  INPUT_LIMITS,
  isValidEmailAddress,
  sanitizeText,
  stripControlAndBidiChars,
} from '../../utils/validation';

interface CampaignLauncherCardProps {
  customScenarios: EmailScenario[];
  onLaunchCampaign: (input: CreateCampaignInput) => CampaignLaunchResult;
  onDeleteCustomCampaign: (scenarioId: string) => void;
  onGoToSimulator: () => void;
}

const DEFAULT_SECTOR: HospitalSector = 'Recepção';

function buildCampaignSignature(
  sector: HospitalSector,
  senderName: string,
  senderEmail: string,
  subject: string,
  urgencyMessage: string
): string {
  return [
    sector,
    sanitizeText(senderName, INPUT_LIMITS.CAMPAIGN_SENDER_NAME).toLowerCase(),
    stripControlAndBidiChars(
      senderEmail,
      INPUT_LIMITS.CAMPAIGN_SENDER_EMAIL,
      true
    ).toLowerCase(),
    sanitizeText(subject, INPUT_LIMITS.CAMPAIGN_SUBJECT).toLowerCase(),
    sanitizeText(urgencyMessage, INPUT_LIMITS.CAMPAIGN_MESSAGE).toLowerCase(),
  ].join('|');
}

export function CampaignLauncherCard({
  customScenarios,
  onLaunchCampaign,
  onDeleteCustomCampaign,
  onGoToSimulator,
}: CampaignLauncherCardProps) {
  const [campaignSector, setCampaignSector] =
    useState<HospitalSector>(DEFAULT_SECTOR);
  const [campaignSubject, setCampaignSubject] = useState(
    'URGENTE: atualização obrigatória de senha do cadastro de pacientes'
  );
  const [campaignSenderName, setCampaignSenderName] = useState(
    'Suporte Sistemas Hospitalares'
  );
  const [campaignSenderEmail, setCampaignSenderEmail] = useState(
    'suporte@hospital-atualizacao-cad.invalid'
  );
  const [campaignMessage, setCampaignMessage] = useState(
    'Seu acesso à recepção expira em 15 minutos. Clique no link para confirmar sua credencial e manter o atendimento ativo.'
  );
  const [campaignCreatedFeedback, setCampaignCreatedFeedback] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [lastLaunchedSignature, setLastLaunchedSignature] = useState<
    string | null
  >(null);

  const sectorInputId = useId();
  const senderNameInputId = useId();
  const senderEmailInputId = useId();
  const subjectInputId = useId();
  const messageInputId = useId();

  const strippedSenderName = stripControlAndBidiChars(
    campaignSenderName,
    INPUT_LIMITS.CAMPAIGN_SENDER_NAME,
    false
  );
  const strippedSenderEmail = stripControlAndBidiChars(
    campaignSenderEmail,
    INPUT_LIMITS.CAMPAIGN_SENDER_EMAIL,
    true
  );
  const strippedSubject = stripControlAndBidiChars(
    campaignSubject,
    INPUT_LIMITS.CAMPAIGN_SUBJECT,
    false
  );
  const strippedMessage = stripControlAndBidiChars(
    campaignMessage,
    INPUT_LIMITS.CAMPAIGN_MESSAGE,
    false
  );

  const hasLiveCpf =
    containsPotentialCpf(strippedSenderName) ||
    containsPotentialCpf(strippedSenderEmail) ||
    containsPotentialCpf(strippedSubject) ||
    containsPotentialCpf(strippedMessage);

  const usesInternalDomain = strippedSenderEmail
    .toLowerCase()
    .endsWith('@hospitalcentral.org.br');

  const activeCustomCampaigns = customScenarios.filter(
    (scenario) => scenario.isCustomCampaign === true
  );

  function handleClearForm() {
    setCampaignSector(DEFAULT_SECTOR);
    setCampaignSenderName('');
    setCampaignSenderEmail('');
    setCampaignSubject('');
    setCampaignMessage('');
    setCampaignError(null);
    setCampaignCreatedFeedback(false);
    setLastLaunchedSignature(null);
  }

  function handleFieldChange() {
    if (campaignError) setCampaignError(null);
    if (campaignCreatedFeedback) setCampaignCreatedFeedback(false);
    if (lastLaunchedSignature !== null) setLastLaunchedSignature(null);
  }

  function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();

    const cleanSenderName = sanitizeText(
      campaignSenderName,
      INPUT_LIMITS.CAMPAIGN_SENDER_NAME
    );
    const cleanSubject = sanitizeText(
      campaignSubject,
      INPUT_LIMITS.CAMPAIGN_SUBJECT
    );
    const cleanMessage = sanitizeText(
      campaignMessage,
      INPUT_LIMITS.CAMPAIGN_MESSAGE
    );

    if (!cleanSubject || !cleanSenderName || !cleanMessage) {
      setCampaignError('Preencha remetente, assunto e texto da isca educativa.');
      setCampaignCreatedFeedback(false);
      return;
    }

    if (!isValidEmailAddress(strippedSenderEmail)) {
      setCampaignError(
        'Informe um endereço de e-mail válido para a simulação.'
      );
      setCampaignCreatedFeedback(false);
      return;
    }

    if (hasLiveCpf) {
      setCampaignError(
        'Proteção LGPD: padrão semelhante a CPF detectado. Remova dados pessoais antes de enviar.'
      );
      setCampaignCreatedFeedback(false);
      return;
    }

    const signature = buildCampaignSignature(
      campaignSector,
      cleanSenderName,
      strippedSenderEmail,
      cleanSubject,
      cleanMessage
    );

    const alreadyExistsInActive = activeCustomCampaigns.some(
      (s) =>
        buildCampaignSignature(
          s.sector,
          s.senderName,
          s.senderEmail,
          s.subject,
          s.bodyParagraphs[1] ?? ''
        ) === signature
    );

    if (lastLaunchedSignature === signature || alreadyExistsInActive) {
      setCampaignError(
        'Esta campanha já foi enviada ao Simulador. Altere os campos ou exclua a anterior antes de reenviar.'
      );
      setCampaignCreatedFeedback(false);
      return;
    }

    const result = onLaunchCampaign({
      sector: campaignSector,
      subject: cleanSubject,
      senderName: cleanSenderName,
      senderEmail: strippedSenderEmail,
      urgencyMessage: cleanMessage,
    });

    if (!result.ok) {
      setCampaignError(result.error);
      setCampaignCreatedFeedback(false);
      return;
    }

    setLastLaunchedSignature(signature);
    setCampaignError(null);
    setCampaignCreatedFeedback(true);
    setCampaignSenderName('');
    setCampaignSenderEmail('');
    setCampaignSubject('');
    setCampaignMessage('');
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <PlusCircle className="w-5 h-5 text-sky-700 shrink-0" />
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Disparar Nova Simulação de Phishing
          </h2>
          <p className="text-xs text-slate-500">
            Crie uma campanha educativa segura e envie imediatamente para a
            Caixa de Entrada do Simulador.
          </p>
        </div>
      </div>

      <form noValidate onSubmit={handleCreateCampaign} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={sectorInputId}
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Setor alvo
            </label>
            <select
              id={sectorInputId}
              value={campaignSector}
              onChange={(e) => {
                setCampaignSector(e.target.value as HospitalSector);
                handleFieldChange();
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
            >
              {HOSPITAL_SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor={senderNameInputId}
                className="block text-xs font-semibold text-slate-700"
              >
                Nome do remetente falso
              </label>
              <span className="text-[11px] text-slate-400">
                {campaignSenderName.length}/{INPUT_LIMITS.CAMPAIGN_SENDER_NAME}
              </span>
            </div>
            <input
              id={senderNameInputId}
              type="text"
              maxLength={INPUT_LIMITS.CAMPAIGN_SENDER_NAME}
              value={campaignSenderName}
              onChange={(e) => {
                setCampaignSenderName(e.target.value);
                handleFieldChange();
              }}
              placeholder="Ex.: Suporte Sistemas Hospitalares"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800"
            />
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <label
              htmlFor={senderEmailInputId}
              className="block text-xs font-semibold text-slate-700"
            >
              {usesInternalDomain
                ? 'E-mail simulado (spoof de domínio interno)'
                : 'E-mail simulado (domínio externo)'}
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  usesInternalDomain
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {usesInternalDomain
                  ? 'Spoof interno (@hospitalcentral.org.br)'
                  : 'Domínio externo simulado'}
              </span>
              <span className="text-[11px] text-slate-400">
                {campaignSenderEmail.length}/{INPUT_LIMITS.CAMPAIGN_SENDER_EMAIL}
              </span>
            </div>
          </div>
          <input
            id={senderEmailInputId}
            type="email"
            maxLength={INPUT_LIMITS.CAMPAIGN_SENDER_EMAIL}
            value={campaignSenderEmail}
            onChange={(e) => {
              setCampaignSenderEmail(e.target.value);
              handleFieldChange();
            }}
            placeholder="Ex.: suporte@dominio-simulado.invalid"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor={subjectInputId}
              className="block text-xs font-semibold text-slate-700"
            >
              Assunto com gatilho de urgência
            </label>
            <span className="text-[11px] text-slate-400">
              {campaignSubject.length}/{INPUT_LIMITS.CAMPAIGN_SUBJECT}
            </span>
          </div>
          <input
            id={subjectInputId}
            type="text"
            maxLength={INPUT_LIMITS.CAMPAIGN_SUBJECT}
            value={campaignSubject}
            onChange={(e) => {
              setCampaignSubject(e.target.value);
              handleFieldChange();
            }}
            placeholder="Ex.: URGENTE: validação obrigatória de acesso"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor={messageInputId}
              className="block text-xs font-semibold text-slate-700"
            >
              Texto da isca educativa
            </label>
            <span className="text-[11px] text-slate-400">
              {campaignMessage.length}/{INPUT_LIMITS.CAMPAIGN_MESSAGE}
            </span>
          </div>
          <textarea
            id={messageInputId}
            rows={2}
            maxLength={INPUT_LIMITS.CAMPAIGN_MESSAGE}
            value={campaignMessage}
            onChange={(e) => {
              setCampaignMessage(e.target.value);
              handleFieldChange();
            }}
            placeholder="Descreva a mensagem de urgência sem dados pessoais reais."
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800"
          />
        </div>

        {hasLiveCpf && (
          <p
            role="alert"
            className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
          >
            Proteção LGPD: padrão semelhante a CPF detectado nos campos da
            campanha. Remova dados pessoais antes de enviar.
          </p>
        )}

        {campaignError && !hasLiveCpf && (
          <p
            role="alert"
            className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
          >
            {campaignError}
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="submit"
              disabled={hasLiveCpf}
              className="w-full sm:w-auto min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-700 text-white text-xs font-bold hover:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span>Enviar Simulação para o Simulador</span>
            </button>

            <button
              type="button"
              onClick={handleClearForm}
              className="w-full sm:w-auto min-h-11 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
            >
              <Eraser className="w-3.5 h-3.5 shrink-0" />
              <span>Limpar</span>
            </button>
          </div>

          {campaignCreatedFeedback && !campaignError && (
            <button
              type="button"
              onClick={onGoToSimulator}
              className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
            >
              Campanha enviada! Abrir no Simulador →
            </button>
          )}
        </div>
      </form>

      {activeCustomCampaigns.length > 0 && (
        <div className="pt-4 border-t border-slate-200 space-y-2.5">
          <div className="text-xs font-bold text-slate-700">
            Campanhas Customizadas Ativas ({activeCustomCampaigns.length})
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activeCustomCampaigns.map((scenario) => (
              <div
                key={scenario.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-800">
                    <span>{scenario.sector}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-mono text-slate-600 truncate">
                      {scenario.senderEmail}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {scenario.subject}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Excluir campanha ${scenario.subject}`}
                  onClick={() => onDeleteCustomCampaign(scenario.id)}
                  className="min-h-9 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white text-rose-700 text-xs font-semibold hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Excluir</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
