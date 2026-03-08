import { useState } from 'react';
import { useInsurance } from '@/hooks/useInsurance';
import { Contract, RiskType, RISK_LABELS } from '@/lib/insurance-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface ContractDialogProps {
  contract?: Contract; // undefined = add mode
  onClose: () => void;
}

export function ContractDialog({ contract, onClose }: ContractDialogProps) {
  const { addContract, editContract, deleteContract } = useInsurance();
  const isEdit = !!contract;

  const [provider, setProvider] = useState(contract?.provider ?? '');
  const [name, setName] = useState(contract?.name ?? '');
  const [beneficiary, setBeneficiary] = useState(contract?.beneficiary ?? '');
  const [riskType, setRiskType] = useState<RiskType>(contract?.riskType ?? 'tod');
  const [coverageAmount, setCoverageAmount] = useState(contract?.coverageAmount ?? 100000);
  const [monthlyPremium, setMonthlyPremium] = useState(contract?.monthlyPremium ?? 25);
  const [endYear, setEndYear] = useState(contract?.endYear ?? 2045);

  const canSave = provider.trim().length > 0 && name.trim().length > 0 && monthlyPremium > 0;

  const handleSave = () => {
    if (!canSave) return;
    const data = {
      name: name.trim(),
      provider: provider.trim(),
      riskType,
      beneficiary: beneficiary.trim(),
      coverageAmount,
      monthlyPremium,
      endYear,
      active: contract?.active ?? true,
    };

    if (isEdit && contract) {
      editContract(contract.id, data);
    } else {
      addContract(data);
    }
    onClose();
  };

  const handleDelete = () => {
    if (contract) {
      deleteContract(contract.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 md:p-8 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-card-foreground mb-6">
          {isEdit ? 'Vertrag bearbeiten' : 'Neuer Vertrag'}
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Anbieter</Label>
              <Input placeholder="z.B. Allianz" value={provider} onChange={e => setProvider(e.target.value)} maxLength={50} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Bezeichnung</Label>
              <Input placeholder="z.B. Risiko-LV" value={name} onChange={e => setName(e.target.value)} maxLength={100} />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Begünstigter</Label>
            <Input placeholder="z.B. Max Mustermann" value={beneficiary} onChange={e => setBeneficiary(e.target.value)} maxLength={100} />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Risikotyp</Label>
            <div className="flex gap-2 flex-wrap">
              {(['tod', 'bu', 'unfall', 'sachwerte'] as const).map(rt => (
                <button
                  key={rt}
                  onClick={() => setRiskType(rt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    riskType === rt ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {RISK_LABELS[rt]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Versicherungssumme</Label>
            <div className="flex items-center gap-3">
              <Slider value={[coverageAmount]} min={5000} max={500000} step={5000} onValueChange={([v]) => setCoverageAmount(v)} />
              <span className="font-mono font-bold text-card-foreground min-w-[4rem] text-right">{(coverageAmount / 1000).toFixed(0)}k€</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Beitrag/Monat (€)</Label>
              <Input type="number" value={monthlyPremium || ''} onChange={e => setMonthlyPremium(Math.min(9999, Math.max(0, parseInt(e.target.value) || 0)))} min={1} max={9999} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Laufzeitende</Label>
              <Input type="number" value={endYear || ''} onChange={e => setEndYear(Math.min(2070, Math.max(2027, parseInt(e.target.value) || 2045)))} min={2027} max={2070} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          {isEdit && (
            <button onClick={handleDelete} className="py-3 px-4 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
              Löschen
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="py-3 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            Abbrechen
          </button>
          <button onClick={handleSave} disabled={!canSave} className="py-3 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all">
            {isEdit ? 'Speichern' : 'Hinzufügen'}
          </button>
        </div>
      </div>
    </div>
  );
}
