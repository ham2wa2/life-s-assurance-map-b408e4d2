/**
 * SzenarienView — Sprint 4
 * Scenario management: create / edit / copy / delete scenarios.
 * Each scenario stores parameter overrides on top of baseline data.
 * Side-by-side comparison of key projection metrics.
 */

import { useState, useMemo } from 'react';
import { useFinanzplanStore, selectActiveScenario } from '@/store/finanzplanStore';
import { computeProjection } from '@/lib/projection';
import { Scenario } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────

function fmtEurK(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '–' : '';
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1).replace('.', ',') + ' Mio.';
  if (abs >= 1_000)     return sign + Math.round(abs / 1_000) + ' k€';
  return sign + abs.toFixed(0) + ' €';
}

// ── Scenario Editor (create/edit form) ───────────────────────

interface EditorProps {
  initial?: Scenario;
  onSave: (data: Omit<Scenario, 'id' | 'isBaseline'>) => void;
  onCancel: () => void;
}

function ScenarioEditor({ initial, onSave, onCancel }: EditorProps) {
  const persons = useFinanzplanStore(s => s.persons);
  const adults  = useMemo(() => persons.filter(p => p.role !== 'kind'), [persons]);

  const [name,         setName]         = useState(initial?.name ?? '');
  const [beschreibung, setBeschreibung] = useState(initial?.beschreibung ?? '');
  const [inflationRate, setInflationRate] = useState<number>(
    initial?.overrides.inflationRate ?? 2.0
  );
  const [extraSavings, setExtraSavings] = useState<number>(
    initial?.overrides.monthlySavingsRate ?? 0
  );
  // Per-person retirement age overrides
  const [retOverrides, setRetOverrides] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    for (const p of adults) {
      base[p.id] = initial?.overrides.retirementAgeByPersonId?.[p.id] ?? p.retirementAge;
    }
    return base;
  });

  const handleSave = () => {
    if (!name.trim()) return;
    // Only store overrides that differ from defaults
    const retChanges: Record<string, number> = {};
    for (const p of adults) {
      if (retOverrides[p.id] !== p.retirementAge) {
        retChanges[p.id] = retOverrides[p.id];
      }
    }
    onSave({
      name: name.trim(),
      beschreibung: beschreibung.trim(),
      overrides: {
        ...(Object.keys(retChanges).length > 0 ? { retirementAgeByPersonId: retChanges } : {}),
        ...(inflationRate !== 2.0 ? { inflationRate } : {}),
        ...(extraSavings !== 0 ? { monthlySavingsRate: extraSavings } : {}),
      },
    });
  };

  return (
    <div className="bg-card border border-primary/30 rounded-xl p-5 space-y-4">
      <p className="text-sm font-semibold text-foreground">
        {initial ? 'Szenario bearbeiten' : 'Neues Szenario'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Name</label>
          <input
            autoFocus
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="z.B. Frührentner-Szenario"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Beschreibung (optional)</label>
          <input
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={beschreibung}
            onChange={e => setBeschreibung(e.target.value)}
            placeholder="Kurze Beschreibung"
          />
        </div>
      </div>

      {/* Retirement age per person */}
      {adults.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Rentenalter-Overrides
          </p>
          <div className="space-y-3">
            {adults.map(p => (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-foreground">{p.name || p.role}</label>
                  <span className="text-sm font-bold font-mono text-primary">
                    {retOverrides[p.id] ?? p.retirementAge} J.
                  </span>
                </div>
                <input
                  type="range"
                  min={55} max={75} step={1}
                  value={retOverrides[p.id] ?? p.retirementAge}
                  onChange={e => setRetOverrides(r => ({ ...r, [p.id]: Number(e.target.value) }))}
                  className="w-full h-1.5 accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span>55</span>
                  <span className="text-muted-foreground/50">
                    Standard: {p.retirementAge}
                  </span>
                  <span>75</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inflation rate */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Inflationsrate
          </label>
          <span className="text-sm font-bold font-mono text-primary">{inflationRate.toFixed(1)} %</span>
        </div>
        <input
          type="range"
          min={0} max={6} step={0.5}
          value={inflationRate}
          onChange={e => setInflationRate(Number(e.target.value))}
          className="w-full h-1.5 accent-primary cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
          <span>0 %</span><span>Standard: 2 %</span><span>6 %</span>
        </div>
      </div>

      {/* Extra monthly savings */}
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1 block">
          Zusätzliche Sparrate / Monat (€)
        </label>
        <input
          type="number"
          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={extraSavings || ''}
          onChange={e => setExtraSavings(parseInt(e.target.value) || 0)}
          min={0} step={50}
          placeholder="0"
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Monatlich zusätzlich investierter Betrag on top of natürlichem Cashflow.
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          Speichern
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

// ── Scenario Card ─────────────────────────────────────────────

interface ScenarioCardProps {
  scenario: Scenario;
  isActive: boolean;
  metrics: { retirementNetWorth: number; finalNetWorth: number; retirementYear: number };
  onActivate: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

function ScenarioCard({ scenario, isActive, metrics, onActivate, onEdit, onCopy, onDelete }: ScenarioCardProps) {
  const nwColor = metrics.finalNetWorth >= 0 ? 'text-emerald-600' : 'text-destructive';
  return (
    <div
      className={`bg-card border rounded-xl p-5 transition-all cursor-pointer ${
        isActive ? 'border-primary shadow-md shadow-primary/10' : 'border-border hover:border-primary/40'
      }`}
      onClick={onActivate}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground">{scenario.name}</p>
            {scenario.isBaseline && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                Basis
              </span>
            )}
            {isActive && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">
                Aktiv
              </span>
            )}
          </div>
          {scenario.beschreibung && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{scenario.beschreibung}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            ✏️
          </button>
          <button
            onClick={onCopy}
            className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            title="Kopieren"
          >
            📋
          </button>
          {!scenario.isBaseline && (
            <button
              onClick={onDelete}
              className="text-xs px-2 py-1 rounded-md bg-secondary text-destructive hover:bg-destructive/10 transition-colors"
              title="Löschen"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Override badges */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {Object.entries(scenario.overrides.retirementAgeByPersonId ?? {}).map(([, age]) => (
          <span key={age} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
            🏖️ Rente {age} J.
          </span>
        ))}
        {scenario.overrides.inflationRate != null && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
            📈 Inflation {scenario.overrides.inflationRate} %
          </span>
        )}
        {scenario.overrides.monthlySavingsRate != null && scenario.overrides.monthlySavingsRate > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
            💰 +{scenario.overrides.monthlySavingsRate} €/mtl extra
          </span>
        )}
        {Object.keys(scenario.overrides).length === 0 && (
          <span className="text-[10px] text-muted-foreground">Keine Overrides</span>
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-muted/30 rounded-lg p-2">
          <p className="text-muted-foreground">Nettovermögen Rente</p>
          <p className={`font-bold font-mono mt-0.5 ${metrics.retirementNetWorth >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
            {fmtEurK(metrics.retirementNetWorth)}
          </p>
          <p className="text-muted-foreground/70">{metrics.retirementYear}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-2">
          <p className="text-muted-foreground">Nettovermögen 2060</p>
          <p className={`font-bold font-mono mt-0.5 ${nwColor}`}>
            {fmtEurK(metrics.finalNetWorth)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────

export function SzenarienView() {
  const scenarios      = useFinanzplanStore(s => s.scenarios);
  const activeScenario = useFinanzplanStore(selectActiveScenario);
  const persons        = useFinanzplanStore(s => s.persons);
  const contracts      = useFinanzplanStore(s => s.contracts);
  const assets         = useFinanzplanStore(s => s.assets);
  const liabilities    = useFinanzplanStore(s => s.liabilities);
  const household      = useFinanzplanStore(s => s.household);
  const {
    addScenario, updateScenario, deleteScenario, copyScenario, setActiveScenario,
  } = useFinanzplanStore.getState();

  const [editingId, setEditingId]   = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  // ── Compute metrics for each scenario ────────────────────────
  const hauptverdiener = persons.find(p => p.role === 'hauptverdiener');

  const scenarioMetrics = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return scenarios.map(s => {
      const proj = computeProjection(persons, contracts, assets, liabilities, household, s, currentYear);
      const retAge  = s.overrides.retirementAgeByPersonId?.[hauptverdiener?.id ?? '']
        ?? hauptverdiener?.retirementAge ?? 67;
      const retYear = hauptverdiener ? hauptverdiener.birthYear + retAge : currentYear + 30;
      const retRow  = proj.find(y => y.year === retYear) ?? proj.find(y => y.lifePhase !== 'work') ?? proj[proj.length - 1];
      const lastRow = proj[proj.length - 1];
      return {
        id: s.id,
        retirementNetWorth: retRow?.netWorth ?? 0,
        finalNetWorth:      lastRow?.netWorth ?? 0,
        retirementYear:     retYear,
      };
    });
  }, [scenarios, persons, contracts, assets, liabilities, household, hauptverdiener]);

  const metricsById = Object.fromEntries(scenarioMetrics.map(m => [m.id, m]));

  const editingScenario = scenarios.find(s => s.id === editingId);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Szenarien</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {scenarios.length} Szenario{scenarios.length !== 1 ? 's' : ''} · klicken zum Aktivieren
          </p>
        </div>
        <div className="flex gap-2">
          {scenarios.length > 1 && (
            <button
              onClick={() => setShowCompare(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                showCompare
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              ⚖️ Vergleich
            </button>
          )}
          {!showCreate && (
            <button
              onClick={() => { setEditingId(null); setShowCreate(true); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              + Neues Szenario
            </button>
          )}
        </div>
      </div>

      {/* ── Create form ── */}
      {showCreate && (
        <ScenarioEditor
          onSave={data => {
            addScenario(data);
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* ── Edit form ── */}
      {editingId && editingScenario && (
        <ScenarioEditor
          initial={editingScenario}
          onSave={data => {
            updateScenario(editingId, data);
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      )}

      {/* ── Scenario cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map(s => (
          <ScenarioCard
            key={s.id}
            scenario={s}
            isActive={activeScenario.id === s.id}
            metrics={metricsById[s.id] ?? { retirementNetWorth: 0, finalNetWorth: 0, retirementYear: 2055 }}
            onActivate={() => setActiveScenario(s.id)}
            onEdit={() => { setShowCreate(false); setEditingId(s.id); }}
            onCopy={() => copyScenario(s.id)}
            onDelete={() => {
              if (window.confirm(`Szenario "${s.name}" löschen?`)) deleteScenario(s.id);
            }}
          />
        ))}
      </div>

      {/* ── Comparison table ── */}
      {showCompare && scenarios.length > 1 && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">
            Szenarien-Vergleich
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Szenario</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Rente ab</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Nettoverm. Rente</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Nettoverm. 2060</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Inflation</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s, i) => {
                  const m = metricsById[s.id];
                  const isActive = activeScenario.id === s.id;
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-border last:border-0 cursor-pointer ${
                        isActive ? 'bg-primary/5' :
                        i % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                      }`}
                      onClick={() => setActiveScenario(s.id)}
                    >
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {s.name}
                        {isActive && <span className="ml-1.5 text-[10px] text-primary font-semibold">● aktiv</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{m?.retirementYear ?? '—'}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-semibold ${(m?.retirementNetWorth ?? 0) >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                        {m ? fmtEurK(m.retirementNetWorth) : '—'}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono font-semibold ${(m?.finalNetWorth ?? 0) >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                        {m ? fmtEurK(m.finalNetWorth) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                        {s.overrides.inflationRate != null ? `${s.overrides.inflationRate} %` : '2,0 %'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
