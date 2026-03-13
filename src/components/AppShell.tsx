/**
 * AppShell — Tab navigation wrapper (Sprint 2)
 * Fixed header + sticky tab bar + content area
 */

import { useRef } from 'react';
import { useFinanzplanStore } from '@/store/finanzplanStore';
import { ActiveTab } from '@/lib/types';
import { importFromJSON } from '@/lib/import-export';
import { toast } from '@/hooks/use-toast';

const TABS: { id: ActiveTab; label: string }[] = [
  { id: 'dashboard',   label: 'Dashboard' },
  { id: 'haushalt',    label: 'Haushalt' },
  { id: 'absicherung', label: 'Absicherung' },
  { id: 'vermoegen',   label: 'Vermögen' },
  { id: 'planung',     label: 'Planung' },
  { id: 'szenarien',   label: 'Szenarien' },
];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTab = useFinanzplanStore((s) => s.activeTab);
  const setActiveTab = useFinanzplanStore((s) => s.setActiveTab);
  const persons = useFinanzplanStore((s) => s.persons);
  const { exportData, importData, setPersons, setContracts, setHouseholdConfig, resetStore } =
    useFinanzplanStore.getState();

  const handleReset = () => {
    if (window.confirm('Alle Daten löschen und von vorne beginnen?')) {
      resetStore();
    }
  };

  const subtitle = persons
    .filter((p) => p.role !== 'kind')
    .map((p) => p.name)
    .filter(Boolean)
    .join(' & ');

  const handleExport = () => {
    const data = exportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzplan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromJSON(file);
      // Try new format first
      if ('persons' in data && 'contracts' in data) {
        importData(data as Parameters<typeof importData>[0]);
        toast({ title: 'Import erfolgreich', description: 'Daten wurden geladen.' });
      } else {
        // Legacy format
        const currentYear = new Date().getFullYear();
        const legacyData = data as { household: { persons: { role: string; name: string; age: number; netIncome: number }[]; children: { name: string; age: number }[]; mortgageAmount: number; mortgageEndYear: number; studyCostPerYear: number; retirementAge: number }; contracts: Parameters<typeof setContracts>[0] };
        const newPersons = [
          ...legacyData.household.persons.map((p) => ({
            id: crypto.randomUUID(),
            role: p.role as 'hauptverdiener' | 'partner',
            name: p.name,
            birthYear: currentYear - p.age,
            netIncomeMonthly: p.netIncome,
            retirementAge: legacyData.household.retirementAge ?? 67,
          })),
          ...legacyData.household.children.map((k) => ({
            id: crypto.randomUUID(),
            role: 'kind' as const,
            name: k.name,
            birthYear: currentYear - k.age,
            netIncomeMonthly: 0,
            retirementAge: 67,
          })),
        ];
        setPersons(newPersons);
        setContracts(legacyData.contracts);
        setHouseholdConfig({
          mortgageAmount: legacyData.household.mortgageAmount,
          mortgageEndYear: legacyData.household.mortgageEndYear,
          studyCostPerYear: legacyData.household.studyCostPerYear,
        });
        toast({ title: 'Import erfolgreich (Legacy)', description: `${legacyData.contracts.length} Verträge importiert.` });
      }
    } catch (err) {
      toast({ title: 'Import fehlgeschlagen', description: err instanceof Error ? err.message : 'Fehler', variant: 'destructive' });
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <header className="bg-primary text-primary-foreground px-6 py-3 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div>
          <h1 className="text-base font-bold tracking-tight leading-tight">Zeitachse Absicherung</h1>
          {subtitle && (
            <p className="text-primary-foreground/60 text-xs leading-tight">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors font-medium"
          >
            Import
          </button>
          <button
            onClick={handleExport}
            className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors font-medium"
          >
            Export
          </button>
          <button
            onClick={handleReset}
            className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-red-500/60 transition-colors font-medium"
            title="Alle Daten löschen"
          >
            🗑 Löschen
          </button>
        </div>
      </header>

      {/* ── Tab Bar ── */}
      <nav className="bg-card border-b border-border px-4 flex overflow-x-auto sticky top-[52px] z-10 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Content ── */}
      <main className="flex-1 p-6 md:p-8 w-full max-w-5xl mx-auto">
        {children}
      </main>
    </div>
  );
}
