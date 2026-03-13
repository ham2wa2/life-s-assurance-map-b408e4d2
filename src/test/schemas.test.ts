/**
 * Unit tests for Zod schemas and parseFinanzplanExport (Phase 5)
 */

import { describe, it, expect } from 'vitest';
import {
  PersonSchema,
  ContractSchema,
  AssetSchema,
  LiabilitySchema,
  FinanzplanExportSchema,
  parseFinanzplanExport,
} from '@/lib/schemas';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_EXPORT = {
  version: 1,
  exportedAt: '2026-03-13T10:00:00.000Z',
  persons: [
    {
      id: 'p1',
      role: 'hauptverdiener',
      name: 'Markus',
      birthYear: 1979,
      netIncomeMonthly: 4000,
      retirementAge: 67,
    },
  ],
  contracts: [
    {
      id: 'c1',
      riskType: 'tod',
      provider: 'Allianz',
      name: 'Risikolebensversicherung',
      coverageAmount: 300000,
      monthlyPremium: 50,
      endYear: 2050,
      active: true,
    },
  ],
  assets: [
    {
      id: 'a1',
      kategorie: 'depot',
      bezeichnung: 'ETF Depot',
      wertAktuell: 50000,
      renditeProzent: 7,
      isActive: true,
    },
  ],
  liabilities: [
    {
      id: 'l1',
      kategorie: 'hypothek',
      bezeichnung: 'Hypothek',
      betrag: 200000,
      zinssatz: 2.5,
      monatlicheRate: 1000,
      endYear: 2040,
      isActive: true,
    },
  ],
  household: {
    wohnkostenMonatlich: 1200,
    lebenshaltungMonatlich: 800,
    sonstigesMonatlich: 400,
    mortgageEndYear: 2040,
    mortgageAmount: 200000,
    studyCostPerYear: 6000,
  },
  scenarios: [
    {
      id: 'baseline',
      name: 'Basisplan',
      beschreibung: '',
      isBaseline: true,
      overrides: {},
    },
  ],
};

// ── PersonSchema ──────────────────────────────────────────────────────────────

describe('PersonSchema', () => {
  it('accepts a valid person', () => {
    const result = PersonSchema.safeParse(VALID_EXPORT.persons[0]);
    expect(result.success).toBe(true);
  });

  it('rejects invalid role', () => {
    const result = PersonSchema.safeParse({ ...VALID_EXPORT.persons[0], role: 'chef' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = PersonSchema.safeParse({ ...VALID_EXPORT.persons[0], name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects birthYear in the future', () => {
    const result = PersonSchema.safeParse({
      ...VALID_EXPORT.persons[0],
      birthYear: new Date().getFullYear() + 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects retirement age below 50', () => {
    const result = PersonSchema.safeParse({ ...VALID_EXPORT.persons[0], retirementAge: 40 });
    expect(result.success).toBe(false);
  });

  it('rejects negative income', () => {
    const result = PersonSchema.safeParse({ ...VALID_EXPORT.persons[0], netIncomeMonthly: -1 });
    expect(result.success).toBe(false);
  });
});

// ── ContractSchema ─────────────────────────────────────────────────────────────

describe('ContractSchema', () => {
  it('accepts a valid contract', () => {
    const result = ContractSchema.safeParse(VALID_EXPORT.contracts[0]);
    expect(result.success).toBe(true);
  });

  it('rejects unknown riskType', () => {
    const result = ContractSchema.safeParse({ ...VALID_EXPORT.contracts[0], riskType: 'xyz' });
    expect(result.success).toBe(false);
  });

  it('accepts contract with optional gesetzlicheRente data', () => {
    const result = ContractSchema.safeParse({
      ...VALID_EXPORT.contracts[0],
      riskType: 'gesetzliche_rente',
      gesetzlicheRente: {
        renteBeiSofortigem: 1200,
        renteMitStandardAnnahme: 1800,
        renteBeiGleichbleibendem: 2100,
        bescheidJahr: 2025,
      },
    });
    expect(result.success).toBe(true);
  });
});

// ── AssetSchema ───────────────────────────────────────────────────────────────

describe('AssetSchema', () => {
  it('accepts a valid asset', () => {
    const result = AssetSchema.safeParse(VALID_EXPORT.assets[0]);
    expect(result.success).toBe(true);
  });

  it('rejects unknown kategorie', () => {
    const result = AssetSchema.safeParse({ ...VALID_EXPORT.assets[0], kategorie: 'gold' });
    expect(result.success).toBe(false);
  });

  it('rejects negative wertAktuell', () => {
    const result = AssetSchema.safeParse({ ...VALID_EXPORT.assets[0], wertAktuell: -100 });
    expect(result.success).toBe(false);
  });
});

// ── LiabilitySchema ───────────────────────────────────────────────────────────

describe('LiabilitySchema', () => {
  it('accepts a valid liability', () => {
    const result = LiabilitySchema.safeParse(VALID_EXPORT.liabilities[0]);
    expect(result.success).toBe(true);
  });

  it('rejects unknown kategorie', () => {
    const result = LiabilitySchema.safeParse({ ...VALID_EXPORT.liabilities[0], kategorie: 'car' });
    expect(result.success).toBe(false);
  });
});

// ── FinanzplanExportSchema ────────────────────────────────────────────────────

describe('FinanzplanExportSchema', () => {
  it('accepts a valid export', () => {
    const result = FinanzplanExportSchema.safeParse(VALID_EXPORT);
    expect(result.success).toBe(true);
  });

  it('rejects wrong version number', () => {
    const result = FinanzplanExportSchema.safeParse({ ...VALID_EXPORT, version: 2 });
    expect(result.success).toBe(false);
  });

  it('rejects missing scenarios array', () => {
    const { scenarios: _, ...rest } = VALID_EXPORT;
    const result = FinanzplanExportSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects empty scenarios array', () => {
    const result = FinanzplanExportSchema.safeParse({ ...VALID_EXPORT, scenarios: [] });
    expect(result.success).toBe(false);
  });
});

// ── parseFinanzplanExport ─────────────────────────────────────────────────────

describe('parseFinanzplanExport', () => {
  it('parses valid JSON export', () => {
    const json = JSON.stringify(VALID_EXPORT);
    const result = parseFinanzplanExport(json);
    expect(result.persons).toHaveLength(1);
    expect(result.persons[0].name).toBe('Markus');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseFinanzplanExport('not json {{')).toThrow('Ungültiges JSON-Format');
  });

  it('throws with field path on invalid data', () => {
    const bad = { ...VALID_EXPORT, persons: [{ ...VALID_EXPORT.persons[0], name: '' }] };
    expect(() => parseFinanzplanExport(JSON.stringify(bad))).toThrow('[persons.0.name]');
  });

  it('throws on wrong version', () => {
    const bad = { ...VALID_EXPORT, version: 3 };
    expect(() => parseFinanzplanExport(JSON.stringify(bad))).toThrow('Ungültige Datei');
  });
});
