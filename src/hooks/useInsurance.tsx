import { useState, useMemo, createContext, useContext, ReactNode } from 'react';
import { HouseholdData, Contract, YearlyNeed, AdjustmentSuggestion } from '@/lib/insurance-types';
import { calculateTimeline, generateSuggestions } from '@/lib/insurance-calculator';
import { sampleHousehold, sampleContracts } from '@/lib/sample-data';

interface InsuranceContextType {
  household: HouseholdData;
  contracts: Contract[];
  timeline: YearlyNeed[];
  suggestions: AdjustmentSuggestion[];
  setContracts: (contracts: Contract[]) => void;
  toggleContract: (id: string) => void;
  updateContractAmount: (id: string, amount: number) => void;
}

const InsuranceContext = createContext<InsuranceContextType | null>(null);

export function InsuranceProvider({ children }: { children: ReactNode }) {
  const [household] = useState<HouseholdData>(sampleHousehold);
  const [contracts, setContracts] = useState<Contract[]>(sampleContracts);

  const timeline = useMemo(() => calculateTimeline(household, contracts), [household, contracts]);
  const suggestions = useMemo(() => generateSuggestions(household, contracts, timeline), [household, contracts, timeline]);

  const toggleContract = (id: string) => {
    setContracts(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const updateContractAmount = (id: string, amount: number) => {
    setContracts(prev => prev.map(c => {
      if (c.id !== id) return c;
      const ratio = amount / c.coverageAmount;
      return { ...c, coverageAmount: amount, monthlyPremium: Math.round(c.monthlyPremium * ratio) };
    }));
  };

  return (
    <InsuranceContext.Provider value={{
      household, contracts, timeline, suggestions,
      setContracts, toggleContract, updateContractAmount,
    }}>
      {children}
    </InsuranceContext.Provider>
  );
}

export function useInsurance() {
  const ctx = useContext(InsuranceContext);
  if (!ctx) throw new Error('useInsurance must be used within InsuranceProvider');
  return ctx;
}
