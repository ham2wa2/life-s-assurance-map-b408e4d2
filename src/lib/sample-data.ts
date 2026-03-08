import { HouseholdData, Contract } from './insurance-types';

export const sampleHousehold: HouseholdData = {
  persons: [
    { name: 'Max', age: 45, role: 'hauptverdiener', netIncome: 6000 },
    { name: 'Lisa', age: 43, role: 'partner', netIncome: 2000 },
  ],
  mortgageAmount: 250000,
  mortgageEndYear: 2035,
  children: [
    { name: 'Emma', age: 12 },
    { name: 'Lukas', age: 15 },
  ],
  studyCostPerYear: 8000,
  retirementAge: 67,
};

export const sampleContracts: Contract[] = [
  {
    id: '1',
    name: 'Risiko-Lebensversicherung',
    provider: 'Allianz',
    riskType: 'tod',
    beneficiary: 'Anna Müller',
    coverageAmount: 200000,
    monthlyPremium: 25,
    endYear: 2045,
    active: true,
  },
  {
    id: '2',
    name: 'Unfallversicherung (Todesfallleistung)',
    provider: 'AXA',
    riskType: 'tod',
    beneficiary: 'Anna Müller',
    coverageAmount: 30000,
    monthlyPremium: 8,
    endYear: 2050,
    active: true,
  },
  {
    id: '3',
    name: 'BU-Versicherung',
    provider: 'Allianz',
    riskType: 'bu',
    beneficiary: 'Thomas Müller',
    coverageAmount: 72000,
    monthlyPremium: 85,
    endYear: 2048,
    active: true,
  },
  {
    id: '4',
    name: 'Unfallversicherung',
    provider: 'AXA',
    riskType: 'unfall',
    coverageAmount: 50000,
    monthlyPremium: 12,
    endYear: 2050,
    active: true,
  },
];
