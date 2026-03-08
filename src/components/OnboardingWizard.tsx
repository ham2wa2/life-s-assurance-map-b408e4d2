import { useState } from 'react';
import { HouseholdData, Contract } from '@/lib/insurance-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface OnboardingWizardProps {
  onComplete: (household: HouseholdData, contracts: Contract[]) => void;
}

const STEPS = ['Haushalt', 'Einkommen', 'Kredit & Kinder', 'Verträge'];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);

  // Step 1: Household
  const [mainName, setMainName] = useState('');
  const [mainAge, setMainAge] = useState(45);
  const [hasPartner, setHasPartner] = useState(true);
  const [partnerName, setPartnerName] = useState('');
  const [partnerAge, setPartnerAge] = useState(43);

  // Step 2: Income
  const [mainIncome, setMainIncome] = useState(6000);
  const [partnerIncome, setPartnerIncome] = useState(2000);
  const [retirementAge, setRetirementAge] = useState(67);

  // Step 3: Mortgage & Kids
  const [hasMortgage, setHasMortgage] = useState(true);
  const [mortgageAmount, setMortgageAmount] = useState(250000);
  const [mortgageEndYear, setMortgageEndYear] = useState(2035);
  const [children, setChildren] = useState<{ name: string; age: number }[]>([]);
  const [studyCostPerYear, setStudyCostPerYear] = useState(8000);

  // Step 4: Contracts
  const [contracts, setContracts] = useState<Omit<Contract, 'id'>[]>([]);
  const [newContract, setNewContract] = useState({
    name: '', provider: '', riskType: 'tod' as Contract['riskType'],
    beneficiary: '', coverageAmount: 100000, monthlyPremium: 25, endYear: 2045,
  });

  const addChild = () => setChildren([...children, { name: '', age: 0 }]);
  const removeChild = (i: number) => setChildren(children.filter((_, idx) => idx !== i));
  const updateChild = (i: number, field: 'name' | 'age', value: string | number) => {
    setChildren(children.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const addContract = () => {
    if (!newContract.name.trim() || !newContract.provider.trim()) return;
    setContracts([...contracts, { ...newContract, active: true }]);
    setNewContract({ name: '', provider: '', riskType: 'tod', beneficiary: '', coverageAmount: 100000, monthlyPremium: 25, endYear: 2045 });
  };

  const removeContract = (i: number) => setContracts(contracts.filter((_, idx) => idx !== i));

  const canProceed = () => {
    if (step === 0) return mainName.trim().length > 0 && mainAge > 0 && (!hasPartner || partnerName.trim().length > 0);
    if (step === 1) return mainIncome > 0;
    if (step === 2) return !hasMortgage || (mortgageAmount > 0 && mortgageEndYear > 2026);
    return true;
  };

  const handleComplete = () => {
    const persons: HouseholdData['persons'] = [
      { name: mainName.trim(), age: mainAge, role: 'hauptverdiener', netIncome: mainIncome },
    ];
    if (hasPartner) persons.push({ name: partnerName.trim(), age: partnerAge, role: 'partner', netIncome: partnerIncome });

    const household: HouseholdData = {
      persons,
      mortgageAmount: hasMortgage ? mortgageAmount : 0,
      mortgageEndYear: hasMortgage ? mortgageEndYear : 2026,
      children: children.filter(c => c.name.trim()),
      studyCostPerYear,
      retirementAge,
    };

    const finalContracts: Contract[] = contracts.map((c, i) => ({
      ...c, id: `c-${Date.now()}-${i}`, active: true,
    }));

    onComplete(household, finalContracts);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Zeitachse Absicherung</h1>
          <p className="text-muted-foreground">Richte deine persönliche Versicherungsanalyse ein</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
              <p className={`text-xs mt-1.5 ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s}</p>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl border border-border p-6 md:p-8">
          
          {/* Step 0: Household */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-card-foreground">Wer gehört zum Haushalt?</h2>
              
              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">Hauptverdiener/in</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Name" value={mainName} onChange={e => setMainName(e.target.value)} maxLength={50} />
                  <Input type="number" placeholder="Alter" value={mainAge || ''} onChange={e => setMainAge(Math.min(99, Math.max(0, parseInt(e.target.value) || 0)))} min={18} max={99} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setHasPartner(!hasPartner)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${hasPartner ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
                >
                  {hasPartner ? '✓ Partner/in vorhanden' : 'Partner/in hinzufügen'}
                </button>
              </div>

              {hasPartner && (
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">Partner/in</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Name" value={partnerName} onChange={e => setPartnerName(e.target.value)} maxLength={50} />
                    <Input type="number" placeholder="Alter" value={partnerAge || ''} onChange={e => setPartnerAge(Math.min(99, Math.max(0, parseInt(e.target.value) || 0)))} min={18} max={99} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Income */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-card-foreground">Einkommen & Rente</h2>
              
              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">{mainName} – Nettoeinkommen (monatlich)</Label>
                <div className="flex items-center gap-3">
                  <Slider value={[mainIncome]} min={500} max={15000} step={100} onValueChange={([v]) => setMainIncome(v)} />
                  <span className="font-mono font-bold text-card-foreground min-w-[5rem] text-right">{mainIncome}€</span>
                </div>
              </div>

              {hasPartner && (
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">{partnerName} – Nettoeinkommen (monatlich)</Label>
                  <div className="flex items-center gap-3">
                    <Slider value={[partnerIncome]} min={0} max={15000} step={100} onValueChange={([v]) => setPartnerIncome(v)} />
                    <span className="font-mono font-bold text-card-foreground min-w-[5rem] text-right">{partnerIncome}€</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">Geplantes Rentenalter</Label>
                <div className="flex items-center gap-3">
                  <Slider value={[retirementAge]} min={60} max={70} step={1} onValueChange={([v]) => setRetirementAge(v)} />
                  <span className="font-mono font-bold text-card-foreground min-w-[3rem] text-right">{retirementAge}J</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Mortgage & Kids */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-card-foreground">Kredit & Kinder</h2>

              <button
                onClick={() => setHasMortgage(!hasMortgage)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${hasMortgage ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
              >
                {hasMortgage ? '✓ Immobilienkredit vorhanden' : 'Immobilienkredit hinzufügen'}
              </button>

              {hasMortgage && (
                <div className="space-y-3 p-4 rounded-lg bg-secondary/50">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Restschuld</Label>
                    <div className="flex items-center gap-3">
                      <Slider value={[mortgageAmount]} min={10000} max={1000000} step={10000} onValueChange={([v]) => setMortgageAmount(v)} />
                      <span className="font-mono font-bold text-card-foreground min-w-[5rem] text-right">{(mortgageAmount / 1000).toFixed(0)}k€</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Tilgungsende</Label>
                    <div className="flex items-center gap-3">
                      <Slider value={[mortgageEndYear]} min={2027} max={2055} step={1} onValueChange={([v]) => setMortgageEndYear(v)} />
                      <span className="font-mono font-bold text-card-foreground min-w-[3rem] text-right">{mortgageEndYear}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Children */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Kinder</Label>
                  <button onClick={addChild} className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                    + Kind hinzufügen
                  </button>
                </div>
                {children.map((child, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input placeholder="Name" value={child.name} onChange={e => updateChild(i, 'name', e.target.value)} maxLength={50} className="flex-1" />
                    <Input type="number" placeholder="Alter" value={child.age || ''} onChange={e => updateChild(i, 'age', Math.min(30, Math.max(0, parseInt(e.target.value) || 0)))} className="w-20" min={0} max={30} />
                    <button onClick={() => removeChild(i)} className="text-destructive hover:text-destructive/80 text-sm px-2">✕</button>
                  </div>
                ))}
              </div>

              {children.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Studiumskosten pro Kind/Jahr</Label>
                  <div className="flex items-center gap-3">
                    <Slider value={[studyCostPerYear]} min={0} max={20000} step={500} onValueChange={([v]) => setStudyCostPerYear(v)} />
                    <span className="font-mono font-bold text-card-foreground min-w-[5rem] text-right">{(studyCostPerYear / 1000).toFixed(1)}k€</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Contracts */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-card-foreground">Bestehende Verträge</h2>
              
              {/* Existing contracts list */}
              {contracts.length > 0 && (
                <div className="space-y-2">
                  {contracts.map((c, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50">
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{c.provider} · {c.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {(c.coverageAmount / 1000).toFixed(0)}k€ · {c.monthlyPremium}€/mtl · bis {c.endYear}
                        </p>
                      </div>
                      <button onClick={() => removeContract(i)} className="text-destructive hover:text-destructive/80 text-sm px-2">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add contract form */}
              <div className="p-4 rounded-lg border border-border space-y-3">
                <p className="text-sm font-medium text-card-foreground">Vertrag hinzufügen</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Anbieter (z.B. Allianz)" value={newContract.provider} onChange={e => setNewContract({ ...newContract, provider: e.target.value })} maxLength={50} />
                  <Input placeholder="Bezeichnung" value={newContract.name} onChange={e => setNewContract({ ...newContract, name: e.target.value })} maxLength={100} />
                </div>

                <div className="flex gap-2 flex-wrap">
                  {(['tod', 'bu', 'unfall', 'sachwerte'] as const).map(rt => (
                    <button
                      key={rt}
                      onClick={() => setNewContract({ ...newContract, riskType: rt })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        newContract.riskType === rt ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {{ tod: '🛡️ Tod', bu: '💼 BU', unfall: '🚑 Unfall', sachwerte: '🏠 Sach' }[rt]}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Versicherungssumme</Label>
                  <div className="flex items-center gap-3">
                    <Slider value={[newContract.coverageAmount]} min={10000} max={500000} step={10000} onValueChange={([v]) => setNewContract({ ...newContract, coverageAmount: v })} />
                    <span className="font-mono text-sm text-card-foreground min-w-[4rem] text-right">{(newContract.coverageAmount / 1000).toFixed(0)}k€</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Beitrag/Monat (€)</Label>
                    <Input type="number" value={newContract.monthlyPremium || ''} onChange={e => setNewContract({ ...newContract, monthlyPremium: Math.min(9999, Math.max(0, parseInt(e.target.value) || 0)) })} min={1} max={9999} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Laufzeitende</Label>
                    <Input type="number" value={newContract.endYear || ''} onChange={e => setNewContract({ ...newContract, endYear: Math.min(2070, Math.max(2027, parseInt(e.target.value) || 2045)) })} min={2027} max={2070} />
                  </div>
                </div>

                <button
                  onClick={addContract}
                  disabled={!newContract.name.trim() || !newContract.provider.trim()}
                  className="w-full py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 disabled:opacity-40 transition-all"
                >
                  + Vertrag hinzufügen
                </button>
              </div>

              {contracts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Füge mindestens einen Vertrag hinzu, oder überspringe diesen Schritt.
                </p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Zurück
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all"
              >
                Weiter →
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Analyse starten 🚀
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
