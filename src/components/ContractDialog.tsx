import { useState, useMemo } from 'react';
import { useFinanzplanStore } from '@/store/finanzplanStore';
import { Contract as LegacyContract, RiskType, RISK_LABELS } from '@/lib/insurance-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface ContractDialogProps {
  contract?: LegacyContract; // undefined = add mode
  onClose: () => void;
}

export function ContractDialog({ contract, onClose }: ContractDialogProps) {
  // ── Reactive subscription: persons list only ──────────────────────────────
  // RULE: Never call .filter() inside a Zustand selector — use useMemo instead.
  // Other store reads (actions, one-time lookups) use getState() to avoid
  // creating unnecessary subscriptions that can trigger infinite re-renders.
  const allPersons = useFinanzplanStore((s) => s.persons);
  const persons    = useMemo(() => allPersons.filter((p) => p.role !== 'kind'), [allPersons]);

  const isEdit = !!contract;

  // ── Form state ────────────────────────────────────────────────────────────
  const [provider,       setProvider]      = useState(contract?.provider ?? '');
  const [name,           setName]          = useState(contract?.name ?? '');
  const [beneficiary,    setBeneficiary]   = useState(contract?.beneficiary ?? '');
  const [riskType,       setRiskType]      = useState<RiskType>(contract?.riskType ?? 'tod');
  const [coverageAmount, setCoverageAmount]= useState(contract?.coverageAmount ?? 100000);
  const [monthlyPremium, setMonthlyPremium]= useState(contract?.monthlyPremium ?? 25);
  const [endYear,        setEndYear]       = useState(contract?.endYear ?? 2045);

  // ── Person assignment ─────────────────────────────────────────────────────
  // Use a lazy initializer so we only call getState() once on mount.
  // This avoids subscribing to s.contracts which would fire on every contract change.
  const [personId, setPersonId] = useState<string | undefined>(() => {
    if (contract) {
      // Edit mode: look up existing personId from store (non-reactive one-time read)
      return useFinanzplanStore.getState().contracts.find((c) => c.id === contract.id)?.personId;
    }
    // Add mode: auto-assign if only one adult person exists
    const adults = useFinanzplanStore.getState().persons.filter((p) => p.role !== 'kind');
    return adults.length === 1 ? adults[0].id : undefined;
  });

  const canSave = provider.trim().length > 0 && name.trim().length > 0 && monthlyPremium > 0;

  const handleSave = () => {
    if (!canSave) return;

    // Non-reactive read of actions via getState() — avoids subscription overhead
    const { addContract, updateContract } = useFinanzplanStore.getState();

    // Preserve the existing `active` flag when editing
    const currentActive = isEdit && contract
      ? (useFinanzplanStore.getState().contracts.find((c) => c.id === contract.id)?.active ?? true)
      : true;

    const data = {
      name: name.trim(),
      provider: provider.trim(),
      riskType,
      beneficiary: beneficiary.trim(),
      coverageAmount,
      monthlyPremium,
      endYear,
      active: currentActive,
      ...(personId ? { personId } : {}),
    };

    if (isEdit && contract) {
      updateContract(contract.id, data);
    } else {
      addContract(data);
    }
    onClose();
  };

  const handleDelete = () => {
    if (contract) {
      useFinanzplanStore.getState().deleteContract(contract.id);
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

          {/* ── Person-Zuordnung ── */}
          {persons.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Für wen? <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2 flex-wrap">
                {persons.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPersonId(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      personId === p.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {p.name || (p.role === 'hauptverdiener' ? 'Hauptverdiener/in' : 'Partner/in')}
                  </button>
                ))}
              </div>
              {!personId && (
                <p className="text-xs text-destructive mt-1">Bitte eine Person zuordnen</p>
              )}
            </div>
          )}

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
          <button
            onClick={handleSave}
            disabled={!canSave || (persons.length > 0 && !personId)}
            className="py-3 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {isEdit ? 'Speichern' : 'Hinzufügen'}
          </button>
        </div>
      </div>
    </div>
  );
}
