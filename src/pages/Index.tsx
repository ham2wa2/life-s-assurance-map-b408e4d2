import { useState, useRef } from 'react';
import { InsuranceProvider, useInsurance } from '@/hooks/useInsurance';
import { RiskTile } from '@/components/RiskTile';
import { TimelineView } from '@/components/TimelineView';
import { SummaryBar } from '@/components/SummaryBar';
import { ContractDialog } from '@/components/ContractDialog';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { RiskType, HouseholdData, Contract } from '@/lib/insurance-types';
import { exportToJSON, exportToPDF, importFromJSON } from '@/lib/import-export';
import { toast } from '@/hooks/use-toast';

function DashboardContent({ onImport }: { onImport: (h: HouseholdData, c: Contract[]) => void }) {
  const [view, setView] = useState<'dashboard' | 'timeline'>('dashboard');
  const [timelineRisk, setTimelineRisk] = useState<RiskType>('tod');
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>();
  const { household, contracts } = useInsurance();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      onImport(data.household, data.contracts);
      toast({ title: 'Import erfolgreich', description: `${data.contracts.length} Verträge importiert.` });
    } catch (err: any) {
      toast({ title: 'Import fehlgeschlagen', description: err.message, variant: 'destructive' });
    }
    e.target.value = '';
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
              {household.persons.map(p => p.name).join(' & ')} · {household.children.length} Kinder · {household.mortgageAmount > 0 ? `Kredit bis ${household.mortgageEndYear}` : 'Kein Kredit'}
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
              onClick={() => exportToJSON(household, contracts)}
              className="px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm font-medium hover:bg-accent/10 transition-colors print:hidden"
              title="JSON exportieren"
            >
              📤 Export
            </button>
            <button
              onClick={exportToPDF}
              className="px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm font-medium hover:bg-accent/10 transition-colors print:hidden"
              title="Als PDF drucken"
            >
              🖨️ PDF
            </button>
            <button
              onClick={() => { setEditingContract(undefined); setShowContractDialog(true); }}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity print:hidden"
            >
              + Vertrag
            </button>
          </div>
        </div>

        <SummaryBar />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['tod', 'bu', 'unfall', 'sachwerte'] as RiskType[]).map(risk => (
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

const Index = () => {
  const [setup, setSetup] = useState<{ household: HouseholdData; contracts: Contract[] } | null>(null);

  const handleImport = (h: HouseholdData, c: Contract[]) => {
    setSetup({ household: h, contracts: c });
  };

  if (!setup) {
    return <OnboardingWizard onComplete={(h, c) => setSetup({ household: h, contracts: c })} />;
  }

  return (
    <InsuranceProvider key={JSON.stringify(setup)} initialHousehold={setup.household} initialContracts={setup.contracts}>
      <DashboardContent onImport={handleImport} />
    </InsuranceProvider>
  );
};

export default Index;
