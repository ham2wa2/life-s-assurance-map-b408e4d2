/**
 * DashboardView — Sprint 3 (basic version, Sprint 2 delivery)
 * HealthScore cards + key metrics + quick actions
 */

import { useFinanzplanStore } from '@/store/finanzplanStore';
import { useHealthScore } from '@/hooks/useHealthScore';
import { StatusLevel } from '@/lib/types';

// ── helpers ──────────────────────────────────────────────────

function fmtEur(val: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(val);
}

function pct(val: number) {
  return `${Math.round(val * 100)} %`;
}

// ── HealthScore Card ─────────────────────────────────────────

const STATUS_COLOR: Record<StatusLevel, { bg: string; text: string; dot: string; label: string }> = {
  good:     { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Gut' },
  warning:  { bg: 'bg-amber-50 border-amber-200',     text: 'text-amber-700',   dot: 'bg-amber-400',   label: 'Ausbaufähig' },
  critical: { bg: 'bg-red-50 border-red-200',         text: 'text-red-700',     dot: 'bg-red-500',     label: 'Handlungsbedarf' },
};

interface ScoreCardProps {
  title: string;
  status: StatusLevel;
  detail?: string;
  onClick?: () => void;
}

function ScoreCard({ title, status, detail, onClick }: ScoreCardProps) {
  const s = STATUS_COLOR[status];
  return (
    <button
      onClick={onClick}
      className={`text-left w-full border rounded-xl p-4 transition-all ${s.bg} ${onClick ? 'hover:scale-[1.01] cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground leading-tight">{title}</p>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${s.text}`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
          {s.label}
        </span>
      </div>
      {detail && <p className="text-xs text-muted-foreground mt-1.5">{detail}</p>}
    </button>
  );
}

// ── Metric tile ───────────────────────────────────────────────

interface MetricTileProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

function MetricTile({ label, value, sub, accent }: MetricTileProps) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 ${accent ? 'border-primary/30' : ''}`}>
      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────

export function DashboardView() {
  const persons     = useFinanzplanStore((s) => s.persons);
  const contracts   = useFinanzplanStore((s) => s.contracts);
  const assets      = useFinanzplanStore((s) => s.assets);
  const liabilities = useFinanzplanStore((s) => s.liabilities);
  const setActiveTab = useFinanzplanStore((s) => s.setActiveTab);

  const hs = useHealthScore();

  const currentYear = new Date().getFullYear();
  const names = persons.filter((p) => p.role !== 'kind').map((p) => p.name).filter(Boolean);
  const kinder = persons.filter((p) => p.role === 'kind');

  const totalAssets = assets.filter((a) => a.isActive).reduce((s, a) => s + a.wertAktuell, 0);
  const totalLiabilities = liabilities.filter((l) => l.isActive).reduce((s, l) => s + l.betrag, 0);

  const activeContracts = contracts.filter((c) => c.active && c.endYear >= currentYear);
  const expiringSoon = contracts.filter(
    (c) => c.active && c.endYear >= currentYear && c.endYear <= currentYear + 3
  );

  return (
    <div className="space-y-8">

      {/* ── Greeting ── */}
      <div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          {names.length > 0 ? `Hallo, ${names.join(' & ')}` : 'Mein Finanzplan'}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {kinder.length > 0
            ? `Haushalt mit ${kinder.length} ${kinder.length === 1 ? 'Kind' : 'Kindern'} · ${currentYear}`
            : `Haushalt ohne Kinder · ${currentYear}`}
        </p>
      </div>

      {/* ── Overall score ── */}
      <div className={`rounded-2xl p-5 border ${STATUS_COLOR[hs.overall].bg}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${STATUS_COLOR[hs.overall].dot}`} />
          <div>
            <p className={`font-semibold ${STATUS_COLOR[hs.overall].text}`}>
              Gesamtstatus: {STATUS_COLOR[hs.overall].label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hs.overall === 'good'
                ? 'Dein Finanzplan sieht insgesamt solide aus.'
                : hs.overall === 'warning'
                ? 'Es gibt einige Bereiche, die Aufmerksamkeit brauchen.'
                : 'Dringender Handlungsbedarf in einem oder mehreren Bereichen.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Key Metrics ── */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Kennzahlen</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricTile
            label="Einkommen/Monat"
            value={fmtEur(hs.totalIncomeMonthly)}
            sub="Netto gesamt"
            accent
          />
          <MetricTile
            label="Freie Liquidität"
            value={fmtEur(hs.monthlySavings)}
            sub={`Sparquote: ${pct(hs.savingsRate)}`}
          />
          <MetricTile
            label="Nettovermögen"
            value={fmtEur(hs.netWorthValue)}
            sub={`Assets: ${fmtEur(totalAssets)} · Schulden: ${fmtEur(totalLiabilities)}`}
          />
          <MetricTile
            label="Verträge aktiv"
            value={String(activeContracts.length)}
            sub={expiringSoon.length > 0 ? `${expiringSoon.length} laufen bald ab` : 'Alle laufen noch'}
          />
        </div>
      </section>

      {/* ── HealthScore Cards ── */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Finanzielle Gesundheit</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ScoreCard
            title="Absicherung"
            status={hs.insurance}
            detail={
              hs.insurance === 'good'
                ? 'Todesfallschutz und BU vorhanden'
                : hs.insurance === 'warning'
                ? 'Nur teilweise abgesichert (TOD oder BU fehlt)'
                : 'Kein aktiver Todesfallschutz oder BU'
            }
            onClick={() => setActiveTab('absicherung')}
          />
          <ScoreCard
            title="Cashflow"
            status={hs.cashflow}
            detail={
              hs.cashflow === 'good'
                ? `Sparquote ${pct(hs.savingsRate)} — sehr gut`
                : hs.cashflow === 'warning'
                ? `Sparquote ${pct(hs.savingsRate)} — Spielraum vorhanden`
                : 'Ausgaben übersteigen Einkommen'
            }
            onClick={() => setActiveTab('haushalt')}
          />
          <ScoreCard
            title="Vermögen"
            status={hs.netWorth}
            detail={
              hs.netWorth === 'good'
                ? `Nettovermögen ${fmtEur(hs.netWorthValue)} — solide Basis`
                : hs.netWorth === 'warning'
                ? `Nettovermögen ${fmtEur(hs.netWorthValue)} — noch ausbaufähig`
                : 'Schulden übersteigen Vermögen'
            }
            onClick={() => setActiveTab('vermoegen')}
          />
          <ScoreCard
            title="Sparverhalten"
            status={hs.savings}
            detail={
              hs.savings === 'good'
                ? `${pct(hs.savingsRate)} des Einkommens gespart — Ziel: >15%`
                : hs.savings === 'warning'
                ? `${pct(hs.savingsRate)} gespart — empfohlen: mind. 15%`
                : 'Keine Rücklagen möglich — Ausgaben senken'
            }
            onClick={() => setActiveTab('haushalt')}
          />
        </div>
      </section>

      {/* ── Contracts overview ── */}
      {contracts.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Versicherungsübersicht</h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Vertrag</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Art</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Prämie/Mo</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">bis</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.provider}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      <span className="capitalize">{c.riskType}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {fmtEur(c.monthlyPremium)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                      {c.endYear}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        !c.active ? 'bg-muted-foreground' :
                        c.endYear < currentYear ? 'bg-red-500' :
                        c.endYear <= currentYear + 3 ? 'bg-amber-400' :
                        'bg-emerald-500'
                      }`} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/20">
                  <td className="px-4 py-3 text-sm font-semibold text-foreground" colSpan={2}>Gesamt</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-foreground">
                    {fmtEur(contracts.filter((c) => c.active).reduce((s, c) => s + c.monthlyPremium, 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <button
            onClick={() => setActiveTab('absicherung')}
            className="mt-2 text-xs text-primary hover:underline"
          >
            → Absicherung bearbeiten
          </button>
        </section>
      )}

      {/* ── Empty state ── */}
      {contracts.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-sm mb-3">Noch keine Verträge erfasst</p>
          <button
            onClick={() => setActiveTab('absicherung')}
            className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Verträge hinzufügen →
          </button>
        </div>
      )}
    </div>
  );
}
