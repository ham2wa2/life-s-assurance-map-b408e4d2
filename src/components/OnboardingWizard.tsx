/**
 * OnboardingWizard — Sprint 2.5
 *
 * Flow:
 *   Welcome → [Import (→ store, done)] | [Neu → Step 0..3 → onComplete]
 *
 * Step 0: Haushalt (Personen)
 * Step 1: Einkommen & Rentenalter
 * Step 2: Kredit & Kinder
 * Step 3: Verträge (mit Person-Zuordnung, Rentenverträge, Mehrfachleistung)
 */

import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Contract,
  ContractRiskType,
  GesetzlicheRenteData,
  Leistung,
  Person,
  HouseholdConfig,
} from '@/lib/types';
import { useFinanzplanStore } from '@/store/finanzplanStore';
import type { FinanzplanExport } from '@/lib/types';

// ── Props ─────────────────────────────────────────────────────

export interface OnboardingResult {
  persons: Person[];
  contracts: Contract[];
  household: Partial<HouseholdConfig>;
}

interface OnboardingWizardProps {
  onComplete: (result: OnboardingResult) => void;
}

// ── Constants ─────────────────────────────────────────────────

const STEPS = ['Haushalt', 'Einkommen', 'Kredit & Kinder', 'Verträge'];
const CURRENT_YEAR = new Date().getFullYear();

const SCHUTZ_TYPES: { type: ContractRiskType; label: string }[] = [
  { type: 'tod',        label: '🛡️ Tod' },
  { type: 'bu',         label: '💼 BU' },
  { type: 'kranken',    label: '🏥 Kranken' },
  { type: 'haftpflicht',label: '⚖️ Haftpflicht' },
  { type: 'unfall',     label: '🚑 Unfall' },
  { type: 'sachwerte',  label: '🏠 Sach' },
  { type: 'sonstige',   label: '📋 Sonstige' },
];

const ALTERSVORSORGE_TYPES: { type: ContractRiskType; label: string }[] = [
  { type: 'gesetzliche_rente', label: '🏛️ Gesetzl. Rente' },
  { type: 'private_rente',     label: '💰 Private Rente' },
  { type: 'kapitalbildend',    label: '📈 Kapitalbildend' },
];

const EMPTY_GRV: GesetzlicheRenteData = {
  renteBeiSofortigem: 0,
  renteMitStandardAnnahme: 0,
  renteBeiGleichbleibendem: 0,
  bescheidJahr: CURRENT_YEAR - 1,
};

const EMPTY_CONTRACT = {
  name: '',
  provider: '',
  riskType: 'tod' as ContractRiskType,
  beneficiary: '',
  coverageAmount: 100000,
  monthlyPremium: 25,
  endYear: 2045,
  personIdx: 0,                 // 0 = hauptverdiener, 1 = partner
  grv: { ...EMPTY_GRV },
  zusatzTyp: 'bu' as ContractRiskType,
  zusatzBetrag: 0,
  hasZusatz: false,
};

// ── Helper ────────────────────────────────────────────────────

const uid = () => crypto.randomUUID();

const isAltersvorsorge = (t: ContractRiskType) =>
  t === 'gesetzliche_rente' || t === 'private_rente' || t === 'kapitalbildend';

// ── Component ─────────────────────────────────────────────────

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const importData = useFinanzplanStore((s) => s.importData);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Mode: welcome or wizard steps
  const [mode, setMode] = useState<'welcome' | 'wizard'>('welcome');
  const [step, setStep] = useState(0);

  // ── Step 0: Haushalt ──────────────────────────────────────
  const [mainName, setMainName] = useState('');
  const [mainAge, setMainAge] = useState(45);
  const [hasPartner, setHasPartner] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerAge, setPartnerAge] = useState(43);

  // ── Step 1: Einkommen ─────────────────────────────────────
  const [mainIncome, setMainIncome] = useState(6000);
  const [partnerIncome, setPartnerIncome] = useState(2000);
  const [mainRetirementAge, setMainRetirementAge] = useState(67);
  const [partnerRetirementAge, setPartnerRetirementAge] = useState(67);

  // ── Step 2: Kredit & Kinder ───────────────────────────────
  const [hasMortgage, setHasMortgage] = useState(false);
  const [mortgageAmount, setMortgageAmount] = useState(250000);
  const [mortgageEndYear, setMortgageEndYear] = useState(2035);
  const [children, setChildren] = useState<{ name: string; age: number }[]>([]);
  const [studyCostPerYear, setStudyCostPerYear] = useState(8000);

  // ── Step 3: Verträge ──────────────────────────────────────
  const [contracts, setContracts] = useState<Omit<Contract, 'id'>[]>([]);
  const [nc, setNc] = useState({ ...EMPTY_CONTRACT });

  // ── Import ────────────────────────────────────────────────

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as FinanzplanExport;
        importData(data);
        // importData sets onboardingComplete = true → Index.tsx switches to AppShell
      } catch {
        alert('Ungültige Datei — bitte eine exportierte Finanzplan-JSON-Datei auswählen.');
      }
    };
    reader.readAsText(file);
  };

  // ── Person list (for contract person selector) ────────────

  const personList = [
    { idx: 0, name: mainName || 'Hauptverdiener/in', role: 'hauptverdiener' as const },
    ...(hasPartner
      ? [{ idx: 1, name: partnerName || 'Partner/in', role: 'partner' as const }]
      : []),
  ];

  // ── Contract helpers ──────────────────────────────────────

  const addContract = () => {
    if (!nc.name.trim() || !nc.provider.trim()) return;

    const person = personList[nc.personIdx] ?? personList[0];
    const personTempId = `temp-${person.role}`; // resolved to real UUID in onComplete

    const leistungen: Leistung[] = nc.hasZusatz && nc.zusatzBetrag > 0
      ? [{ typ: nc.zusatzTyp, betrag: nc.zusatzBetrag }]
      : [];

    const base: Omit<Contract, 'id'> = {
      riskType: nc.riskType,
      provider: nc.provider.trim(),
      name: nc.name.trim(),
      coverageAmount: nc.coverageAmount,
      monthlyPremium: nc.monthlyPremium,
      endYear: nc.endYear,
      beneficiary: nc.beneficiary.trim() || undefined,
      personId: personTempId,
      active: true,
      leistungen: leistungen.length > 0 ? leistungen : undefined,
      gesetzlicheRente:
        nc.riskType === 'gesetzliche_rente' ? { ...nc.grv } : undefined,
    };

    setContracts([...contracts, base]);
    setNc({ ...EMPTY_CONTRACT });
  };

  const removeContract = (i: number) =>
    setContracts(contracts.filter((_, idx) => idx !== i));

  // ── Validation ────────────────────────────────────────────

  const canProceed = () => {
    if (step === 0) return mainName.trim().length > 0 && (!hasPartner || partnerName.trim().length > 0);
    if (step === 1) return mainIncome > 0;
    if (step === 2) return !hasMortgage || (mortgageAmount > 0 && mortgageEndYear > CURRENT_YEAR);
    return true;
  };

  // ── Complete ──────────────────────────────────────────────

  const handleComplete = () => {
    // Create persons with real UUIDs
    const mainId = uid();
    const partnerId = uid();

    const persons: Person[] = [
      {
        id: mainId,
        role: 'hauptverdiener',
        name: mainName.trim(),
        birthYear: CURRENT_YEAR - mainAge,
        netIncomeMonthly: mainIncome,
        retirementAge: mainRetirementAge,
      },
      ...(hasPartner
        ? [{
            id: partnerId,
            role: 'partner' as const,
            name: partnerName.trim(),
            birthYear: CURRENT_YEAR - partnerAge,
            netIncomeMonthly: partnerIncome,
            retirementAge: partnerRetirementAge,
          }]
        : []),
      ...children
        .filter((c) => c.name.trim())
        .map((c) => ({
          id: uid(),
          role: 'kind' as const,
          name: c.name.trim(),
          birthYear: CURRENT_YEAR - c.age,
          netIncomeMonthly: 0,
          retirementAge: 67,
        })),
    ];

    // Resolve temp personIds → real UUIDs
    const resolvedContracts: Contract[] = contracts.map((c, i) => ({
      ...c,
      id: uid(),
      personId:
        c.personId === 'temp-hauptverdiener' ? mainId
        : c.personId === 'temp-partner'      ? partnerId
        : undefined,
    }));

    onComplete({
      persons,
      contracts: resolvedContracts,
      household: {
        mortgageAmount: hasMortgage ? mortgageAmount : 0,
        mortgageEndYear: hasMortgage ? mortgageEndYear : CURRENT_YEAR,
        studyCostPerYear,
      },
    });
  };

  // ── Render: Welcome ───────────────────────────────────────

  if (mode === 'welcome') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1a2744 0%, #0f1829 50%, #1a2744 100%)' }}
      >
        {/* Radial glow — top left */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: -100, left: -100,
            width: 400, height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(96,165,250,0.08) 0%, transparent 70%)',
          }}
        />
        {/* Radial glow — bottom right */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: -80, right: -80,
            width: 300, height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(96,165,250,0.06) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 w-full max-w-sm">

          {/* App icon */}
          <div
            className="mx-auto mb-7 flex items-center justify-center text-3xl"
            style={{
              width: 64, height: 64,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            🛡️
          </div>

          {/* Title */}
          <h1
            className="font-bold text-white mb-3"
            style={{ fontSize: 36, lineHeight: 1.15 }}
          >
            Dein Finanzplan auf einen Blick
          </h1>

          {/* Tagline */}
          <p
            className="text-sm mb-9 mx-auto max-w-xs leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            Absicherung · Vermögen · Vorsorge —<br />alles lokal, alles privat.
          </p>

          {/* Primary CTA */}
          <button
            onClick={() => setMode('wizard')}
            className="block w-full max-w-xs mx-auto mb-2.5 py-3.5 rounded-xl text-sm font-semibold tracking-wide hover:opacity-90 transition-opacity"
            style={{ background: 'white', color: '#1a2744' }}
          >
            Neu starten →
          </button>

          {/* Secondary CTA */}
          <button
            onClick={() => importFileRef.current?.click()}
            className="block w-full max-w-xs mx-auto py-3.5 rounded-xl text-sm font-medium transition-colors hover:brightness-110"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            Daten importieren
          </button>

          <input
            ref={importFileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFile}
          />

          {/* Privacy note */}
          <p className="mt-6 text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            🔒 Alle Daten bleiben lokal auf deinem Gerät
          </p>
        </div>
      </div>
    );
  }

  // ── Render: Wizard ────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Same navy chrome as Welcome + AppShell */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-20 shadow-md px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold tracking-tight">Zeitachse Absicherung</h1>
            <p className="text-primary-foreground/60 text-xs">Setup · Schritt {step + 1} / {STEPS.length}</p>
          </div>
          <button
            onClick={() => step === 0 ? setMode('welcome') : setStep(step - 1)}
            className="text-xs px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors font-medium"
          >
            ← Zurück
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 sm:px-6 py-6 w-full max-w-xl mx-auto">
        {/* Progress */}
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
              <p className={`text-xs mt-1.5 ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {s}
              </p>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl border border-border p-5 sm:p-7">

          {/* ── Step 0: Haushalt ── */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">Wer gehört zum Haushalt?</h2>

              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">Hauptverdiener/in</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Name"
                    value={mainName}
                    onChange={(e) => setMainName(e.target.value)}
                    maxLength={50}
                  />
                  <Input
                    type="number"
                    placeholder="Alter"
                    value={mainAge || ''}
                    onChange={(e) => setMainAge(Math.min(99, Math.max(18, parseInt(e.target.value) || 18)))}
                  />
                </div>
              </div>

              <button
                onClick={() => setHasPartner(!hasPartner)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  hasPartner ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {hasPartner ? '✓ Partner/in vorhanden' : '+ Partner/in hinzufügen'}
              </button>

              {hasPartner && (
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">Partner/in</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Name"
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      maxLength={50}
                    />
                    <Input
                      type="number"
                      placeholder="Alter"
                      value={partnerAge || ''}
                      onChange={(e) => setPartnerAge(Math.min(99, Math.max(18, parseInt(e.target.value) || 18)))}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 1: Einkommen ── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">Einkommen & Rentenalter</h2>

              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">
                  {mainName} – Nettoeinkommen/Monat
                </Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[mainIncome]}
                    min={500} max={15000} step={100}
                    onValueChange={([v]) => setMainIncome(v)}
                  />
                  <span className="font-mono font-bold min-w-[5rem] text-right">{mainIncome}€</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">
                  {mainName} – Rentenalter
                </Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[mainRetirementAge]}
                    min={60} max={70} step={1}
                    onValueChange={([v]) => setMainRetirementAge(v)}
                  />
                  <span className="font-mono font-bold min-w-[3rem] text-right">{mainRetirementAge}J</span>
                </div>
              </div>

              {hasPartner && (
                <>
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">
                      {partnerName} – Nettoeinkommen/Monat
                    </Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[partnerIncome]}
                        min={0} max={15000} step={100}
                        onValueChange={([v]) => setPartnerIncome(v)}
                      />
                      <span className="font-mono font-bold min-w-[5rem] text-right">{partnerIncome}€</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">
                      {partnerName} – Rentenalter
                    </Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[partnerRetirementAge]}
                        min={60} max={70} step={1}
                        onValueChange={([v]) => setPartnerRetirementAge(v)}
                      />
                      <span className="font-mono font-bold min-w-[3rem] text-right">{partnerRetirementAge}J</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step 2: Kredit & Kinder ── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">Kredit & Kinder</h2>

              <button
                onClick={() => setHasMortgage(!hasMortgage)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  hasMortgage ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {hasMortgage ? '✓ Immobilienkredit vorhanden' : '+ Immobilienkredit hinzufügen'}
              </button>

              {hasMortgage && (
                <div className="space-y-3 p-4 rounded-lg bg-secondary/50">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Restschuld</Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[mortgageAmount]}
                        min={10000} max={1000000} step={10000}
                        onValueChange={([v]) => setMortgageAmount(v)}
                      />
                      <span className="font-mono font-bold min-w-[5rem] text-right">
                        {(mortgageAmount / 1000).toFixed(0)}k€
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Tilgungsende</Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[mortgageEndYear]}
                        min={CURRENT_YEAR + 1} max={2060} step={1}
                        onValueChange={([v]) => setMortgageEndYear(v)}
                      />
                      <span className="font-mono font-bold min-w-[3rem] text-right">{mortgageEndYear}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Kinder</Label>
                  <button
                    onClick={() => setChildren([...children, { name: '', age: 0 }])}
                    className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                  >
                    + Kind hinzufügen
                  </button>
                </div>
                {children.map((child, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="Name"
                      value={child.name}
                      onChange={(e) =>
                        setChildren(children.map((c, idx) =>
                          idx === i ? { ...c, name: e.target.value } : c
                        ))
                      }
                      maxLength={50}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Alter"
                      value={child.age || ''}
                      onChange={(e) =>
                        setChildren(children.map((c, idx) =>
                          idx === i ? { ...c, age: Math.min(30, Math.max(0, parseInt(e.target.value) || 0)) } : c
                        ))
                      }
                      className="w-20"
                    />
                    <button
                      onClick={() => setChildren(children.filter((_, idx) => idx !== i))}
                      className="text-destructive hover:text-destructive/80 text-sm px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {children.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Studiumskosten pro Kind/Jahr</Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[studyCostPerYear]}
                      min={0} max={20000} step={500}
                      onValueChange={([v]) => setStudyCostPerYear(v)}
                    />
                    <span className="font-mono font-bold min-w-[5rem] text-right">
                      {(studyCostPerYear / 1000).toFixed(1)}k€
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Verträge ── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">Bestehende Verträge</h2>

              {/* Existing contracts */}
              {contracts.length > 0 && (
                <div className="space-y-2">
                  {contracts.map((c, i) => {
                    const person = personList.find(
                      (p) => `temp-${p.role}` === c.personId
                    );
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {c.provider} · {c.name}
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({person?.name ?? '—'})
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {c.riskType === 'gesetzliche_rente'
                              ? `GRV · ${c.gesetzlicheRente?.renteBeiGleichbleibendem ?? 0}€/mtl (Hochr.)`
                              : `${(c.coverageAmount / 1000).toFixed(0)}k€ · ${c.monthlyPremium}€/mtl · bis ${c.endYear}`
                            }
                          </p>
                        </div>
                        <button
                          onClick={() => removeContract(i)}
                          className="text-destructive hover:text-destructive/80 text-sm px-2"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add contract form */}
              <div className="p-4 rounded-lg border border-border space-y-4">
                <p className="text-sm font-medium">Vertrag hinzufügen</p>

                {/* Person selector */}
                {personList.length > 1 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Für wen?</Label>
                    <div className="flex gap-2">
                      {personList.map((p) => (
                        <button
                          key={p.idx}
                          onClick={() => setNc({ ...nc, personIdx: p.idx })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            nc.personIdx === p.idx
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground'
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Provider + Name */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Anbieter (z.B. Allianz)"
                    value={nc.provider}
                    onChange={(e) => setNc({ ...nc, provider: e.target.value })}
                    maxLength={50}
                  />
                  <Input
                    placeholder="Bezeichnung"
                    value={nc.name}
                    onChange={(e) => setNc({ ...nc, name: e.target.value })}
                    maxLength={100}
                  />
                </div>

                {/* Contract type — Schutz */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Schutzversicherung</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {SCHUTZ_TYPES.map(({ type, label }) => (
                      <button
                        key={type}
                        onClick={() => setNc({ ...nc, riskType: type })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          nc.riskType === type
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contract type — Altersvorsorge */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Altersvorsorge</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {ALTERSVORSORGE_TYPES.map(({ type, label }) => (
                      <button
                        key={type}
                        onClick={() => setNc({ ...nc, riskType: type })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          nc.riskType === type
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── GRV Form ── */}
                {nc.riskType === 'gesetzliche_rente' && (
                  <div className="space-y-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs font-semibold text-blue-800">
                      Werte aus dem Rentenbescheid
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Rente bei sofortigem Bezug (bereits erworben) €/mtl
                        </Label>
                        <Input
                          type="number"
                          placeholder="z.B. 1100"
                          value={nc.grv.renteBeiSofortigem || ''}
                          onChange={(e) =>
                            setNc({
                              ...nc,
                              grv: { ...nc.grv, renteBeiSofortigem: parseInt(e.target.value) || 0 },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Hochrechnung mit Standardannahmen (DRV) €/mtl
                        </Label>
                        <Input
                          type="number"
                          placeholder="z.B. 1800"
                          value={nc.grv.renteMitStandardAnnahme || ''}
                          onChange={(e) =>
                            setNc({
                              ...nc,
                              grv: { ...nc.grv, renteMitStandardAnnahme: parseInt(e.target.value) || 0 },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Hochrechnung bei gleichbleibendem Verdienst €/mtl
                        </Label>
                        <Input
                          type="number"
                          placeholder="z.B. 1650"
                          value={nc.grv.renteBeiGleichbleibendem || ''}
                          onChange={(e) =>
                            setNc({
                              ...nc,
                              grv: { ...nc.grv, renteBeiGleichbleibendem: parseInt(e.target.value) || 0 },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Jahr des letzten Rentenbescheids
                        </Label>
                        <Input
                          type="number"
                          placeholder={String(CURRENT_YEAR - 1)}
                          value={nc.grv.bescheidJahr || ''}
                          onChange={(e) =>
                            setNc({
                              ...nc,
                              grv: {
                                ...nc.grv,
                                bescheidJahr: Math.min(
                                  CURRENT_YEAR,
                                  Math.max(2000, parseInt(e.target.value) || CURRENT_YEAR - 1)
                                ),
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                    {/* coverageAmount = renteBeiGleichbleibendem for display purposes */}
                  </div>
                )}

                {/* ── Standard Form (non-GRV) ── */}
                {nc.riskType !== 'gesetzliche_rente' && (
                  <>
                    {/* Beneficiary (only for Schutz) */}
                    {!isAltersvorsorge(nc.riskType) && (
                      <Input
                        placeholder="Begünstigter (z.B. Max Mustermann)"
                        value={nc.beneficiary}
                        onChange={(e) => setNc({ ...nc, beneficiary: e.target.value })}
                        maxLength={100}
                      />
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        {nc.riskType === 'private_rente'
                          ? 'Garantierte Monatsrente (€)'
                          : nc.riskType === 'kapitalbildend'
                          ? 'Prognostizierte Ablaufleistung (€)'
                          : 'Versicherungssumme'}
                      </Label>
                      <div className="flex items-center gap-3">
                        <Slider
                          value={[nc.coverageAmount]}
                          min={1000}
                          max={nc.riskType === 'private_rente' ? 5000 : 1000000}
                          step={nc.riskType === 'private_rente' ? 50 : 10000}
                          onValueChange={([v]) => setNc({ ...nc, coverageAmount: v })}
                        />
                        <span className="font-mono text-sm min-w-[5rem] text-right">
                          {nc.riskType === 'private_rente'
                            ? `${nc.coverageAmount}€/mtl`
                            : `${(nc.coverageAmount / 1000).toFixed(0)}k€`}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Beitrag/Monat (€)</Label>
                        <Input
                          type="number"
                          value={nc.monthlyPremium || ''}
                          onChange={(e) =>
                            setNc({
                              ...nc,
                              monthlyPremium: Math.min(9999, Math.max(0, parseInt(e.target.value) || 0)),
                            })
                          }
                          min={0} max={9999}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {isAltersvorsorge(nc.riskType) ? 'Rentenbeginn' : 'Laufzeitende'}
                        </Label>
                        <Input
                          type="number"
                          value={nc.endYear || ''}
                          onChange={(e) =>
                            setNc({
                              ...nc,
                              endYear: Math.min(2080, Math.max(CURRENT_YEAR + 1, parseInt(e.target.value) || 2045)),
                            })
                          }
                          min={CURRENT_YEAR + 1} max={2080}
                        />
                      </div>
                    </div>

                    {/* Mehrfachleistung — only for Schutzversicherungen */}
                    {!isAltersvorsorge(nc.riskType) && (
                      <div className="space-y-2 pt-1 border-t border-border">
                        <button
                          onClick={() => setNc({ ...nc, hasZusatz: !nc.hasZusatz })}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {nc.hasZusatz ? '▼ Zusatzbaustein' : '+ Zusatzbaustein (Mehrfachleistung)'}
                        </button>
                        {nc.hasZusatz && (
                          <div className="flex gap-2 items-center">
                            <select
                              value={nc.zusatzTyp}
                              onChange={(e) =>
                                setNc({ ...nc, zusatzTyp: e.target.value as ContractRiskType })
                              }
                              className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                            >
                              {SCHUTZ_TYPES.filter((t) => t.type !== nc.riskType).map(({ type, label }) => (
                                <option key={type} value={type}>{label}</option>
                              ))}
                            </select>
                            <Input
                              type="number"
                              placeholder="Betrag €"
                              value={nc.zusatzBetrag || ''}
                              onChange={(e) =>
                                setNc({ ...nc, zusatzBetrag: parseInt(e.target.value) || 0 })
                              }
                              className="w-28"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <button
                  onClick={addContract}
                  disabled={
                    !nc.name.trim() ||
                    !nc.provider.trim() ||
                    (nc.riskType === 'gesetzliche_rente' &&
                      nc.grv.renteBeiSofortigem === 0 &&
                      nc.grv.renteBeiGleichbleibendem === 0)
                  }
                  className="w-full py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 disabled:opacity-40 transition-all"
                >
                  + Vertrag hinzufügen
                </button>
              </div>

              {contracts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Füge bestehende Verträge hinzu, oder überspringe diesen Schritt.
                </p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => step === 0 ? setMode('welcome') : setStep(step - 1)}
              className="flex-1 py-3 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              {step === 0 ? '← Zurück' : 'Zurück'}
            </button>
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
