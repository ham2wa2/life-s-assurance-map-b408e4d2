/**
 * Finanzplan — Zod Validation Schemas
 * Version: 1.0 (Phase 5)
 *
 * Used for import validation (importData) to reject corrupt or incompatible files.
 * Mirrors types.ts exactly — if types.ts changes, update these schemas too.
 */

import { z } from 'zod';

// ============================================================
// ENUMS
// ============================================================

export const PersonRoleSchema = z.enum(['hauptverdiener', 'partner', 'kind']);

export const ContractRiskTypeSchema = z.enum([
  'tod',
  'bu',
  'ruhestand',
  'kranken',
  'haftpflicht',
  'unfall',
  'sachwerte',
  'gesetzliche_rente',
  'private_rente',
  'kapitalbildend',
  'sonstige',
]);

export const AssetKategorieSchema = z.enum([
  'immobilie',
  'depot',
  'sparbuch',
  'rentenversicherung',
  'sonstige',
]);

export const LiabilityKategorieSchema = z.enum([
  'hypothek',
  'kredit',
  'sonstige',
]);

// ============================================================
// ENTITY SCHEMAS
// ============================================================

export const PersonSchema = z.object({
  id: z.string().min(1),
  role: PersonRoleSchema,
  name: z.string().min(1, 'Name darf nicht leer sein'),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
  netIncomeMonthly: z.number().min(0),
  retirementAge: z.number().int().min(50).max(80),
});

export const LeistungSchema = z.object({
  typ: ContractRiskTypeSchema,
  betrag: z.number().min(0),
  bezeichnung: z.string().optional(),
});

export const GesetzlicheRenteDataSchema = z.object({
  renteBeiSofortigem: z.number().min(0),
  renteMitStandardAnnahme: z.number().min(0),
  renteBeiGleichbleibendem: z.number().min(0),
  bescheidJahr: z.number().int().min(2000).max(2100),
});

export const ContractSchema = z.object({
  id: z.string().min(1),
  riskType: ContractRiskTypeSchema,
  provider: z.string().min(1, 'Anbieter darf nicht leer sein'),
  name: z.string().min(1, 'Name darf nicht leer sein'),
  coverageAmount: z.number().min(0),
  monthlyPremium: z.number().min(0),
  endYear: z.number().int().min(2000).max(2150),
  beneficiary: z.string().optional(),
  personId: z.string().optional(),
  active: z.boolean(),
  leistungen: z.array(LeistungSchema).optional(),
  gesetzlicheRente: GesetzlicheRenteDataSchema.optional(),
});

export const AssetSchema = z.object({
  id: z.string().min(1),
  kategorie: AssetKategorieSchema,
  bezeichnung: z.string().min(1),
  wertAktuell: z.number().min(0),
  renditeProzent: z.number().min(0).max(100),
  isActive: z.boolean(),
});

export const LiabilitySchema = z.object({
  id: z.string().min(1),
  kategorie: LiabilityKategorieSchema,
  bezeichnung: z.string().min(1),
  betrag: z.number().min(0),
  zinssatz: z.number().min(0).max(100),
  monatlicheRate: z.number().min(0),
  endYear: z.number().int().min(2000).max(2150),
  isActive: z.boolean(),
});

export const HouseholdConfigSchema = z.object({
  wohnkostenMonatlich: z.number().min(0),
  lebenshaltungMonatlich: z.number().min(0),
  sonstigesMonatlich: z.number().min(0),
  mortgageEndYear: z.number().int().min(2000).max(2150),
  mortgageAmount: z.number().min(0),
  studyCostPerYear: z.number().min(0),
});

export const ScenarioOverridesSchema = z.object({
  retirementAgeByPersonId: z.record(z.string(), z.number().int().min(50).max(80)).optional(),
  inflationRate: z.number().min(0).max(20).optional(),
  monthlySavingsRate: z.number().optional(),
});

export const ScenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  beschreibung: z.string(),
  isBaseline: z.boolean(),
  overrides: ScenarioOverridesSchema,
});

// ============================================================
// EXPORT / IMPORT SCHEMA
// ============================================================

export const FinanzplanExportSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  persons: z.array(PersonSchema),
  contracts: z.array(ContractSchema),
  assets: z.array(AssetSchema),
  liabilities: z.array(LiabilitySchema),
  household: HouseholdConfigSchema,
  scenarios: z.array(ScenarioSchema).min(1, 'Mindestens ein Szenario erforderlich'),
});

export type ValidatedExport = z.infer<typeof FinanzplanExportSchema>;

// ============================================================
// HELPER: parse with human-readable errors
// ============================================================

export function parseFinanzplanExport(json: string): ValidatedExport {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Ungültiges JSON-Format — die Datei kann nicht gelesen werden.');
  }
  const result = FinanzplanExportSchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first.path.join('.');
    throw new Error(
      `Ungültige Datei: ${path ? `[${path}] ` : ''}${first.message}`
    );
  }
  return result.data;
}
