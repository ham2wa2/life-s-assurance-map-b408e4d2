/**
 * PlanungView — Sprint 4
 * 30-year household financial projection.
 * Chart (Recharts) + summary KPIs + year-by-year table.
 */

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useFinanzplanStore, selectActiveScenario } from '@/store/finanzplanStore';
import { useProjection } from '@/hooks/useProjection';

// ── Helpers ───────────────────────────────────────────────────

function fmtEurK(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '–' : '';
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1).replace('.', ',') + ' Mio. €';
  if (abs >= 1_000)     return sign + Math.round(abs / 1_000) + ' k€';
  return sign + abs.toFixed(0) + ' €';
}

function fmtEur(val: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(val);
}

// ── Custom tooltip ────────────────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: { color: string; name: string; value: number }[];
  label?: string | number;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-bold text-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-mono font-semibold text-foreground">{fmtEurK(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'text-foreground' }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────

export function PlanungView() {
  const [showTable, setShowTable] = useState(false);
  const [tableStep, setTableStep] = useState<1 | 5>(5);

  const scenarios      = useFinanzplanStore(s => s.scenarios);
  const activeScenario = useFinanzplanStore(selectActiveScenario);
  const setActiveScenario = useFinanzplanStore(s => s.setActiveScenario);
  const persons        = useFinanzplanStore(s => s.persons);

  const projection = useProjection();

  // ── KPIs ──────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const hauptverdiener = persons.find(p => p.role === 'hauptverdiener');
  const retirementOverride = activeScenario.overrides.retirementAgeByPersonId?.[hauptverdiener?.id ?? ''];
  const retirementAge  = retirementOverride ?? hauptverdiener?.retirementAge ?? 67;
  const retirementYear = hauptverdiener ? hauptverdiener.birthYear + retirementAge : currentYear + 30;

  const lastYear  = projection[projection.length - 1];
  const retYear   = projection.find(y => y.year === retirementYear) ?? projection.find(y => y.lifePhase !== 'work') ?? lastYear;
  const netWorthNow = projection[0]?.netWorth ?? 0;

  const totalCashflowWorking = useMemo(
    () => projection.filter(y => y.lifePhase === 'work').reduce((s, y) => s + y.netCashflow, 0),
    [projection],
  );

  const finalNetWorth = lastYear?.netWorth ?? 0;
  const netWorthColor = finalNetWorth >= 0 ? 'text-emerald-600' : 'text-destructive';

  // ── Chart data (every year) ───────────────────────────────────
  const chartData = projection.map(y => ({
    year: y.year,
    Einkommen:    Math.round(y.income / 1000),
    Ausgaben:     Math.round((y.expenses + y.premiums) / 1000),
    Cashflow:     Math.round(y.netCashflow / 1000),
    Nettovermögen: Math.round(y.netWorth / 1000),
  }));

  // ── Table data (filtered by step) ────────────────────────────
  const tableData = tableStep === 1
    ? projection
    : projection.filter(y => y.year % 5 === 0 || y.year === currentYear);

  // ── Phase label ───────────────────────────────────────────────
  const phaseLabel = (phase: string) =>
    phase === 'work' ? '💼' : phase === 'retirement' ? '🏖️' : '⚖️';

  return (
    <div className="space-y-6">

      {/* ── Header + Scenario Switcher ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Planung</h2>
          <p className="text-muted-foreground text-sm mt-1">30-Jahres-Projektion · Haushalt</p>
        </div>
        {scenarios.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {scenarios.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveScenario(s.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeScenario.id === s.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Nettovermögen heute"
          value={fmtEurK(netWorthNow)}
          sub="Aktiva − Schulden"
        />
        <KpiCard
          label="Cashflow Erwerbsphase"
          value={fmtEurK(totalCashflowWorking)}
          sub="Kumuliert bis Rente"
          color={totalCashflowWorking >= 0 ? 'text-emerald-600' : 'text-destructive'}
        />
        <KpiCard
          label={`Nettovermögen ${retirementYear}`}
          value={fmtEurK(retYear?.netWorth ?? 0)}
          sub="Renteneintritt"
          color={(retYear?.netWorth ?? 0) >= 0 ? 'text-emerald-600' : 'text-destructive'}
        />
        <KpiCard
          label={`Nettovermögen ${lastYear?.year ?? ''}`}
          value={fmtEurK(finalNetWorth)}
          sub="Projektionsende"
          color={netWorthColor}
        />
      </div>

      {/* ── Chart ── */}
      <div className="bg-card border border-border rounded-xl p-4 md:p-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
          Jahresverlauf (in k€)
          {activeScenario.overrides.inflationRate != null && (
            <span className="ml-2 text-primary">
              · Inflation {activeScenario.overrides.inflationRate} %
            </span>
          )}
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11 }}
              tickLine={false}
              interval={4}
              stroke="hsl(var(--border))"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              tickFormatter={v => `${v}k`}
              stroke="hsl(var(--border))"
              width={44}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            />
            <Line
              type="monotone"
              dataKey="Einkommen"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Ausgaben"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Cashflow"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              strokeDasharray="5 3"
            />
            <Line
              type="monotone"
              dataKey="Nettovermögen"
              stroke="#a855f7"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Phase legend ── */}
      <div className="flex gap-4 text-xs text-muted-foreground px-1">
        <span>💼 Erwerbsphase</span>
        <span>⚖️ Teilrente</span>
        <span>🏖️ Rente</span>
      </div>

      {/* ── Year Table toggle ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowTable(v => !v)}
            className="text-sm font-medium text-primary hover:underline"
          >
            {showTable ? '▲ Tabelle ausblenden' : '▼ Jahr-für-Jahr-Tabelle'}
          </button>
          {showTable && (
            <div className="flex gap-2">
              {([1, 5] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setTableStep(s)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                    tableStep === s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {s === 1 ? 'Jährlich' : '5-Jahres'}
                </button>
              ))}
            </div>
          )}
        </div>

        {showTable && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Jahr</th>
                  <th className="text-left px-2 py-2.5 font-semibold text-muted-foreground">Phase</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Einkommen</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Ausgaben</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Prämien</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Cashflow</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Nettovermögen</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => {
                  const isRetirementRow = row.year === retirementYear;
                  return (
                    <tr
                      key={row.year}
                      className={`border-b border-border last:border-0 ${
                        isRetirementRow ? 'bg-primary/5' :
                        i % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                      }`}
                    >
                      <td className="px-3 py-2 font-mono font-semibold text-foreground">
                        {row.year}
                        {isRetirementRow && <span className="ml-1 text-primary text-[10px]">🏖️ Rente</span>}
                      </td>
                      <td className="px-2 py-2 text-center">{phaseLabel(row.lifePhase)}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-600">{fmtEurK(row.income)}</td>
                      <td className="px-3 py-2 text-right font-mono text-destructive">{fmtEurK(row.expenses)}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{fmtEurK(row.premiums)}</td>
                      <td className={`px-3 py-2 text-right font-mono font-semibold ${row.netCashflow >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                        {fmtEur(row.netCashflow)}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono font-bold ${row.netWorth >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                        {fmtEurK(row.netWorth)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeScenario && !activeScenario.isBaseline && (
        <p className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          Szenario: <strong>{activeScenario.name}</strong>
          {activeScenario.beschreibung && ` · ${activeScenario.beschreibung}`}
        </p>
      )}
    </div>
  );
}
