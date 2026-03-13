/**
 * Unit tests for computeProjection (Phase 5)
 *
 * These tests verify the pure computation logic without any React/store deps.
 */

import { describe, it, expect } from 'vitest';
import { computeProjection } from '@/lib/selectors/projection';
import type { Person, Contract, Asset, Liability, HouseholdConfig, Scenario } from '@/lib/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BASELINE_SCENARIO: Scenario = {
  id: 'baseline',
  name: 'Basisplan',
  beschreibung: '',
  isBaseline: true,
  overrides: {},
};

const ADULT_HV: Person = {
  id: 'p1',
  role: 'hauptverdiener',
  name: 'Markus',
  birthYear: 1979,
  netIncomeMonthly: 4000,
  retirementAge: 67,
};

const ADULT_PARTNER: Person = {
  id: 'p2',
  role: 'partner',
  name: 'Andrea',
  birthYear: 1982,
  netIncomeMonthly: 3000,
  retirementAge: 67,
};

const CHILD: Person = {
  id: 'p3',
  role: 'kind',
  name: 'Emilia',
  birthYear: 2006,
  netIncomeMonthly: 0,
  retirementAge: 67,
};

const HOUSEHOLD: HouseholdConfig = {
  wohnkostenMonatlich: 1200,
  lebenshaltungMonatlich: 800,
  sonstigesMonatlich: 400,
  mortgageEndYear: 2040,
  mortgageAmount: 200000,
  studyCostPerYear: 6000,
};

const SIMPLE_ASSET: Asset = {
  id: 'a1',
  kategorie: 'depot',
  bezeichnung: 'ETF Depot',
  wertAktuell: 50000,
  renditeProzent: 7,
  isActive: true,
};

const INACTIVE_ASSET: Asset = {
  id: 'a2',
  kategorie: 'sparbuch',
  bezeichnung: 'Altes Sparbuch',
  wertAktuell: 10000,
  renditeProzent: 1,
  isActive: false,
};

const SIMPLE_LIABILITY: Liability = {
  id: 'l1',
  kategorie: 'hypothek',
  bezeichnung: 'Hypothek',
  betrag: 200000,
  zinssatz: 2.5,
  monatlicheRate: 1000,
  endYear: 2040,
  isActive: true,
};

const SIMPLE_CONTRACT: Contract = {
  id: 'c1',
  riskType: 'tod',
  provider: 'Allianz',
  name: 'Risikolebensversicherung',
  coverageAmount: 300000,
  monthlyPremium: 50,
  endYear: 2050,
  active: true,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('computeProjection', () => {
  it('returns 36 years (0 to 35 inclusive)', () => {
    const result = computeProjection([], [], [], [], HOUSEHOLD, BASELINE_SCENARIO, 2026);
    expect(result).toHaveLength(36);
    expect(result[0].year).toBe(2026);
    expect(result[35].year).toBe(2061);
  });

  it('first year income equals monthly × 12 for adults (no children)', () => {
    const result = computeProjection(
      [ADULT_HV],
      [],
      [],
      [],
      HOUSEHOLD,
      BASELINE_SCENARIO,
      2026,
    );
    // Wage growth applied from i=0 → factor = 1
    const expected = Math.round(ADULT_HV.netIncomeMonthly * 12);
    expect(result[0].income).toBe(expected);
  });

  it('person retires in correct year — income drops to ~60 %', () => {
    // Markus born 1979, retires at 67 → retirement year = 2046
    const result = computeProjection(
      [ADULT_HV],
      [],
      [],
      [],
      HOUSEHOLD,
      BASELINE_SCENARIO,
      2026,
    );
    const workYear = result.find((r) => r.year === 2045);  // still working
    const retireYear = result.find((r) => r.year === 2046); // just retired

    expect(workYear?.lifePhase).toBe('work');
    expect(retireYear?.lifePhase).toBe('retirement');
    // Pension should be < working income
    expect(retireYear!.income).toBeLessThan(workYear!.income);
  });

  it('life phase is partial-retirement when only one of two adults has retired', () => {
    // Markus born 1979 → retires 2046, Andrea born 1982 → retires 2049
    const result = computeProjection(
      [ADULT_HV, ADULT_PARTNER],
      [],
      [],
      [],
      HOUSEHOLD,
      BASELINE_SCENARIO,
      2026,
    );
    const partial = result.find((r) => r.year === 2046);
    expect(partial?.lifePhase).toBe('partial-retirement');
  });

  it('expenses include liability payments until endYear', () => {
    // Mortgage ends 2040, monthly rate 1000 → adds 12000/yr while active
    const withLiability = computeProjection(
      [],
      [],
      [],
      [SIMPLE_LIABILITY],
      HOUSEHOLD,
      BASELINE_SCENARIO,
      2026,
    );
    const withoutLiability = computeProjection(
      [],
      [],
      [],
      [],
      HOUSEHOLD,
      BASELINE_SCENARIO,
      2026,
    );
    // In 2030 (before endYear): difference should be 12000
    const idx2030 = 2030 - 2026;
    expect(withLiability[idx2030].expenses - withoutLiability[idx2030].expenses).toBe(12000);

    // In 2042 (after endYear=2040): difference should be 0
    const idx2042 = 2042 - 2026;
    expect(withLiability[idx2042].expenses - withoutLiability[idx2042].expenses).toBe(0);
  });

  it('inactive liabilities do not affect expenses', () => {
    const inactiveLib: Liability = { ...SIMPLE_LIABILITY, isActive: false };
    const withInactive = computeProjection([], [], [], [inactiveLib], HOUSEHOLD, BASELINE_SCENARIO, 2026);
    const base = computeProjection([], [], [], [], HOUSEHOLD, BASELINE_SCENARIO, 2026);
    expect(withInactive[0].expenses).toBe(base[0].expenses);
  });

  it('study costs are added for children aged 18–25', () => {
    // Emilia born 2006: ages 18–25 = years 2024–2031
    // startYear 2026: she's 20 → already in study range
    const withChild = computeProjection(
      [CHILD],
      [],
      [],
      [],
      HOUSEHOLD,
      BASELINE_SCENARIO,
      2026,
    );
    const withoutChild = computeProjection([], [], [], [], HOUSEHOLD, BASELINE_SCENARIO, 2026);

    // 2026: Emilia is 20 → study costs applied
    expect(withChild[0].expenses - withoutChild[0].expenses).toBe(HOUSEHOLD.studyCostPerYear);

    // 2033: Emilia is 27 → past study age
    const idx2033 = 2033 - 2026;
    expect(withChild[idx2033].expenses - withoutChild[idx2033].expenses).toBe(0);
  });

  it('insurance premiums are separated from expenses', () => {
    const result = computeProjection(
      [],
      [SIMPLE_CONTRACT],
      [],
      [],
      HOUSEHOLD,
      BASELINE_SCENARIO,
      2026,
    );
    // Premium in 2026: 50 × 12 = 600
    expect(result[0].premiums).toBe(600);
  });

  it('inactive assets do not contribute to initial net worth', () => {
    const withInactive = computeProjection(
      [],
      [],
      [SIMPLE_ASSET, INACTIVE_ASSET],
      [],
      HOUSEHOLD,
      BASELINE_SCENARIO,
      2026,
    );
    const withoutInactive = computeProjection(
      [],
      [],
      [SIMPLE_ASSET],
      [],
      HOUSEHOLD,
      BASELINE_SCENARIO,
      2026,
    );
    expect(withInactive[0].netWorth).toBe(withoutInactive[0].netWorth);
  });

  it('net worth grows over time when cashflow is positive', () => {
    const result = computeProjection(
      [ADULT_HV, ADULT_PARTNER],
      [],
      [SIMPLE_ASSET],
      [],
      HOUSEHOLD,
      BASELINE_SCENARIO,
      2026,
    );
    // Combined income 7000/mo → 84000/yr >> expenses 28800/yr, should grow
    expect(result[10].netWorth).toBeGreaterThan(result[0].netWorth);
  });

  it('scenario inflationRate override affects expenses', () => {
    const highInflation: Scenario = {
      ...BASELINE_SCENARIO,
      overrides: { inflationRate: 5.0 },
    };
    const noInflation: Scenario = {
      ...BASELINE_SCENARIO,
      overrides: { inflationRate: 0.0 },
    };
    const hiResult = computeProjection([], [], [], [], HOUSEHOLD, highInflation, 2026);
    const loResult = computeProjection([], [], [], [], HOUSEHOLD, noInflation, 2026);
    // After 10 years, high inflation should mean higher base expenses
    expect(hiResult[10].expenses).toBeGreaterThan(loResult[10].expenses);
  });

  it('scenario retirementAgeByPersonId overrides person default', () => {
    const earlyRetire: Scenario = {
      ...BASELINE_SCENARIO,
      overrides: { retirementAgeByPersonId: { [ADULT_HV.id]: 60 } },
    };
    // Markus born 1979, override age=60 → retires 2039
    const earlyResult = computeProjection([ADULT_HV], [], [], [], HOUSEHOLD, earlyRetire, 2026);
    const baseResult = computeProjection([ADULT_HV], [], [], [], HOUSEHOLD, BASELINE_SCENARIO, 2026);

    const idx2039 = 2039 - 2026;
    expect(earlyResult[idx2039].lifePhase).toBe('retirement');
    expect(baseResult[idx2039].lifePhase).toBe('work');
  });

  it('netCashflow = income - expenses - premiums (+ extra savings)', () => {
    const result = computeProjection(
      [ADULT_HV],
      [SIMPLE_CONTRACT],
      [],
      [],
      HOUSEHOLD,
      BASELINE_SCENARIO,
      2026,
    );
    const r = result[0];
    expect(r.netCashflow).toBe(r.income - r.expenses - r.premiums);
  });
});
