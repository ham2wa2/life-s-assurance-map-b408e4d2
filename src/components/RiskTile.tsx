import { useInsurance } from '@/hooks/useInsurance';
import { RiskType, RISK_LABELS, RISK_ICONS } from '@/lib/insurance-types';
import { Switch } from '@/components/ui/switch';

interface RiskTileProps {
  riskType: RiskType;
  onOpenTimeline: () => void;
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

export function RiskTile({ riskType, onOpenTimeline }: RiskTileProps) {
  const { contracts, timeline, toggleContract } = useInsurance();
  const riskContracts = contracts.filter(c => c.riskType === riskType);
  
  const isCalculable = riskType === 'tod' || riskType === 'bu';
  const status = isCalculable ? getOverallStatus(riskType, timeline) : null;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:shadow-primary/5">
      {/* Status indicator bar */}
      {status && (
        <div className={`absolute top-0 left-0 right-0 h-1 ${statusDotColors[status.color]}`} />
      )}
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{RISK_ICONS[riskType]}</span>
          <h3 className="font-semibold text-lg text-card-foreground">{RISK_LABELS[riskType]}</h3>
        </div>
      </div>

      {/* Status badge */}
      {status && (
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-2.5 h-2.5 rounded-full ${statusDotColors[status.color]} animate-pulse`} />
          <span className="text-sm text-muted-foreground">{status.label}</span>
        </div>
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
          <div key={contract.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-card-foreground truncate">
                {contract.provider} {contract.name.length > 20 ? contract.name.substring(0, 20) + '…' : contract.name}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {(contract.coverageAmount / 1000).toFixed(0)}k€ · {contract.monthlyPremium}€/mtl
              </p>
            </div>
            <Switch
              checked={contract.active}
              onCheckedChange={() => toggleContract(contract.id)}
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
