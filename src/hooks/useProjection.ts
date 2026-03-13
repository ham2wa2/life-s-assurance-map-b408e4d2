/**
 * useProjection — React hook for the 30-year financial projection.
 *
 * Reads store state via Zustand, memoizes the result.
 * RULE: no .filter() inside Zustand selectors — always useMemo.
 */

import { useMemo } from 'react';
import { useFinanzplanStore, selectActiveScenario } from '@/store/finanzplanStore';
import { computeProjection, ProjectionYear } from '@/lib/projection';
import { Scenario } from '@/lib/types';

export type { ProjectionYear };

/**
 * Returns the 30-year projection for a given scenario (defaults to active scenario).
 */
export function useProjection(scenarioOverride?: Scenario): ProjectionYear[] {
  const persons     = useFinanzplanStore(s => s.persons);
  const contracts   = useFinanzplanStore(s => s.contracts);
  const assets      = useFinanzplanStore(s => s.assets);
  const liabilities = useFinanzplanStore(s => s.liabilities);
  const household   = useFinanzplanStore(s => s.household);
  const activeScenario = useFinanzplanStore(selectActiveScenario);

  const scenario = scenarioOverride ?? activeScenario;

  return useMemo(
    () => computeProjection(persons, contracts, assets, liabilities, household, scenario),
    [persons, contracts, assets, liabilities, household, scenario],
  );
}
