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
import { OnboardingWizard, OnboardingResult } from '@/components/OnboardingWizard';
import { DashboardView } from '@/views/DashboardView';
import { HaushaltView } from '@/views/HaushaltView';
import { AbsicherungView } from '@/views/AbsicherungView';
import { VermoegenView } from '@/views/VermoegenView';
import { PlanungView } from '@/views/PlanungView';
import { SzenarienView } from '@/views/SzenarienView';

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
        onComplete={(result: OnboardingResult) => {
          setPersons(result.persons);
          setContracts(result.contracts);
          if (result.household) setHouseholdConfig(result.household);
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
