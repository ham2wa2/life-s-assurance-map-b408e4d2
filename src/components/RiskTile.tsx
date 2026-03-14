import { useInsurance } from '@/hooks/useInsurance';
import { RiskType, Contract, RISK_LABELS, RISK_ICONS } from '@/lib/insurance-types';
import { Switch } from '@/components/ui/switch';

interface RiskTileProps {
  riskType: RiskType;
  onOpenTimeline: () => void;
  onEditContract?: (contract: Contract) => void;
}

function getOverallStatus(riskType: RiskType, timeline: ReturnType<typeof useInsurance>['timeline']) {
  const statuses = timeline.map(y => riskType === 'tod' ? y.todStatus : y.buStatus);
  const firstOverYear = timeline.find((y, i) => statuses[i] === 'over');
  const hasRed = statuses.some(s => s === 'red');
  const hasYellow = statuses.some(s => s === 'yellow');
  
  if (hasRed) return { color: 'destructive' as const, label: 'Unterversichert – Lücke vorhanden' };
  if (firstOverYear) return { color: 'warning' as const, label: `Bis ${firstOverYear.year} gut, danach überversichert` };
  if (hasYellow) return { color: 'warning' as const, label: 'Teilweise unterversichert' };
  return { color: 'success' as const, label: 'Vollständig abgesichert' };
}

const statusDotColors = {
  destructive: 'bg-destructive',
  warning: 'bg-warning',
  success: 'bg-success',
};

// Soft icon chip backgrounds per risk type
const iconChipBg: Partial<Record<RiskType, string>> = {
  tod:        'bg-amber-50',
  bu:         'bg-emerald-50',
  kranken:    'bg-sky-50',
  haftpflicht:'bg-violet-50',
  unfall:     'bg-orange-50',
  sachwerte:  'bg-slate-100',
  sonstige:   'bg-slate-100',
};

// Status badge pill styles
const statusBadgeStyles = {
  destructive: 'bg-red-100 text-red-700',
  warning:     'bg-amber-100 text-amber-700',
  success:     'bg-emerald-100 text-emerald-700',
};

const statusBadgeLabels = {
  destructive: 'Lücke',
  warning:     'Ausbaufähig',
  success:     'Gut',
};

export function RiskTile({ riskType, onOpenTimeline, onEditContract }: RiskTileProps) {
  const { contracts, timeline, toggleContract } = useInsurance();
  const riskContracts = contracts.filter(c => c.riskType === riskType);

  const isCalculable = riskType === 'tod' || riskType === 'bu';
  const status = isCalculable ? getOverallStatus(riskType, timeline) : null;
  const chipBg = iconChipBg[riskType] ?? 'bg-slate-100';

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:shadow-lg hover:shadow-primary/5">
      {/* Status indicator bar */}
      {status && (
        <div className={`absolute top-0 left-0 right-0 h-[3px] ${statusDotColors[status.color]}`} />
      )}

      {/* Header: icon chip + name + status badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* Icon in soft chip */}
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl ${chipBg}`}>
            {RISK_ICONS[riskType]}
          </div>
          <h3 className="font-semibold text-base text-card-foreground">{RISK_LABELS[riskType]}</h3>
        </div>
        {/* Status pill badge */}
        {status && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadgeStyles[status.color]}`}>
            {statusBadgeLabels[status.color]}
          </span>
        )}
      </div>

      {/* Status detail text */}
      {status && (
        <p className="text-xs text-muted-foreground mb-3">{status.label}</p>
      )}

      {/* Mini timeline bar */}
      {isCalculable && (
        <div className="flex gap-0.5 mb-4 h-3 rounded-full overflow-hidden bg-muted">
          {timeline.filter((_, i) => i % 2 === 0).map((y) => {
            const s = riskType === 'tod' ? y.todStatus : y.buStatus;
            const barColor = s === 'green' ? 'bg-success' : s === 'yellow' ? 'bg-warning' : s === 'red' ? 'bg-destructive' : 'bg-overinsured';
            return <div key={y.year} className={`flex-1 ${barColor} transition-all`} />;
          })}
        </div>
      )}

      {/* Contracts */}
      <div className="space-y-2 mb-4">
        {riskContracts.map(contract => (
          <div
            key={contract.id}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary/80 transition-colors"
            onClick={() => onEditContract?.(contract)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-card-foreground truncate">
                {contract.provider} {contract.name.length > 20 ? contract.name.substring(0, 20) + '…' : contract.name}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {(contract.coverageAmount / 1000).toFixed(0)}k€ · {contract.monthlyPremium}€/mtl
                {contract.beneficiary && <span className="ml-1 text-muted-foreground/70">· {contract.beneficiary}</span>}
              </p>
            </div>
            <Switch
              checked={contract.active}
              onCheckedChange={(e) => { e; toggleContract(contract.id); }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ))}
        {riskContracts.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Keine Verträge vorhanden</p>
        )}
      </div>

      {/* CTA */}
      {isCalculable && (
        <button
          onClick={onOpenTimeline}
          className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Zeitachse öffnen →
        </button>
      )}
    </div>
  );
}
