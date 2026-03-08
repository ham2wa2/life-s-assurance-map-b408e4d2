/**
 * useInsurance — Compatibility Hook (Sprint 1)
 * 
 * Provides the same interface as the old InsuranceContext but reads from
 * and writes to the Zustand store. This means RiskTile, TimelineView,
 * SummaryBar, ContractDialog, AdjustmentOverlay need zero changes.
 * 
 * Migration path:
 * - Sprint 1: This file (compatibility layer)
 * - Sprint 2+: Components migrated to read from useFinanzplanStore directly
 */

import { useMemo } from 'react';
import { useFinanzplanStore } from '@/store/finanzplanStore';
import { calculateTimeline, generateSuggestions } from '@/lib/insurance-calculator';
import { toHouseholdData, toCalculatorContracts } from '@/lib/selectors/insurance';
import { HouseholdData, Contract as LegacyContract } from '@/lib/insurance-types';
import { Contract } from '@/lib/types';

// Re-export types that components import from here
export type { HouseholdData };

export function useInsurance() {
  const persons = useFinanzplanStore((s) => s.persons);
  const household = useFinanzplanStore((s) => s.household);
  const contracts = useFinanzplanStore((s) => s.contracts);

  const { addContract, updateContract, deleteContract, toggleContract, setContracts } =
    useFinanzplanStore.getState();

  // Convert store types → legacy HouseholdData for calculator
  const legacyHousehold = useMemo(
    () => toHouseholdData(persons, household),
    [persons, household]
  );

  // Convert contracts for calculator (maps riskType to known values)
  const legacyContracts = useMemo(
    () => toCalculatorContracts(contracts),
    [contracts]
  );

  // Computed values (memoized)
  const timeline = useMemo(
    () => calculateTimeline(legacyHousehold, legacyContracts),
    [legacyHousehold, legacyContracts]
  );

  const suggestions = useMemo(
    () => generateSuggestions(legacyHousehold, legacyContracts, timeline),
    [legacyHousehold, legacyContracts, timeline]
  );

  // --- Actions ---

  const handleSetHousehold = (data: HouseholdData) => {
    // This path is used by import — convert back to store format
    const currentYear = new Date().getFullYear();
    const store = useFinanzplanStore.getState();
    
    // Update household config
    store.setHouseholdConfig({
      mortgageAmount: data.mortgageAmount,
      mortgageEndYear: data.mortgageEndYear,
      studyCostPerYear: data.studyCostPerYear,
    });

    // Rebuild persons
    const newPersons = data.persons.map((p, i) => {
      const existing = store.persons.find((sp) => sp.role === p.role);
      return {
        id: existing?.id ?? crypto.randomUUID(),
        role: p.role as 'hauptverdiener' | 'partner',
        name: p.name,
        birthYear: currentYear - p.age,
        netIncomeMonthly: p.netIncome,
        retirementAge: existing?.retirementAge ?? data.retirementAge,
      };
    });

    // Add kinder
    const kinderPersons = data.children.map((k) => {
      const existing = store.persons.find(
        (sp) => sp.role === 'kind' && sp.name === k.name
      );
      return {
        id: existing?.id ?? crypto.randomUUID(),
        role: 'kind' as const,
        name: k.name,
        birthYear: currentYear - k.age,
        netIncomeMonthly: 0,
        retirementAge: 67,
      };
    });

    store.setPersons([...newPersons, ...kinderPersons]);
  };

  const handleSetContracts = (legacyContracts: LegacyContract[]) => {
    // Convert legacy contracts to unified type (already compatible)
    const storeContracts: Contract[] = legacyContracts.map((c) => ({
      ...c,
      // riskType is compatible (both include tod, bu, unfall, sachwerte)
    }));
    setContracts(storeContracts);
  };

  const handleUpdateContractAmount = (id: string, amount: number) => {
    const contract = contracts.find((c) => c.id === id);
    if (!contract) return;
    const ratio = amount / contract.coverageAmount;
    updateContract(id, {
      coverageAmount: amount,
      monthlyPremium: Math.round(contract.monthlyPremium * ratio),
    });
  };

  const handleAddContract = (data: Omit<LegacyContract, 'id'>) => {
    addContract({
      ...data,
      beneficiary: data.beneficiary,
    });
  };

  const handleEditContract = (id: string, data: Omit<LegacyContract, 'id'>) => {
    updateContract(id, { ...data });
  };

  return {
    // Data (in legacy format for backward compat with existing components)
    household: legacyHousehold,
    contracts: legacyContracts,
    timeline,
    suggestions,

    // Actions
    setHousehold: handleSetHousehold,
    setContracts: handleSetContracts,
    toggleContract,
    updateContractAmount: handleUpdateContractAmount,
    addContract: handleAddContract,
    editContract: handleEditContract,
    deleteContract,
  };
}
