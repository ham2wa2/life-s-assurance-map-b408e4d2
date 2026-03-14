/**
 * AppShell — Tab navigation wrapper
 *
 * Design: One unified navy chrome bar (header + tabs merged).
 * Mobile-first: tab row scrolls horizontally on small screens.
 */

import { useRef } from 'react';
import { useFinanzplanStore } from '@/store/finanzplanStore';
import { ActiveTab } from '@/lib/types';
import { parseFinanzplanExport } from '@/lib/schemas';
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
  const { exportJSON, importData, setPersons, setContracts, setHouseholdConfig, resetStore } =
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
    const data = exportJSON();
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
      const text = await file.text();

      // First attempt: validate as new finanzplan-v2/v3 format via Zod
      let parsed: ReturnType<typeof parseFinanzplanExport> | null = null;
      try {
        parsed = parseFinanzplanExport(text);
      } catch {
        // not new format — try legacy below
      }

      if (parsed) {
        importData(parsed);
        toast({
          title: 'Import erfolgreich',
          description: `${parsed.persons.length} Personen, ${parsed.contracts.length} Verträge geladen.`,
        });
      } else {
        // Legacy format (old insurance-types.ts export)
        let raw: unknown;
        try {
          raw = JSON.parse(text);
        } catch {
          throw new Error('Ungültiges JSON-Format — die Datei kann nicht gelesen werden.');
        }
        const legacyData = raw as {
          household: {
            persons: { role: string; name: string; age: number; netIncome: number }[];
            children: { name: string; age: number }[];
            mortgageAmount: number;
            mortgageEndYear: number;
            studyCostPerYear: number;
            retirementAge: number;
          };
          contracts: Parameters<typeof setContracts>[0];
        };
        if (!legacyData?.household?.persons || !Array.isArray(legacyData.household.persons)) {
          throw new Error('Unbekanntes Dateiformat — weder Finanzplan-Export noch Legacy-Format.');
        }
        const currentYear = new Date().getFullYear();
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
        toast({
          title: 'Import erfolgreich (Legacy)',
          description: `${legacyData.contracts.length} Verträge importiert.`,
        });
      }
    } catch (err) {
      toast({
        title: 'Import fehlgeschlagen',
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
        variant: 'destructive',
      });
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Unified Chrome: Header + Tabs in one navy block ── */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-20 shadow-md">

        {/* Top row: Brand + Actions */}
        <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight leading-tight truncate">
              Zeitachse Absicherung
            </h1>
            {subtitle && (
              <p className="text-primary-foreground/55 text-xs leading-tight truncate">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors font-medium"
            >
              Import
            </button>
            <button
              onClick={handleExport}
              className="text-xs px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors font-medium"
            >
              Export
            </button>
            <button
              onClick={handleReset}
              className="text-xs px-2.5 py-1.5 rounded-md bg-red-500/80 hover:bg-red-500 transition-colors font-medium"
              title="Alle Daten löschen"
            >
              Löschen
            </button>
          </div>
        </div>

        {/* Tab row: scrollable, no overflow indicator, inside same navy bar */}
        <nav
          className="flex overflow-x-auto px-2 sm:px-4 scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                activeTab === tab.id
                  ? 'border-white text-white'
                  : 'border-transparent text-primary-foreground/60 hover:text-primary-foreground/90'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 px-4 py-5 sm:px-6 sm:py-7 md:px-8 md:py-8 w-full max-w-5xl mx-auto">
        {children}
      </main>
    </div>
  );
}
