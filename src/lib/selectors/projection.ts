/**
 * 30-Year Household Projection Engine
 *
 * Pure function — no React, no side effects.
 * Called via useProjection() hook with useMemo.
 *
 * Model:
 *  - Income:   each adult earns netIncomeMonthly until retirementYear,
 *              then receives ~60 % as simplified pension
 *  - Expenses: base household config (inflation-adjusted) +
 *              active liability payments until their endYear +
 *              child study costs (age 18-25)
 *  - Premiums: active insurance contracts until their endYear
 *  - NetWorth: starts from (assets − liabilities), grows by
 *              cashflow + investment return on positive balance
 */

import {
  Person,
  Contract,
  Asset,
  Liability,
  HouseholdConfig,
  Scenario,
  ProjectionYear,
} from '@/lib/types';

export type { ProjectionYear };  // re-export so callers import from one place

const PROJECTION_YEARS = 35;
const WAGE_REAL_GROWTH  = 0.005;   // 0.5 % real wage growth p.a.
const PENSION_RATIO     = 0.60;    // pension ≈ 60 % of last net income

export function computeProjection(
  persons:     Person[],
  contracts:   Contract[],
  assets:      Asset[],
  liabilities: Liability[],
  household:   HouseholdConfig,
  scenario:    Scenario,
  startYear:   number = new Date().getFullYear(),
): ProjectionYear[] {
  // ── Scenario overrides ────────────────────────────────────────
  const retirementOverrides = scenario.overrides.retirementAgeByPersonId ?? {};
  const inflationRate       = (scenario.overrides.inflationRate ?? 2.0) / 100;
  const extraMonthlySavings = scenario.overrides.monthlySavingsRate ?? 0;

  // ── Initial net worth ─────────────────────────────────────────
  const activeAssets       = assets.filter(a => a.isActive);
  const activeLiabilities  = liabilities.filter(l => l.isActive);
  const initAssetValue     = activeAssets.reduce((s, a) => s + a.wertAktuell, 0);
  const initLiabilityValue = activeLiabilities.reduce((s, l) => s + l.betrag, 0);
  let netWorth = initAssetValue - initLiabilityValue;

  // ── Weighted average investment return ────────────────────────
  const totalAssetValue = initAssetValue;
  const avgReturn = totalAssetValue > 0
    ? activeAssets.reduce((s, a) => s + (a.renditeProzent / 100) * a.wertAktuell, 0) / totalAssetValue
    : 0.05;

  // ── Adults and children ───────────────────────────────────────
  const adults = persons.filter(p => p.role !== 'kind');
  const kinder = persons.filter(p => p.role === 'kind');

  const results: ProjectionYear[] = [];

  for (let i = 0; i <= PROJECTION_YEARS; i++) {
    const year = startYear + i;
    const infFactor = Math.pow(1 + inflationRate, i);

    // ── Income ──────────────────────────────────────────────────
    let yearlyIncome = 0;
    let retiredCount = 0;

    for (const p of adults) {
      const retAge  = retirementOverrides[p.id] ?? p.retirementAge;
      const retYear = p.birthYear + retAge;

      if (year < retYear) {
        // Working: slight real wage growth on top of inflation
        const growthFactor = Math.pow(1 + WAGE_REAL_GROWTH, i);
        yearlyIncome += p.netIncomeMonthly * 12 * growthFactor;
      } else {
        retiredCount++;
        // Pension: PENSION_RATIO of the income they had at retirement
        const yearsWorked    = retYear - startYear;
        const growthAtRetire = Math.pow(1 + WAGE_REAL_GROWTH, Math.max(0, yearsWorked));
        yearlyIncome += p.netIncomeMonthly * 12 * growthAtRetire * PENSION_RATIO;
      }
    }

    // Life phase
    const lifePhase: ProjectionYear['lifePhase'] =
      adults.length === 0          ? 'work'
      : retiredCount === adults.length ? 'retirement'
      : retiredCount > 0            ? 'partial-retirement'
      :                               'work';

    // ── Expenses ─────────────────────────────────────────────────
    // Base living costs, inflation-adjusted
    const baseMonthly = household.wohnkostenMonatlich
      + household.lebenshaltungMonatlich
      + household.sonstigesMonatlich;
    let yearlyExpenses = baseMonthly * 12 * infFactor;

    // Active liability repayments until their endYear
    for (const l of activeLiabilities) {
      if (l.endYear >= year) {
        yearlyExpenses += l.monatlicheRate * 12;
      }
    }

    // Study costs for children aged 18–25
    for (const kind of kinder) {
      const age = year - kind.birthYear;
      if (age >= 18 && age <= 25) {
        yearlyExpenses += household.studyCostPerYear;
      }
    }

    // ── Insurance premiums ────────────────────────────────────────
    const yearlyPremiums = contracts
      .filter(c => c.active && c.endYear >= year)
      .reduce((s, c) => s + c.monthlyPremium * 12, 0);

    // ── Cashflow ──────────────────────────────────────────────────
    const netCashflow = yearlyIncome - yearlyExpenses - yearlyPremiums
      + extraMonthlySavings * 12;

    // ── Investment return on positive net worth ───────────────────
    const investReturn = netWorth > 0 ? Math.round(netWorth * avgReturn) : 0;

    // ── Update net worth ──────────────────────────────────────────
    netWorth = netWorth + netCashflow + investReturn;

    results.push({
      year,
      income:      Math.round(yearlyIncome),
      expenses:    Math.round(yearlyExpenses),
      premiums:    Math.round(yearlyPremiums),
      netCashflow: Math.round(netCashflow),
      investReturn,
      netWorth:    Math.round(netWorth),
      lifePhase,
    });
  }

  return results;
}
