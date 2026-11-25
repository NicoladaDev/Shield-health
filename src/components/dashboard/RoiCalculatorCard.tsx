import { useId } from 'react';
import { Calculator } from 'lucide-react';
import { formatCurrencyBrl } from '../../utils/metrics';
import type { RoiEstimate } from '../../utils/metrics';

interface RoiCalculatorCardProps {
  staffCount: number;
  monthlyCostPerEmployee: number;
  roi: RoiEstimate;
  onChangeStaffCount: (count: number) => void;
  onChangeMonthlyCost: (cost: number) => void;
}

export function RoiCalculatorCard({
  staffCount,
  monthlyCostPerEmployee,
  roi,
  onChangeStaffCount,
  onChangeMonthlyCost,
}: RoiCalculatorCardProps) {
  const staffInputId = useId();
  const costInputId = useId();
  const ptBrInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-teal-700 shrink-0" />
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Calculadora de Custo-Benefício (ROI)
          </h2>
          <p className="text-xs text-slate-500">
            Compare o investimento anual em conscientização com o custo médio
            de 1 vazamento no Brasil (Brasscom).
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
            <label htmlFor={staffInputId}>
              Colaboradores treinados no hospital
            </label>
            <span className="text-teal-800 font-bold">
              {ptBrInt.format(staffCount)} pessoas
            </span>
          </div>
          <input
            id={staffInputId}
            type="range"
            aria-label="Colaboradores treinados no hospital"
            min={50}
            max={2000}
            step={50}
            value={staffCount}
            onChange={(e) => onChangeStaffCount(Number(e.target.value))}
            className="w-full accent-teal-700"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
            <label htmlFor={costInputId}>
              Custo mensal estimado por colaborador
            </label>
            <span className="text-teal-800 font-bold">
              R$ {ptBrInt.format(monthlyCostPerEmployee)}/mês
            </span>
          </div>
          <input
            id={costInputId}
            type="range"
            aria-label="Custo mensal estimado por colaborador"
            min={5}
            max={40}
            step={1}
            value={monthlyCostPerEmployee}
            onChange={(e) => onChangeMonthlyCost(Number(e.target.value))}
            className="w-full accent-teal-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div className="rounded-xl bg-teal-50 border border-teal-200 p-4">
          <div className="text-[11px] font-bold text-teal-800 uppercase">
            Investimento Anual em Treino
          </div>
          <div className="text-xl font-extrabold text-teal-950 mt-1">
            {formatCurrencyBrl(roi.annualTrainingCostBrl)}
          </div>
        </div>

        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
          <div className="text-[11px] font-bold text-rose-800 uppercase">
            Custo Médio de 1 Vazamento
          </div>
          <div className="text-xl font-extrabold text-rose-950 mt-1">
            {formatCurrencyBrl(roi.avgBreachCostBrl)}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-slate-900 text-white p-4 text-xs leading-relaxed">
        Treinar <strong>{ptBrInt.format(staffCount)} profissionais</strong>{' '}
        durante 12 meses custa{' '}
        <strong className="text-teal-300">
          {new Intl.NumberFormat('pt-BR', {
            maximumFractionDigits: 2,
          }).format(roi.costRatioTimesCheaper)}{' '}
          vezes menos
        </strong>{' '}
        que um único incidente. Evitar apenas 1 vazamento economiza{' '}
        <strong className="text-emerald-300">
          {formatCurrencyBrl(roi.netSavingsIfOneIncidentPreventedBrl)}
        </strong>
        .
      </div>
    </section>
  );
}
