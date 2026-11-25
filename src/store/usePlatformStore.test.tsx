import { useEffect } from 'react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  mockQuotaExceededOnSetItem,
  mountStrict,
  seedStorage,
} from '../test/reactTestHarness';
import { INPUT_LIMITS } from '../utils/validation';
import { usePlatformStore } from './usePlatformStore';

type StoreApi = ReturnType<typeof usePlatformStore>;

async function mountStore() {
  let latestStore!: StoreApi;
  function Harness() {
    const store = usePlatformStore();
    useEffect(() => {
      latestStore = store;
    });
    return null;
  }
  const mounted = await mountStrict(<Harness />);
  return {
    getStore: () => latestStore,
    ...mounted,
  };
}

describe('usePlatformStore (StrictMode + security & domain invariants)', () => {
  it('F1: initializes default seed state and persists version 1 to localStorage', async () => {
    const { getStore } = await mountStore();
    const store = getStore();
    const currentYear = new Date().getFullYear();

    expect(store.employeeName).toBe('Dra. Camila Nogueira');
    expect(store.scenarios).toHaveLength(6);
    expect(store.incidents).toHaveLength(1);
    expect(store.incidents[0].protocol).toBe(`SHH-${currentYear}-0001`);
    expect(store.completedLessons).toEqual([]);
    expect(store.lessonAnswers).toEqual({});
    expect(store.decisions).toEqual({});
    expect(store.storageWarning).toBeNull();

    const persisted = JSON.parse(
      window.localStorage.getItem('shield_health_state_v1') ?? '{}'
    ) as { version: number; protocolSequence: number };
    expect(persisted.version).toBe(1);
    expect(persisted.protocolSequence).toBe(2);
  });

  it('F1/DX-1/B5/B18: hydrates valid v0/v1 state and strips prototype keys, Bidi+CPF names, and tampered entries', async () => {
    const rawV0 =
      '{"employeeName":"Ana\\u202E 123.456.789-09","decisions":{"__proto__":{"scenarioId":"__proto__","action":"reported","isCorrect":true,"decidedAt":"2026-11-24T00:00:00.000Z"},"toString":{"scenarioId":"toString","action":"reported","isCorrect":true,"decidedAt":"2026-11-24T00:00:00.000Z"},"lab-critical-result":{"scenarioId":"lab-critical-result","action":"reported","isCorrect":true,"decidedAt":"2026-11-24T00:00:00.000Z"}},"completedLessons":["lesson-why-health","injected-lesson"],"lessonAnswers":{"__proto__:q1":0,"lesson-why-health:q1-1":1,"lesson-why-health:q1-2":99},"protocolSequence":7}';
    seedStorage(rawV0);

    const { getStore } = await mountStore();
    const store = getStore();

    expect(store.storageWarning).toBeNull();
    expect(store.employeeName).toBe('Dra. Camila Nogueira');
    expect(Object.keys(store.decisions)).toEqual(['lab-critical-result']);
    expect(({} as Record<string, unknown>).scenarioId).toBeUndefined();
    expect(store.completedLessons).toEqual(['lesson-why-health']);
    expect(store.lessonAnswers).toEqual({ 'lesson-why-health:q1-1': 1 });

    // Empty employeeName in v1 stays empty string
    seedStorage({ version: 1, employeeName: '   ' });
    const emptyNameStore = await mountStore();
    expect(emptyNameStore.getStore().employeeName).toBe('');
  });

  it('DX-2: sets storageWarning on corrupt JSON, non-object JSON, incompatible version, and QuotaExceededError', async () => {
    seedStorage('{broken-json');
    const s1 = await mountStore();
    expect(s1.getStore().storageWarning).toBeTruthy();
    await act(async () => {
      s1.getStore().dismissStorageWarning();
    });
    expect(s1.getStore().storageWarning).toBeNull();
    await s1.unmount();

    seedStorage('[]');
    const s2 = await mountStore();
    expect(s2.getStore().storageWarning).toContain('inválidos');
    await s2.unmount();

    seedStorage({ version: 99, employeeName: 'Teste' });
    const s3 = await mountStore();
    expect(s3.getStore().storageWarning).toContain('Versão incompatível');
    await s3.unmount();

    window.localStorage.clear();
    mockQuotaExceededOnSetItem();
    const s4 = await mountStore();
    expect(s4.getStore().storageWarning).toContain('Armazenamento local cheio');

    const prevVersion = s4.getStore().resetVersion;
    vi.restoreAllMocks();
    await act(async () => {
      s4.getStore().resetDemo();
    });
    expect(s4.getStore().storageWarning).toBeNull();
    expect(s4.getStore().resetVersion).toBe(prevVersion + 1);
    expect(window.localStorage.getItem('shield_health_state_v1')).not.toBeNull();
  });

  it('B3/B18: allocates strictly unique sequential protocols in StrictMode including same-tick batching and 999999 rollover', async () => {
    const { getStore } = await mountStore();
    const year = new Date().getFullYear();

    await act(async () => {
      const r1 = getStore().reportIncident({
        sector: 'Recepção',
        channel: 'E-mail de phishing',
        summary: 'Alerta manual sequencial',
        involvesSensitiveHealthData: false,
      });
      expect(r1.ok).toBe(true);
      if (r1.ok) {
        expect(r1.incident.protocol).toBe(`SHH-${year}-0002`);
      }

      getStore().recordDecision('lab-critical-result', 'reported');
      const r2 = getStore().reportIncident({
        sector: 'Enfermagem',
        channel: 'Mensagem WhatsApp / SMS',
        summary: 'Alerta no mesmo tick do simulador',
        involvesSensitiveHealthData: true,
      });
      expect(r2.ok).toBe(true);
      if (r2.ok) {
        expect(r2.incident.protocol).toBe(`SHH-${year}-0004`);
      }
    });

    const protocols = getStore().incidents.map((inc) => inc.protocol);
    expect(new Set(protocols).size).toBe(protocols.length);
    expect(protocols).toContain(`SHH-${year}-0003`);

    // Rollover 999999 -> 1
    seedStorage({ version: 1, protocolSequence: 999999 });
    const rollover = await mountStore();
    await act(async () => {
      const rA = rollover.getStore().reportIncident({
        sector: 'Laboratório',
        channel: 'Link ou tela de login falsa',
        summary: 'Antes do rollover',
        involvesSensitiveHealthData: false,
      });
      const rB = rollover.getStore().reportIncident({
        sector: 'Laboratório',
        channel: 'Link ou tela de login falsa',
        summary: 'Após o rollover',
        involvesSensitiveHealthData: false,
      });
      expect(rA.ok && rA.incident.protocol).toBe(`SHH-${year}-999999`);
      expect(rB.ok && rB.incident.protocol).toBe(`SHH-${year}-0001`);
    });
  });

  it('B2: preserves firstAction and hadTrapClick on clicked -> reported and prevents overwrite after reported/marked_safe', async () => {
    const { getStore } = await mountStore();

    await act(async () => {
      getStore().recordDecision('lab-critical-result', 'clicked');
    });
    expect(getStore().decisions['lab-critical-result']).toMatchObject({
      action: 'clicked',
      firstAction: 'clicked',
      hadTrapClick: true,
      isCorrect: false,
    });

    await act(async () => {
      getStore().recordDecision('lab-critical-result', 'reported');
    });
    expect(getStore().decisions['lab-critical-result']).toMatchObject({
      action: 'reported',
      firstAction: 'clicked',
      hadTrapClick: true,
      isCorrect: false,
    });
    expect(
      getStore().incidents.some((inc) => inc.id === 'inc-sim-lab-critical-result')
    ).toBe(true);

    // Cannot overwrite reported
    await act(async () => {
      getStore().recordDecision('lab-critical-result', 'marked_safe');
    });
    expect(getStore().decisions['lab-critical-result'].action).toBe('reported');

    // Cannot overwrite marked_safe
    await act(async () => {
      getStore().recordDecision('lab-safe-maintenance', 'marked_safe');
    });
    await act(async () => {
      getStore().recordDecision('lab-safe-maintenance', 'clicked');
    });
    expect(getStore().decisions['lab-safe-maintenance'].action).toBe('marked_safe');
  });

  it('B8: evicts resolved incidents silently before active incidents on MAX_INCIDENTS overflow', async () => {
    const makeIncident = (idx: number, status: 'Comunicado à ANPD' | 'Em triagem TI') => ({
      id: `inc-seed-${idx}`,
      protocol: `SHH-2026-${String(idx + 1).padStart(4, '0')}`,
      reportedAt: '2026-11-24T10:00:00.000Z',
      sector: 'Recepção',
      channel: 'E-mail de phishing',
      summary: `Incidente ${idx}`,
      involvesSensitiveHealthData: false,
      status,
      source: 'manual',
      checklist: {
        containedAccess: false,
        assessedPatientData: false,
        notifiedDpo: false,
        preparedAnpdNotice: false,
      },
    });

    const mixedBatch = [
      ...Array.from({ length: 99 }, (_, i) => makeIncident(i, 'Em triagem TI')),
      makeIncident(99, 'Comunicado à ANPD'),
    ];
    seedStorage({ version: 1, incidents: mixedBatch, protocolSequence: 101 });
    const mixedStore = await mountStore();

    await act(async () => {
      const res = mixedStore.getStore().reportIncident({
        sector: 'Laboratório',
        channel: 'E-mail de phishing',
        summary: 'Novo alerta com fila mista',
        involvesSensitiveHealthData: true,
      });
      expect(res.ok).toBe(true);
    });
    expect(mixedStore.getStore().incidents).toHaveLength(INPUT_LIMITS.MAX_INCIDENTS);
    expect(mixedStore.getStore().storageWarning).toBeNull();
    expect(
      mixedStore.getStore().incidents.some((i) => i.id === 'inc-seed-99')
    ).toBe(false);
    await mixedStore.unmount();

    const activeOnly = Array.from({ length: INPUT_LIMITS.MAX_INCIDENTS }, (_, i) =>
      makeIncident(i, 'Em triagem TI')
    );
    seedStorage({ version: 1, incidents: activeOnly, protocolSequence: 201 });
    const activeStore = await mountStore();
    await act(async () => {
      activeStore.getStore().reportIncident({
        sector: 'Laboratório',
        channel: 'E-mail de phishing',
        summary: 'Novo alerta em fila 100% ativa',
        involvesSensitiveHealthData: true,
      });
    });
    expect(activeStore.getStore().incidents).toHaveLength(INPUT_LIMITS.MAX_INCIDENTS);
    expect(activeStore.getStore().storageWarning).toContain('limite máximo');
  });

  it('B9/B13: blocks whitespace and Bidi-obfuscated CPF in reportIncident while allowing 11-digit phone numbers', async () => {
    const { getStore } = await mountStore();

    await act(async () => {
      const emptyRes = getStore().reportIncident({
        sector: 'Recepção',
        channel: 'E-mail de phishing',
        summary: '   \u202E  ',
        involvesSensitiveHealthData: false,
      });
      expect(emptyRes.ok).toBe(false);

      const cpfRes = getStore().reportIncident({
        sector: 'Recepção',
        channel: 'E-mail de phishing',
        summary: 'Suspeita com CPF \u202E123.456.789-09',
        involvesSensitiveHealthData: true,
      });
      expect(cpfRes.ok).toBe(false);

      const phoneRes = getStore().reportIncident({
        sector: 'Recepção',
        channel: 'Mensagem WhatsApp / SMS',
        summary: 'Ligação suspeita do ramal 11987654321 e 08001234567',
        involvesSensitiveHealthData: false,
      });
      expect(phoneRes.ok).toBe(true);
    });
  });

  it('B1/B16/B17: enforces CPF blocks, internal-domain indicators, MAX_CUSTOM_SCENARIOS pruning, and safe deletion', async () => {
    const { getStore } = await mountStore();

    await act(async () => {
      const cpfEmailRes = getStore().launchCustomCampaign({
        sector: 'Faturamento',
        subject: 'Assunto válido',
        senderName: 'Suporte',
        senderEmail: '12345678909@teste.invalid',
        urgencyMessage: 'Mensagem normal sem CPF.',
      });
      expect(cpfEmailRes.ok).toBe(false);

      const spoofRes = getStore().launchCustomCampaign({
        sector: 'Enfermagem',
        subject: 'Troca de senha PEP',
        senderName: 'TI Central',
        senderEmail: 'ti@hospitalcentral.org.br',
        urgencyMessage: 'Confirme sua senha imediatamente.',
      });
      expect(spoofRes.ok).toBe(true);
      if (spoofRes.ok) {
        expect(spoofRes.scenario.indicators[0].label).toContain(
          'remetente interno'
        );
      }
    });

    // Launch up to MAX_CUSTOM_SCENARIOS + 1 and verify oldest scenario & its decision are pruned
    const firstCustomId = getStore().scenarios.find((s) => s.isCustomCampaign)?.id;
    expect(firstCustomId).toBeTruthy();

    await act(async () => {
      if (firstCustomId) {
        getStore().recordDecision(firstCustomId, 'reported');
      }
      for (let i = 1; i <= INPUT_LIMITS.MAX_CUSTOM_SCENARIOS; i += 1) {
        const res = getStore().launchCustomCampaign({
          sector: 'Recepção',
          subject: `Campanha lote ${i}`,
          senderName: `Remetente ${i}`,
          senderEmail: `camp${i}@teste.invalid`,
          urgencyMessage: `Mensagem simulada ${i}`,
        });
        expect(res.ok).toBe(true);
      }
    });

    const customScenarios = getStore().scenarios.filter((s) => s.isCustomCampaign);
    expect(customScenarios).toHaveLength(INPUT_LIMITS.MAX_CUSTOM_SCENARIOS);
    if (firstCustomId) {
      expect(getStore().scenarios.some((s) => s.id === firstCustomId)).toBe(false);
      expect(Object.hasOwn(getStore().decisions, firstCustomId)).toBe(false);
    }

    // Delete custom scenario removes scenario + decision; built-in scenario ignored
    const targetToDelete = customScenarios[0].id;
    await act(async () => {
      getStore().recordDecision(targetToDelete, 'marked_safe');
      getStore().deleteCustomCampaign(targetToDelete);
      getStore().deleteCustomCampaign('lab-critical-result');
    });

    expect(getStore().scenarios.some((s) => s.id === targetToDelete)).toBe(false);
    expect(Object.hasOwn(getStore().decisions, targetToDelete)).toBe(false);
    expect(
      getStore().scenarios.some((s) => s.id === 'lab-critical-result')
    ).toBe(true);
  });

  it('B5/B13: validates saveLessonAnswer bounds and setEmployeeName Bidi+CPF protection', async () => {
    const { getStore } = await mountStore();

    await act(async () => {
      getStore().saveLessonAnswer('lesson-why-health', 'q1-1', 1);
      getStore().saveLessonAnswer('lesson-why-health', 'q1-1', 99);
      getStore().saveLessonAnswer('__proto__', 'q1-1', 0);

      const badName = getStore().setEmployeeName('Ana\u202E 123.456.789-09');
      expect(badName.ok).toBe(false);

      const goodName = getStore().setEmployeeName('Dr.\u202E Carlos Lima');
      expect(goodName.ok).toBe(true);
    });

    expect(getStore().lessonAnswers).toEqual({ 'lesson-why-health:q1-1': 1 });
    expect(getStore().employeeName).toBe('Dr. Carlos Lima');
  });
});
