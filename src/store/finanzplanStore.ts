/**
 * Finanzplan — Zustand Store
 * 
 * Single source of truth. Persists to localStorage["finanzplan-v2"].
 * All mutations via actions — never direct state mutation.
 * 
 * Computed values (timeline, projection, healthScore) are NOT stored here.
 * Use useTimeline(), useProjection() hooks for derived data.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  FinanzplanState,
  ActiveTab,
  Person,
  Contract,
  Asset,
  Liability,
  HouseholdConfig,
  Scenario,
  ScenarioOverrides,
  FinanzplanExport,
} from '@/lib/types';

// ============================================================
// DEFAULT STATE
// ============================================================

const BASELINE_SCENARIO_ID = 'scenario-baseline';

const DEFAULT_HOUSEHOLD: HouseholdConfig = {
  wohnkostenMonatlich: 1200,
  lebenshaltungMonatlich: 800,
  sonstigesMonatlich: 400,
  mortgageEndYear: 2040,
  mortgageAmount: 0,
  studyCostPerYear: 6000,
};

const BASELINE_SCENARIO: Scenario = {
  id: BASELINE_SCENARIO_ID,
  name: 'Basisplan',
  beschreibung: 'Dein persönlicher Basisplan',
  isBaseline: true,
  overrides: {},
};

const DEFAULT_STATE: FinanzplanState = {
  onboardingComplete: false,
  activeTab: 'dashboard',
  activeScenarioId: BASELINE_SCENARIO_ID,
  persons: [],
  contracts: [],
  assets: [],
  liabilities: [],
  household: DEFAULT_HOUSEHOLD,
  scenarios: [BASELINE_SCENARIO],
};

// ============================================================
// STORE ACTIONS INTERFACE
// ============================================================

interface FinanzplanActions {
  // --- Onboarding ---
  completeOnboarding: () => void;
  resetStore: () => void;

  // --- Navigation ---
  setActiveTab: (tab: ActiveTab) => void;
  setActiveScenario: (id: string) => void;

  // --- Persons ---
  addPerson: (data: Omit<Person, 'id'>) => void;
  updatePerson: (id: string, updates: Partial<Omit<Person, 'id'>>) => void;
  deletePerson: (id: string) => void;
  setPersons: (persons: Person[]) => void;

  // --- Contracts ---
  addContract: (data: Omit<Contract, 'id'>) => void;
  updateContract: (id: string, updates: Partial<Omit<Contract, 'id'>>) => void;
  deleteContract: (id: string) => void;
  toggleContract: (id: string) => void;
  setContracts: (contracts: Contract[]) => void;

  // --- Assets ---
  addAsset: (data: Omit<Asset, 'id'>) => void;
  updateAsset: (id: string, updates: Partial<Omit<Asset, 'id'>>) => void;
  deleteAsset: (id: string) => void;

  // --- Liabilities ---
  addLiability: (data: Omit<Liability, 'id'>) => void;
  updateLiability: (id: string, updates: Partial<Omit<Liability, 'id'>>) => void;
  deleteLiability: (id: string) => void;

  // --- Household Config ---
  setHouseholdConfig: (updates: Partial<HouseholdConfig>) => void;

  // --- Scenarios ---
  addScenario: (data: Omit<Scenario, 'id'>) => void;
  updateScenario: (id: string, updates: Partial<Omit<Scenario, 'id'>>) => void;
  deleteScenario: (id: string) => void;
  copyScenario: (id: string) => void;

  // --- Import / Export ---
  exportData: () => FinanzplanExport;
  importData: (data: FinanzplanExport) => void;
}

type FinanzplanStore = FinanzplanState & FinanzplanActions;

// ============================================================
// HELPERS
// ============================================================

const uid = () => crypto.randomUUID();

const CURRENT_YEAR = new Date().getFullYear();

// ============================================================
// STORE
// ============================================================

export const useFinanzplanStore = create<FinanzplanStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      // --- Onboarding ---

      completeOnboarding: () => set({ onboardingComplete: true }),

      resetStore: () => set({ ...DEFAULT_STATE }),

      // --- Navigation ---

      setActiveTab: (tab) => set({ activeTab: tab }),

      setActiveScenario: (id) => {
        const scenario = get().scenarios.find((s) => s.id === id);
        if (scenario) set({ activeScenarioId: id });
      },

      // --- Persons ---

      addPerson: (data) =>
        set((state) => ({
          persons: [...state.persons, { ...data, id: uid() }],
        })),

      updatePerson: (id, updates) =>
        set((state) => ({
          persons: state.persons.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      deletePerson: (id) =>
        set((state) => ({
          persons: state.persons.filter((p) => p.id !== id),
          // Clean up scenario overrides referencing this person
          scenarios: state.scenarios.map((s) => {
            if (!s.overrides.retirementAgeByPersonId) return s;
            const { [id]: _, ...rest } = s.overrides.retirementAgeByPersonId;
            return {
              ...s,
              overrides: { ...s.overrides, retirementAgeByPersonId: rest },
            };
          }),
        })),

      setPersons: (persons) => set({ persons }),

      // --- Contracts ---

      addContract: (data) =>
        set((state) => ({
          contracts: [...state.contracts, { ...data, id: uid() }],
        })),

      updateContract: (id, updates) =>
        set((state) => ({
          contracts: state.contracts.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      deleteContract: (id) =>
        set((state) => ({
          contracts: state.contracts.filter((c) => c.id !== id),
        })),

      toggleContract: (id) =>
        set((state) => ({
          contracts: state.contracts.map((c) =>
            c.id === id ? { ...c, active: !c.active } : c
          ),
        })),

      setContracts: (contracts) => set({ contracts }),

      // --- Assets ---

      addAsset: (data) =>
        set((state) => ({
          assets: [...state.assets, { ...data, id: uid() }],
        })),

      updateAsset: (id, updates) =>
        set((state) => ({
          assets: state.assets.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),

      deleteAsset: (id) =>
        set((state) => ({
          assets: state.assets.filter((a) => a.id !== id),
        })),

      // --- Liabilities ---

      addLiability: (data) =>
        set((state) => ({
          liabilities: [...state.liabilities, { ...data, id: uid() }],
        })),

      updateLiability: (id, updates) =>
        set((state) => ({
          liabilities: state.liabilities.map((l) =>
            l.id === id ? { ...l, ...updates } : l
          ),
        })),

      deleteLiability: (id) =>
        set((state) => ({
          liabilities: state.liabilities.filter((l) => l.id !== id),
        })),

      // --- Household Config ---

      setHouseholdConfig: (updates) =>
        set((state) => ({
          household: { ...state.household, ...updates },
        })),

      // --- Scenarios ---

      addScenario: (data) =>
        set((state) => ({
          scenarios: [...state.scenarios, { ...data, id: uid(), isBaseline: false }],
        })),

      updateScenario: (id, updates) =>
        set((state) => ({
          scenarios: state.scenarios.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      deleteScenario: (id) => {
        const scenario = get().scenarios.find((s) => s.id === id);
        if (!scenario || scenario.isBaseline) return; // Cannot delete baseline
        const baselineId =
          get().scenarios.find((s) => s.isBaseline)?.id ?? BASELINE_SCENARIO_ID;
        set((state) => ({
          scenarios: state.scenarios.filter((s) => s.id !== id),
          activeScenarioId:
            state.activeScenarioId === id ? baselineId : state.activeScenarioId,
        }));
      },

      copyScenario: (id) => {
        const scenario = get().scenarios.find((s) => s.id === id);
        if (!scenario) return;
        set((state) => ({
          scenarios: [
            ...state.scenarios,
            {
              ...scenario,
              id: uid(),
              name: `${scenario.name} (Kopie)`,
              isBaseline: false,
            },
          ],
        }));
      },

      // --- Import / Export ---

      exportData: () => {
        const state = get();
        return {
          version: 1 as const,
          exportedAt: new Date().toISOString(),
          persons: state.persons,
          contracts: state.contracts,
          assets: state.assets,
          liabilities: state.liabilities,
          household: state.household,
          scenarios: state.scenarios,
        };
      },

      importData: (data) => {
        set({
          persons: data.persons,
          contracts: data.contracts,
          assets: data.assets,
          liabilities: data.liabilities,
          household: data.household,
          scenarios: data.scenarios,
          onboardingComplete: true,
          activeTab: 'dashboard',
          activeScenarioId:
            data.scenarios.find((s) => s.isBaseline)?.id ?? BASELINE_SCENARIO_ID,
        });
      },
    }),
    {
      name: 'finanzplan-v2',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Do NOT persist activeTab — always open on dashboard
      partialize: (state) => ({
        onboardingComplete: state.onboardingComplete,
        activeScenarioId: state.activeScenarioId,
        persons: state.persons,
        contracts: state.contracts,
        assets: state.assets,
        liabilities: state.liabilities,
        household: state.household,
        scenarios: state.scenarios,
      }),
    }
  )
);

// ============================================================
// CONVENIENCE SELECTORS
// ============================================================

/** Active persons only (role filter) */
export const selectPersonsByRole = (role: Person['role']) =>
  (state: FinanzplanStore) => state.persons.filter((p) => p.role === role);

/** Active assets only (LL-009: never use unfiltered for sums!) */
export const selectActiveAssets = (state: FinanzplanStore) =>
  state.assets.filter((a) => a.isActive);

/** Active liabilities only (LL-009) */
export const selectActiveLiabilities = (state: FinanzplanStore) =>
  state.liabilities.filter((l) => l.isActive);

/** Weighted average return from active assets. Default 5% if no assets. */
export const selectInvestReturn = (state: FinanzplanStore): number => {
  const active = state.assets.filter((a) => a.isActive);
  const totalValue = active.reduce((s, a) => s + a.wertAktuell, 0);
  if (totalValue === 0) return 5.0;
  return active.reduce((s, a) => s + (a.renditeProzent * a.wertAktuell), 0) / totalValue;
};

/** Active scenario */
export const selectActiveScenario = (state: FinanzplanStore) =>
  state.scenarios.find((s) => s.id === state.activeScenarioId) ??
  state.scenarios.find((s) => s.isBaseline) ??
  state.scenarios[0];

/** Net worth: sum of active assets - sum of active liabilities */
export const selectNetWorth = (state: FinanzplanStore): number => {
  const assets = state.assets.filter((a) => a.isActive).reduce((s, a) => s + a.wertAktuell, 0);
  const liabilities = state.liabilities.filter((l) => l.isActive).reduce((s, l) => s + l.betrag, 0);
  return assets - liabilities;
};
