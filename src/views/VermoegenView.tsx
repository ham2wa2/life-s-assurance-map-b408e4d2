/**
 * VermoegenView — Sprint 3
 * Aktiva (Assets) + Passiva (Verbindlichkeiten) + Nettovermögen
 */

import { useState, useMemo } from 'react';
import { useFinanzplanStore, selectNetWorth } from '@/store/finanzplanStore';
import { Asset, AssetKategorie, Liability, LiabilityKategorie } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────

const currentYear = new Date().getFullYear();

function fmtEur(val: number, compact = false) {
  if (compact) {
    const abs = Math.abs(val);
    const sign = val < 0 ? '–\u202F' : '';
    if (abs >= 1_000_000) {
      return sign + (abs / 1_000_000).toFixed(1).replace('.', ',') + '\u202FMio.\u202F€';
    }
    if (abs >= 10_000) {
      return sign + Math.round(abs / 1_000).toFixed(0) + '\u202Fk\u202F€';
    }
  }
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(val);
}

function fmtPct(val: number) {
  return val.toFixed(1).replace('.', ',') + ' %';
}

// ── Asset Kategorie config ────────────────────────────────────

const ASSET_KATEGORIEN: { value: AssetKategorie; label: string; icon: string; defaultRendite: number }[] = [
  { value: 'immobilie',         label: 'Immobilie',          icon: '🏠', defaultRendite: 2.0 },
  { value: 'depot',             label: 'Depot/ETF/Aktien',   icon: '📈', defaultRendite: 6.0 },
  { value: 'sparbuch',          label: 'Konto/Sparbuch',     icon: '💶', defaultRendite: 0.5 },
  { value: 'rentenversicherung',label: 'Rentenversicherung', icon: '📋', defaultRendite: 3.0 },
  { value: 'sonstige',          label: 'Sonstiges',          icon: '📦', defaultRendite: 2.0 },
];

const LIABILITY_KATEGORIEN: { value: LiabilityKategorie; label: string; icon: string }[] = [
  { value: 'hypothek', label: 'Hypothek/Baudarlehen', icon: '🏠' },
  { value: 'kredit',   label: 'Ratenkredit',          icon: '💳' },
  { value: 'sonstige', label: 'Sonstige Schulden',    icon: '📦' },
];

function assetKat(k: AssetKategorie) {
  return ASSET_KATEGORIEN.find((x) => x.value === k) ?? ASSET_KATEGORIEN[4];
}
function liabKat(k: LiabilityKategorie) {
  return LIABILITY_KATEGORIEN.find((x) => x.value === k) ?? LIABILITY_KATEGORIEN[2];
}

// ── AssetRow ──────────────────────────────────────────────────

interface AssetRowProps {
  asset: Asset;
  onSave: (updates: Partial<Omit<Asset, 'id'>>) => void;
  onDelete: () => void;
}

function AssetRow({ asset, onSave, onDelete }: AssetRowProps) {
  const [editing, setEditing] = useState(false);
  const [bezeichnung, setBezeichnung] = useState(asset.bezeichnung);
  const [kategorie, setKategorie] = useState<AssetKategorie>(asset.kategorie);
  const [wert, setWert] = useState(asset.wertAktuell);
  const [rendite, setRendite] = useState(asset.renditeProzent);
  const kat = assetKat(asset.kategorie);

  const handleSave = () => {
    onSave({ bezeichnung, kategorie, wertAktuell: wert, renditeProzent: rendite });
    setEditing(false);
  };
  const handleCancel = () => {
    setBezeichnung(asset.bezeichnung);
    setKategorie(asset.kategorie);
    setWert(asset.wertAktuell);
    setRendite(asset.renditeProzent);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Bezeichnung</label>
            <input
              autoFocus
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={bezeichnung}
              onChange={(e) => setBezeichnung(e.target.value)}
              placeholder="z.B. ETF-Depot DKB"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Kategorie</label>
            <div className="flex gap-1.5 flex-wrap">
              {ASSET_KATEGORIEN.map((k) => (
                <button
                  key={k.value}
                  onClick={() => { setKategorie(k.value); setRendite(k.defaultRendite); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    kategorie === k.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {k.icon} {k.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Aktueller Wert (€)</label>
            <input
              type="number"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={wert}
              onChange={(e) => setWert(parseFloat(e.target.value) || 0)}
              min={0} step={1000}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Erwartete Rendite % p.a.
            </label>
            <input
              type="number"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={rendite}
              onChange={(e) => setRendite(parseFloat(e.target.value) || 0)}
              min={0} max={20} step={0.5}
            />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!bezeichnung.trim()}
            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            Speichern
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg border border-input text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 rounded-lg border border-destructive/30 text-destructive text-sm hover:bg-destructive/5 transition-colors"
          >
            Löschen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between py-3.5 px-1 border-b border-border last:border-0 hover:bg-muted/20 rounded-lg cursor-pointer group transition-colors"
      onClick={() => setEditing(true)}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{kat.icon}</span>
        <div>
          <p className="text-sm font-medium text-foreground">{asset.bezeichnung}</p>
          <p className="text-xs text-muted-foreground">{kat.label} · {fmtPct(asset.renditeProzent)} p.a.</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {fmtEur(asset.wertAktuell)}
        </span>
        <span className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground transition-opacity">✏️</span>
      </div>
    </div>
  );
}

// ── AddAssetForm ──────────────────────────────────────────────

interface AddAssetFormProps {
  onAdd: (data: Omit<Asset, 'id'>) => void;
  onCancel: () => void;
}

function AddAssetForm({ onAdd, onCancel }: AddAssetFormProps) {
  const [bezeichnung, setBezeichnung] = useState('');
  const [kategorie, setKategorie] = useState<AssetKategorie>('depot');
  const [wert, setWert] = useState(0);
  const [rendite, setRendite] = useState(6.0);

  const handleKat = (k: AssetKategorie) => {
    setKategorie(k);
    setRendite(ASSET_KATEGORIEN.find((x) => x.value === k)?.defaultRendite ?? 2.0);
  };

  return (
    <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold">Aktiva hinzufügen</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Bezeichnung</label>
          <input
            autoFocus
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={bezeichnung}
            onChange={(e) => setBezeichnung(e.target.value)}
            placeholder="z.B. ETF-Depot DKB"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Kategorie</label>
          <div className="flex gap-1.5 flex-wrap">
            {ASSET_KATEGORIEN.map((k) => (
              <button
                key={k.value}
                onClick={() => handleKat(k.value)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  kategorie === k.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {k.icon} {k.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Aktueller Wert (€)</label>
          <input
            type="number"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={wert || ''}
            onChange={(e) => setWert(parseFloat(e.target.value) || 0)}
            placeholder="0"
            min={0} step={1000}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Rendite % p.a.</label>
          <input
            type="number"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={rendite}
            onChange={(e) => setRendite(parseFloat(e.target.value) || 0)}
            min={0} max={20} step={0.5}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => {
            if (!bezeichnung.trim() || wert <= 0) return;
            onAdd({ bezeichnung, kategorie, wertAktuell: wert, renditeProzent: rendite, isActive: true });
          }}
          disabled={!bezeichnung.trim() || wert <= 0}
          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          Hinzufügen
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-input text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

// ── LiabilityRow ──────────────────────────────────────────────

interface LiabilityRowProps {
  liability: Liability;
  onSave: (updates: Partial<Omit<Liability, 'id'>>) => void;
  onDelete: () => void;
}

function LiabilityRow({ liability, onSave, onDelete }: LiabilityRowProps) {
  const [editing, setEditing] = useState(false);
  const [bezeichnung, setBezeichnung] = useState(liability.bezeichnung);
  const [kategorie, setKategorie] = useState<LiabilityKategorie>(liability.kategorie);
  const [betrag, setBetrag] = useState(liability.betrag);
  const [zinssatz, setZinssatz] = useState(liability.zinssatz);
  const [rate, setRate] = useState(liability.monatlicheRate);
  const [endYear, setEndYear] = useState(liability.endYear);
  const kat = liabKat(liability.kategorie);

  const handleSave = () => {
    onSave({ bezeichnung, kategorie, betrag, zinssatz, monatlicheRate: rate, endYear });
    setEditing(false);
  };
  const handleCancel = () => {
    setBezeichnung(liability.bezeichnung);
    setKategorie(liability.kategorie);
    setBetrag(liability.betrag);
    setZinssatz(liability.zinssatz);
    setRate(liability.monatlicheRate);
    setEndYear(liability.endYear);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Bezeichnung</label>
            <input
              autoFocus
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={bezeichnung}
              onChange={(e) => setBezeichnung(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Kategorie</label>
            <div className="flex gap-1.5 flex-wrap">
              {LIABILITY_KATEGORIEN.map((k) => (
                <button
                  key={k.value}
                  onClick={() => setKategorie(k.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    kategorie === k.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {k.icon} {k.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Restschuld (€)</label>
            <input
              type="number"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={betrag}
              onChange={(e) => setBetrag(parseFloat(e.target.value) || 0)}
              min={0} step={1000}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Zinssatz % p.a.</label>
            <input
              type="number"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={zinssatz}
              onChange={(e) => setZinssatz(parseFloat(e.target.value) || 0)}
              min={0} max={20} step={0.1}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Monatliche Rate (€)</label>
            <input
              type="number"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
              min={0} step={50}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tilgungsende</label>
            <input
              type="number"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={endYear}
              onChange={(e) => setEndYear(parseInt(e.target.value) || currentYear + 10)}
              min={currentYear} max={2080}
            />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!bezeichnung.trim()}
            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            Speichern
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg border border-input text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 rounded-lg border border-destructive/30 text-destructive text-sm hover:bg-destructive/5 transition-colors"
          >
            Löschen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between py-3.5 px-1 border-b border-border last:border-0 hover:bg-muted/20 rounded-lg cursor-pointer group transition-colors"
      onClick={() => setEditing(true)}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{kat.icon}</span>
        <div>
          <p className="text-sm font-medium text-foreground">{liability.bezeichnung}</p>
          <p className="text-xs text-muted-foreground">
            {fmtPct(liability.zinssatz)} · {fmtEur(liability.monatlicheRate)}/mtl · bis {liability.endYear}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tabular-nums text-destructive">
          – {fmtEur(liability.betrag)}
        </span>
        <span className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground transition-opacity">✏️</span>
      </div>
    </div>
  );
}

// ── AddLiabilityForm ──────────────────────────────────────────

interface AddLiabilityFormProps {
  onAdd: (data: Omit<Liability, 'id'>) => void;
  onCancel: () => void;
}

function AddLiabilityForm({ onAdd, onCancel }: AddLiabilityFormProps) {
  const [bezeichnung, setBezeichnung] = useState('');
  const [kategorie, setKategorie] = useState<LiabilityKategorie>('kredit');
  const [betrag, setBetrag] = useState(0);
  const [zinssatz, setZinssatz] = useState(3.5);
  const [rate, setRate] = useState(0);
  const [endYear, setEndYear] = useState(currentYear + 5);

  return (
    <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold">Verbindlichkeit hinzufügen</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Bezeichnung</label>
          <input
            autoFocus
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={bezeichnung}
            onChange={(e) => setBezeichnung(e.target.value)}
            placeholder="z.B. Baufinanzierung VR-Bank"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Kategorie</label>
          <div className="flex gap-1.5 flex-wrap">
            {LIABILITY_KATEGORIEN.map((k) => (
              <button
                key={k.value}
                onClick={() => setKategorie(k.value)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  kategorie === k.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {k.icon} {k.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Restschuld (€)</label>
          <input
            type="number"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={betrag || ''}
            onChange={(e) => setBetrag(parseFloat(e.target.value) || 0)}
            placeholder="0" min={0} step={1000}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Zinssatz % p.a.</label>
          <input
            type="number"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={zinssatz}
            onChange={(e) => setZinssatz(parseFloat(e.target.value) || 0)}
            min={0} max={20} step={0.1}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Monatliche Rate (€)</label>
          <input
            type="number"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={rate || ''}
            onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
            placeholder="0" min={0} step={50}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tilgungsende</label>
          <input
            type="number"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={endYear}
            onChange={(e) => setEndYear(parseInt(e.target.value) || currentYear + 5)}
            min={currentYear} max={2080}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => {
            if (!bezeichnung.trim() || betrag <= 0) return;
            onAdd({ bezeichnung, kategorie, betrag, zinssatz, monatlicheRate: rate, endYear, isActive: true });
          }}
          disabled={!bezeichnung.trim() || betrag <= 0}
          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          Hinzufügen
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-input text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────

export function VermoegenView() {
  // Get raw arrays from store (stable references) — filter via useMemo, NOT in selector
  const allAssets      = useFinanzplanStore((s) => s.assets);
  const allLiabilities = useFinanzplanStore((s) => s.liabilities);
  const netWorth       = useFinanzplanStore(selectNetWorth);
  const assets      = useMemo(() => allAssets.filter((a) => a.isActive),      [allAssets]);
  const liabilities = useMemo(() => allLiabilities.filter((l) => l.isActive), [allLiabilities]);
  const addAsset        = useFinanzplanStore((s) => s.addAsset);
  const updateAsset     = useFinanzplanStore((s) => s.updateAsset);
  const deleteAsset     = useFinanzplanStore((s) => s.deleteAsset);
  const addLiability    = useFinanzplanStore((s) => s.addLiability);
  const updateLiability = useFinanzplanStore((s) => s.updateLiability);
  const deleteLiability = useFinanzplanStore((s) => s.deleteLiability);

  const [showAddAsset,     setShowAddAsset]     = useState(false);
  const [showAddLiability, setShowAddLiability] = useState(false);

  const totalAssets      = assets.reduce((s, a) => s + a.wertAktuell, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.betrag, 0);
  const totalMonthlyRate = liabilities.reduce((s, l) => s + l.monatlicheRate, 0);
  const netWorthColor    = netWorth >= 0 ? 'text-emerald-600' : 'text-destructive';

  return (
    <div className="space-y-8">

      {/* ── Nettovermögen Summary ── */}
      <section>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Gesamtvermögen</p>
            <p className="text-lg font-bold text-foreground tabular-nums">{fmtEur(totalAssets, true)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Gesamtschulden</p>
            <p className="text-lg font-bold text-destructive tabular-nums">– {fmtEur(totalLiabilities, true)}</p>
          </div>
          <div className={`border rounded-xl p-4 text-center ${netWorth >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-xs text-muted-foreground mb-1">Nettovermögen</p>
            <p className={`text-lg font-bold tabular-nums ${netWorthColor}`}>{fmtEur(netWorth, true)}</p>
          </div>
        </div>

        {totalLiabilities > 0 && (
          <div className="mt-3 flex items-center justify-between bg-muted/40 rounded-lg px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Monatliche Schuldentilgung gesamt</span>
            <span className="text-sm font-semibold tabular-nums">{fmtEur(totalMonthlyRate)}</span>
          </div>
        )}
      </section>

      {/* ── Aktiva ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Aktiva</h2>
            {assets.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{assets.length} Position{assets.length !== 1 ? 'en' : ''}</p>
            )}
          </div>
          {!showAddAsset && (
            <button
              onClick={() => setShowAddAsset(true)}
              className="text-sm px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              + Hinzufügen
            </button>
          )}
        </div>

        <div className="space-y-2">
          {assets.length > 0 ? (
            <div className="bg-card border border-border rounded-xl px-4 py-1">
              {assets.map((asset) => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  onSave={(updates) => updateAsset(asset.id, updates)}
                  onDelete={() => deleteAsset(asset.id)}
                />
              ))}
            </div>
          ) : !showAddAsset ? (
            <button
              onClick={() => setShowAddAsset(true)}
              className="w-full border border-dashed border-border rounded-xl p-6 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors text-center"
            >
              Noch keine Aktiva erfasst — klicke zum Hinzufügen
            </button>
          ) : null}

          {showAddAsset && (
            <AddAssetForm
              onAdd={(data) => { addAsset(data); setShowAddAsset(false); }}
              onCancel={() => setShowAddAsset(false)}
            />
          )}
        </div>
      </section>

      {/* ── Passiva ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Passiva / Verbindlichkeiten</h2>
            {liabilities.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{liabilities.length} Position{liabilities.length !== 1 ? 'en' : ''}</p>
            )}
          </div>
          {!showAddLiability && (
            <button
              onClick={() => setShowAddLiability(true)}
              className="text-sm px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              + Hinzufügen
            </button>
          )}
        </div>

        <div className="space-y-2">
          {liabilities.length > 0 ? (
            <div className="bg-card border border-border rounded-xl px-4 py-1">
              {liabilities.map((liability) => (
                <LiabilityRow
                  key={liability.id}
                  liability={liability}
                  onSave={(updates) => updateLiability(liability.id, updates)}
                  onDelete={() => deleteLiability(liability.id)}
                />
              ))}
            </div>
          ) : !showAddLiability ? (
            <button
              onClick={() => setShowAddLiability(true)}
              className="w-full border border-dashed border-border rounded-xl p-6 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors text-center"
            >
              Keine Verbindlichkeiten erfasst — klicke zum Hinzufügen
            </button>
          ) : null}

          {showAddLiability && (
            <AddLiabilityForm
              onAdd={(data) => { addLiability(data); setShowAddLiability(false); }}
              onCancel={() => setShowAddLiability(false)}
            />
          )}
        </div>
      </section>
    </div>
  );
}
