/**
 * Index Page — App Shell with multi-tab routing (Sprint 2)
 *
 * Flow:
 *   onboardingComplete === false  →  OnboardingWizard
 *   onboardingComplete === true   →  AppShell + active tab view
 *
 * Tabs: dashboard | haushalt | absicherung | vermoegen | planung | szenarien
 */

import { useFinanzplanStore } from '@/store/finanzplanStore';
import { AppShell } from '@/components/AppShell';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { DashboardView } from '@/views/DashboardView';
import { HaushaltView } from '@/views/HaushaltView';
import { AbsicherungView } from '@/views/AbsicherungView';
import { VermoegenView, PlanungView, SzenarienView } from '@/views/PlaceholderView';
import { HouseholdData, Contract } from '@/lib/insurance-types';

// ── Tab Router ────────────────────────────────────────────────

function TabContent() {
  const activeTab = useFinanzplanStore((s) => s.activeTab);

  switch (activeTab) {
    case 'dashboard':   return <DashboardView />;
    case 'haushalt':    return <HaushaltView />;
    case 'absicherung': return <AbsicherungView />;
    case 'vermoegen':   return <VermoegenView />;
    case 'planung':     return <PlanungView />;
    case 'szenarien':   return <SzenarienView />;
    default:            return <DashboardView />;
  }
}

// ── Root ──────────────────────────────────────────────────────

const Index = () => {
  const onboardingComplete = useFinanzplanStore((s) => s.onboardingComplete);
  const { setPersons, setContracts, setHouseholdConfig, completeOnboarding } =
    useFinanzplanStore.getState();

  if (!onboardingComplete) {
    return (
      <OnboardingWizard
        onComplete={(household: HouseholdData, contracts: Contract[]) => {
          const currentYear = new Date().getFullYear();

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

  return (
    <AppShell>
      <TabContent />
    </AppShell>
  );
};

export default Index;
