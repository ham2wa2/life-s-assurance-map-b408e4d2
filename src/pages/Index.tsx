/**
 * Index Page — App Shell (Sprint 1)
 * 
 * State: Zustand store (no more local useState for setup)
 * Routing: tab-based via store.activeTab (no react-router within app)
 * 
 * If onboardingComplete === false → OnboardingWizard
 * If onboardingComplete === true  → Main app (currently Absicherung tab)
 */

import { useRef } from 'react';
import { useFinanzplanStore } from '@/store/finanzplanStore';
import { useInsurance } from '@/hooks/useInsurance';
import { RiskTile } from '@/components/RiskTile';
import { TimelineView } from '@/components/TimelineView';
import { SummaryBar } from '@/components/SummaryBar';
import { ContractDialog } from '@/components/ContractDialog';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { RiskType, HouseholdData, Contract } from '@/lib/insurance-types';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import { importFromJSON } from '@/lib/import-export';

// ============================================================
// DASHBOARD / ABSICHERUNG VIEW
// ============================================================

function AbsicherungView() {
  const [view, setView] = useState<'dashboard' | 'timeline'>('dashboard');
  const [timelineRisk, setTimelineRisk] = useState<RiskType>('tod');
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { household, contracts, setHousehold, setContracts } = useInsurance();
  const { exportData, importData } = useFinanzplanStore.getState();

  const openTimeline = (risk: RiskType) => {
    setTimelineRisk(risk);
    setView('timeline');
  };

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract);
    setShowContractDialog(true);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromJSON(file);
      setHousehold(data.household);
      setContracts(data.contracts);
      toast({
        title: 'Import erfolgreich',
        description: `${data.contracts.length} Verträge importiert.`,
      });
    } catch (err: unknown) {
      toast({
        title: 'Import fehlgeschlagen',
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
        variant: 'destructive',
      });
    }
    e.target.value = '';
  };

  const handleExport = () => {
    const data = exportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzplan-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (view === 'timeline') {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <TimelineView initialRisk={timelineRisk} onBack={() => setView('dashboard')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-2">
              Zeitachse Absicherung
            </h1>
            <p className="text-muted-foreground">
              {household.persons.map((p) => p.name).join(' & ')} ·{' '}
              {household.children.length} Kinder ·{' '}
              {household.mortgageAmount > 0
                ? `Kredit bis ${household.mortgageEndYear}`
                : 'Kein Kredit'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm font-medium hover:bg-accent/10 transition-colors print:hidden"
              title="JSON importieren"
            >
              📥 Import
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm font-medium hover:bg-accent/10 transition-colors print:hidden"
              title="JSON exportieren"
            >
              📤 Export
            </button>
            <button
              onClick={() => {
                setEditingContract(undefined);
                setShowContractDialog(true);
              }}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity print:hidden"
            >
              + Vertrag
            </button>
          </div>
        </div>

        <SummaryBar />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['tod', 'bu', 'unfall', 'sachwerte'] as RiskType[]).map((risk) => (
            <RiskTile
              key={risk}
              riskType={risk}
              onOpenTimeline={() => openTimeline(risk)}
              onEditContract={handleEditContract}
            />
          ))}
        </div>
      </div>

      {showContractDialog && (
        <ContractDialog
          contract={editingContract}
          onClose={() => setShowContractDialog(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// ROOT INDEX
// ============================================================

const Index = () => {
  const onboardingComplete = useFinanzplanStore((s) => s.onboardingComplete);
  const { setPersons, setContracts, setHouseholdConfig, completeOnboarding } =
    useFinanzplanStore.getState();

  if (!onboardingComplete) {
    return (
      <OnboardingWizard
        onComplete={(household: HouseholdData, contracts: Contract[]) => {
          const currentYear = new Date().getFullYear();

          // Convert HouseholdData → store types
          const persons = [
            ...household.persons.map((p) => ({
              id: crypto.randomUUID(),
              role: p.role as 'hauptverdiener' | 'partner',
              name: p.name,
              birthYear: currentYear - p.age,
              netIncomeMonthly: p.netIncome,
              retirementAge: household.retirementAge,
            })),
            ...household.children.map((k) => ({
              id: crypto.randomUUID(),
              role: 'kind' as const,
              name: k.name,
              birthYear: currentYear - k.age,
              netIncomeMonthly: 0,
              retirementAge: 67,
            })),
          ];

          setPersons(persons);
          setContracts(contracts);
          setHouseholdConfig({
            mortgageAmount: household.mortgageAmount,
            mortgageEndYear: household.mortgageEndYear,
            studyCostPerYear: household.studyCostPerYear,
          });
          completeOnboarding();
        }}
      />
    );
  }

  return <AbsicherungView />;
};

export default Index;
