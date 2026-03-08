import { useState, useMemo, createContext, useContext, ReactNode } from 'react';
import { HouseholdData, Contract, YearlyNeed, AdjustmentSuggestion } from '@/lib/insurance-types';
import { calculateTimeline, generateSuggestions } from '@/lib/insurance-calculator';

interface InsuranceContextType {
  household: HouseholdData;
  contracts: Contract[];
  timeline: YearlyNeed[];
  suggestions: AdjustmentSuggestion[];
  setHousehold: (data: HouseholdData) => void;
  setContracts: (contracts: Contract[]) => void;
  toggleContract: (id: string) => void;
  updateContractAmount: (id: string, amount: number) => void;
  addContract: (data: Omit<Contract, 'id'>) => void;
  editContract: (id: string, data: Omit<Contract, 'id'>) => void;
  deleteContract: (id: string) => void;
}

const InsuranceContext = createContext<InsuranceContextType | null>(null);

interface InsuranceProviderProps {
  children: ReactNode;
  initialHousehold: HouseholdData;
  initialContracts: Contract[];
}

export function InsuranceProvider({ children, initialHousehold, initialContracts }: InsuranceProviderProps) {
  const [household, setHousehold] = useState<HouseholdData>(initialHousehold);
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);

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

  const addContract = (data: Omit<Contract, 'id'>) => {
    const newContract: Contract = { ...data, id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
    setContracts(prev => [...prev, newContract]);
  };

  const editContract = (id: string, data: Omit<Contract, 'id'>) => {
    setContracts(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteContract = (id: string) => {
    setContracts(prev => prev.filter(c => c.id !== id));
  };

  return (
    <InsuranceContext.Provider value={{
      household, contracts, timeline, suggestions,
      setHousehold, setContracts, toggleContract, updateContractAmount,
      addContract, editContract, deleteContract,
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
