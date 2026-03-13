/**
 * Finanzplan — Unified TypeScript Types
 * Version: 2.0 (React Migration, Sprint 1)
 * 
 * Storage: Zustand → localStorage["finanzplan-v2"]
 * Computed types are never stored, always derived.
 */

// ============================================================
// ENUMS
// ============================================================

/**
 * Role of a person in the household.
 * Exactly one 'hauptverdiener' required.
 */
export type PersonRole = 'hauptverdiener' | 'partner' | 'kind';

/**
 * Insurance/contract type.
 * 'tod' and 'bu' are computed by insurance-calculator.
 * Altersvorsorge types (gesetzliche_rente, private_rente, kapitalbildend) feed into Planung.
 */
export type ContractRiskType =
  | 'tod'
  | 'bu'
  | 'ruhestand'
  | 'kranken'
  | 'haftpflicht'
  | 'unfall'
  | 'sachwerte'
  | 'gesetzliche_rente'
  | 'private_rente'
  | 'kapitalbildend'
  | 'sonstige';

/** Labels for all contract types */
export const CONTRACT_TYPE_LABELS: Record<ContractRiskType, string> = {
  tod:               '🛡️ Todesfall',
  bu:                '💼 BU',
  kranken:           '🏥 Kranken',
  haftpflicht:       '⚖️ Haftpflicht',
  unfall:            '🚑 Unfall',
  sachwerte:         '🏠 Sach',
  ruhestand:         '🎯 Ruhestand',
  sonstige:          '📋 Sonstige',
  gesetzliche_rente: '🏛️ Gesetzl. Rente',
  private_rente:     '💰 Private Rente',
  kapitalbildend:    '📈 Kapitalbildend',
};

export type AssetKategorie =
  | 'immobilie'
  | 'depot'
  | 'sparbuch'
  | 'rentenversicherung'
  | 'sonstige';

export type LiabilityKategorie = 'hypothek' | 'kredit' | 'sonstige';

export type ActiveTab =
  | 'dashboard'
  | 'haushalt'
  | 'absicherung'
  | 'vermoegen'
  | 'planung'
  | 'szenarien';

export type StatusLevel = 'good' | 'warning' | 'critical';
export type CoverageStatus = 'green' | 'yellow' | 'red' | 'over';
export type LifePhase = 'work' | 'partial-retirement' | 'retirement';

// ============================================================
// STORED ENTITIES
// ============================================================

/**
 * A person in the household.
 * Replaces: HouseholdData.persons[] + HouseholdData.children[]
 */
export interface Person {
  id: string;
  role: PersonRole;
  name: string;
  /** Year of birth, e.g. 1979. age = currentYear - birthYear */
  birthYear: number;
  /** Monthly net income in €. 0 for Kinder. */
  netIncomeMonthly: number;
  /** Default: 67. Scenario overrides take precedence. */
  retirementAge: number;
}

/**
 * Three-value model for statutory pension (Gesetzliche Rentenversicherung).
 * Essential for BU scenarios: at BU date contributions stop → use renteBeiSofortigem as floor.
 */
export interface GesetzlicheRenteData {
  /** Already secured monthly pension if contributions stopped TODAY (€/month at Rentenalter) */
  renteBeiSofortigem: number;
  /** DRV projection with standard wage-growth assumptions (from Renteninformation) */
  renteMitStandardAnnahme: number;
  /** Projection if last years' contributions continue unchanged */
  renteBeiGleichbleibendem: number;
  /** Year of last Rentenbescheid, e.g. 2025 */
  bescheidJahr: number;
}

/**
 * A single benefit/coverage component within a contract (Mehrfachleistung).
 * The first Leistung is the primary one; further entries are Zusatzbausteine.
 */
export interface Leistung {
  typ: ContractRiskType;
  betrag: number;
  bezeichnung?: string;
}

/**
 * Insurance or pension contract.
 */
export interface Contract {
  id: string;
  riskType: ContractRiskType;
  provider: string;
  name: string;
  /** Coverage amount in €. For BU: annual benefit. For private_rente: monthly pension. For kapitalbildend: payout. */
  coverageAmount: number;
  /** Monthly premium in €. 0 for gesetzliche_rente. */
  monthlyPremium: number;
  /** Year contract expires/matures. For gesetzliche_rente: Renteneintrittsjahr. */
  endYear: number;
  beneficiary?: string;
  /** Person this contract belongs to (references Person.id) */
  personId?: string;
  /** Toggle for what-if analysis without deleting. */
  active: boolean;
  /** Multiple benefit types in one contract (Mehrfachleistung). */
  leistungen?: Leistung[];
  /** GRV-specific 3-value model. Only set when riskType === 'gesetzliche_rente'. */
  gesetzlicheRente?: GesetzlicheRenteData;
}

/**
 * Financial asset.
 * NOTE: Always use isActive filter for sums! (LL-009)
 */
export interface Asset {
  id: string;
  kategorie: AssetKategorie;
  bezeichnung: string;
  wertAktuell: number;
  /** Expected annual return %. Used for weighted investReturn. */
  renditeProzent: number;
  isActive: boolean;
}

/**
 * Financial liability.
 * NOTE: Always use isActive filter! (LL-009)
 */
export interface Liability {
  id: string;
  kategorie: LiabilityKategorie;
  bezeichnung: string;
  betrag: number;
  zinssatz: number;
  monatlicheRate: number;
  endYear: number;
  isActive: boolean;
}

/**
 * Monthly household expense config.
 * Mortgage repayment is on Liability, NOT here.
 */
export interface HouseholdConfig {
  wohnkostenMonatlich: number;
  lebenshaltungMonatlich: number;
  sonstigesMonatlich: number;
  /** For TOD-need calculation — when mortgage risk drops to 0. */
  mortgageEndYear: number;
  mortgageAmount: number;
  studyCostPerYear: number;
}

export interface ScenarioOverrides {
  /** personId → retirement age override */
  retirementAgeByPersonId?: Record<string, number>;
  inflationRate?: number;
  monthlySavingsRate?: number;
}

export interface Scenario {
  id: string;
  name: string;
  beschreibung: string;
  /** Exactly one must be true. Cannot delete baseline. */
  isBaseline: boolean;
  overrides: ScenarioOverrides;
}

// ============================================================
// ROOT STORE STATE
// ============================================================

export interface FinanzplanState {
  // UI
  onboardingComplete: boolean;
  activeTab: ActiveTab;
  activeScenarioId: string;

  // Data
  persons: Person[];
  contracts: Contract[];
  assets: Asset[];
  liabilities: Liability[];
  household: HouseholdConfig;
  scenarios: Scenario[];
}

// ============================================================
// COMPUTED (never stored)
// ============================================================

export interface YearlyNeed {
  year: number;
  todNeed: number;
  buNeed: number;
  todCoverage: number;
  buCoverage: number;
  todStatus: CoverageStatus;
  buStatus: CoverageStatus;
}

export interface ProjectionYear {
  year: number;
  income: number;
  /** Base living costs + liability repayments + child study costs (inflation-adjusted) */
  expenses: number;
  /** Active insurance premiums — separated from expenses for clearer cashflow analysis */
  premiums: number;
  netCashflow: number;
  /** Investment return on existing net worth (positive balance only) */
  investReturn: number;
  netWorth: number;
  lifePhase: LifePhase;
}

export interface HealthScore {
  insurance: StatusLevel;
  cashflow: StatusLevel;
  netWorth: StatusLevel;
  savings: StatusLevel;
  overall: StatusLevel;
}

export interface AdjustmentSuggestion {
  contractId: string;
  year: number;
  currentAmount: number;
  suggestedAmount: number;
  monthlySaving: number;
  reason: string;
}

// ============================================================
// EXPORT / IMPORT
// ============================================================

export interface FinanzplanExport {
  version: 1;
  exportedAt: string;
  persons: Person[];
  contracts: Contract[];
  assets: Asset[];
  liabilities: Liability[];
  household: HouseholdConfig;
  scenarios: Scenario[];
}
