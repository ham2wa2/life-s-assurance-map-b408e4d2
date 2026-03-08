/**
 * Insurance Selector — Adapter
 * 
 * Converts the unified Zustand store types to the legacy HouseholdData
 * format expected by insurance-calculator.ts.
 * 
 * The calculator (Repo 2) is kept unchanged. Only this adapter needs
 * updating when types evolve.
 */

import { Person, Contract, HouseholdConfig } from '@/lib/types';
import { HouseholdData } from '@/lib/insurance-types';

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Convert store persons + household → HouseholdData for insurance-calculator.
 * 
 * Key conversions:
 * - Person.birthYear → age = CURRENT_YEAR - birthYear
 * - Person.role 'kind' → HouseholdData.children[]
 * - Person.retirementAge (per-person) → HouseholdData.retirementAge (hauptverdiener)
 */
export function toHouseholdData(
  persons: Person[],
  household: HouseholdConfig
): HouseholdData {
  const hauptverdiener = persons.find((p) => p.role === 'hauptverdiener');
  const partner = persons.find((p) => p.role === 'partner');
  const kinder = persons.filter((p) => p.role === 'kind');

  const calcPersons: HouseholdData['persons'] = [];

  if (hauptverdiener) {
    calcPersons.push({
      name: hauptverdiener.name,
      age: CURRENT_YEAR - hauptverdiener.birthYear,
      role: 'hauptverdiener',
      netIncome: hauptverdiener.netIncomeMonthly,
    });
  }

  if (partner) {
    calcPersons.push({
      name: partner.name,
      age: CURRENT_YEAR - partner.birthYear,
      role: 'partner',
      netIncome: partner.netIncomeMonthly,
    });
  }

  return {
    persons: calcPersons,
    mortgageAmount: household.mortgageAmount,
    mortgageEndYear: household.mortgageEndYear,
    children: kinder.map((k) => ({
      name: k.name,
      age: CURRENT_YEAR - k.birthYear,
    })),
    studyCostPerYear: household.studyCostPerYear,
    retirementAge: hauptverdiener?.retirementAge ?? 67,
  };
}

/**
 * Filter contracts to types the insurance calculator understands.
 * Legacy calculator handles 'tod' and 'bu'. Others show in UI but
 * have no coverage calculation.
 */
export function toCalculatorContracts(contracts: Contract[]) {
  return contracts.map((c) => ({
    id: c.id,
    name: c.name,
    provider: c.provider,
    riskType: (['tod', 'bu', 'unfall', 'sachwerte'].includes(c.riskType)
      ? c.riskType
      : 'sonstige') as 'tod' | 'bu' | 'unfall' | 'sachwerte',
    beneficiary: c.beneficiary ?? '',
    coverageAmount: c.coverageAmount,
    monthlyPremium: c.monthlyPremium,
    endYear: c.endYear,
    active: c.active,
  }));
}
