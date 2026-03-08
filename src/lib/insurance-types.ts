export type RiskType = 'tod' | 'bu' | 'unfall' | 'sachwerte';

export interface Person {
  name: string;
  age: number;
  role: 'hauptverdiener' | 'partner';
  netIncome: number; // monthly
}

export interface Milestone {
  year: number;
  label: string;
  type: 'kredit' | 'kind' | 'rente' | 'custom';
}

export interface Contract {
  id: string;
  name: string;
  provider: string;
  riskType: RiskType;
  beneficiary: string;
  coverageAmount: number;
  monthlyPremium: number;
  endYear: number;
  active: boolean;
}

export interface HouseholdData {
  persons: Person[];
  mortgageAmount: number;
  mortgageEndYear: number;
  children: { age: number; name: string }[];
  studyCostPerYear: number;
  retirementAge: number;
}

export interface YearlyNeed {
  year: number;
  todNeed: number;
  buNeed: number;
  todCoverage: number;
  buCoverage: number;
  todStatus: 'green' | 'yellow' | 'red' | 'over';
  buStatus: 'green' | 'yellow' | 'red' | 'over';
}

export interface AdjustmentSuggestion {
  contractId: string;
  year: number;
  currentAmount: number;
  suggestedAmount: number;
  monthlySaving: number;
  reason: string;
}

export const RISK_LABELS: Record<RiskType, string> = {
  tod: 'Todesfall',
  bu: 'Berufsunfähigkeit',
  unfall: 'Unfall',
  sachwerte: 'Sachwerte',
};

export const RISK_ICONS: Record<RiskType, string> = {
  tod: '🛡️',
  bu: '💼',
  unfall: '🚑',
  sachwerte: '🏠',
};
