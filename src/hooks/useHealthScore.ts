/**
 * useHealthScore — Computed health indicators from store state
 * Used by DashboardView and summary widgets
 */

import { useMemo } from 'react';
import { useFinanzplanStore } from '@/store/finanzplanStore';
import { HealthScore, StatusLevel } from '@/lib/types';

export interface HealthScoreDetail extends HealthScore {
  totalIncomeMonthly: number;
  totalExpensesMonthly: number;
  totalPremiumsMonthly: number;
  monthlySavings: number;
  savingsRate: number;
  netWorthValue: number;
}

export function useHealthScore(): HealthScoreDetail {
  const persons     = useFinanzplanStore((s) => s.persons);
  const contracts   = useFinanzplanStore((s) => s.contracts);
  const household   = useFinanzplanStore((s) => s.household);
  const assets      = useFinanzplanStore((s) => s.assets);
  const liabilities = useFinanzplanStore((s) => s.liabilities);

  return useMemo(() => {
    const currentYear = new Date().getFullYear();

    // ── Income ──
    const totalIncomeMonthly = persons
      .filter((p) => p.role !== 'kind')
      .reduce((s, p) => s + p.netIncomeMonthly, 0);

    // ── Fixed expenses (without mortgage — that's a liability) ──
    const totalExpensesMonthly =
      household.wohnkostenMonatlich +
      household.lebenshaltungMonatlich +
      household.sonstigesMonatlich;

    // ── Insurance premiums ──
    const totalPremiumsMonthly = contracts
      .filter((c) => c.active)
      .reduce((s, c) => s + c.monthlyPremium, 0);

    const monthlySavings = totalIncomeMonthly - totalExpensesMonthly - totalPremiumsMonthly;
    const savingsRate = totalIncomeMonthly > 0 ? monthlySavings / totalIncomeMonthly : 0;

    // ── Net Worth ──
    const totalAssets     = assets.filter((a) => a.isActive).reduce((s, a) => s + a.wertAktuell, 0);
    const totalLiabilities = liabilities.filter((l) => l.isActive).reduce((s, l) => s + l.betrag, 0);
    const netWorthValue   = totalAssets - totalLiabilities;
    const annualIncome    = totalIncomeMonthly * 12;

    // ── Score: Cashflow ──
    const cashflow: StatusLevel =
      savingsRate > 0.15 ? 'good' : savingsRate > 0 ? 'warning' : 'critical';

    // ── Score: Net Worth ──
    const netWorth: StatusLevel =
      netWorthValue > annualIncome * 3 ? 'good'
      : netWorthValue > 0             ? 'warning'
                                      : 'critical';

    // ── Score: Insurance ──
    const active = contracts.filter((c) => c.active && c.endYear >= currentYear);
    const hasTod = active.some((c) => c.riskType === 'tod');
    const hasBU  = active.some((c) => c.riskType === 'bu');
    const insurance: StatusLevel =
      hasTod && hasBU ? 'good' : hasTod || hasBU ? 'warning' : 'critical';

    // ── Score: Savings ──
    const savings: StatusLevel =
      savingsRate > 0.15 ? 'good' : savingsRate > 0.05 ? 'warning' : 'critical';

    // ── Overall ──
    const all = [insurance, cashflow, netWorth, savings];
    const overall: StatusLevel = all.includes('critical') ? 'critical'
      : all.includes('warning') ? 'warning' : 'good';

    return {
      insurance, cashflow, netWorth, savings, overall,
      totalIncomeMonthly,
      totalExpensesMonthly,
      totalPremiumsMonthly,
      monthlySavings,
      savingsRate,
      netWorthValue,
    };
  }, [persons, contracts, household, assets, liabilities]);
}
