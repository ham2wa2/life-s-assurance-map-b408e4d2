import { useState, useMemo } from 'react';
import { useInsurance } from '@/hooks/useInsurance';
import { Slider } from '@/components/ui/slider';

interface AdjustmentOverlayProps {
  contractId: string;
  year: number;
  onClose: () => void;
}

export function AdjustmentOverlay({ contractId, year, onClose }: AdjustmentOverlayProps) {
  const { contracts, suggestions, updateContractAmount, timeline } = useInsurance();
  const contract = contracts.find(c => c.id === contractId);
  const suggestion = suggestions.find(s => s.contractId === contractId);

  const [newAmount, setNewAmount] = useState(suggestion?.suggestedAmount ?? contract?.coverageAmount ?? 0);

  if (!contract) return null;

  const ratio = newAmount / contract.coverageAmount;
  const newPremium = Math.round(contract.monthlyPremium * ratio);
  const saving = contract.monthlyPremium - newPremium;

  const yearData = timeline.find(y => y.year === year) ?? timeline[0];
  const need = contract.riskType === 'tod' ? yearData.todNeed : yearData.buNeed;

  const newCoverageRatio = need > 0 ? newAmount / need : 0;
  const newStatus = need === 0 ? 'over' : newCoverageRatio >= 1 ? 'green' : newCoverageRatio >= 0.7 ? 'yellow' : 'red';

  const handleApply = () => {
    updateContractAmount(contractId, newAmount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-8 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-card-foreground mb-1">
          Anpassung ab {year}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {contract.provider} · {contract.name}
          {suggestion?.reason && <span className="block mt-1">Grund: {suggestion.reason}</span>}
        </p>

        {/* Amount slider */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Versicherungssumme</span>
            <span className="font-mono font-bold text-card-foreground">{(newAmount / 1000).toFixed(0)}k€</span>
          </div>
          <Slider
            value={[newAmount]}
            min={0}
            max={contract.coverageAmount}
            step={10000}
            onValueChange={([v]) => setNewAmount(v)}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0€</span>
            <span>{(contract.coverageAmount / 1000).toFixed(0)}k€</span>
          </div>
        </div>

        {/* Before / After */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground mb-1">Vorher</p>
            <div className="h-3 rounded-full bg-overinsured mb-1" />
            <p className="text-xs text-muted-foreground">Überversichert</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground mb-1">Nachher</p>
            <div className="h-3 rounded-full overflow-hidden bg-secondary">
              <div
                className={`h-full rounded-full transition-all ${
                  newStatus === 'green' ? 'bg-success' :
                  newStatus === 'yellow' ? 'bg-warning' :
                  newStatus === 'red' ? 'bg-destructive' : 'bg-overinsured'
                }`}
                style={{ width: `${Math.min(100, newCoverageRatio * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {newStatus === 'green' ? 'Perfekt' : newStatus === 'yellow' ? 'Knapp' : newStatus === 'red' ? 'Zu wenig' : 'Überversichert'}
            </p>
          </div>
        </div>

        {/* Saving */}
        {saving > 0 && (
          <div className="p-4 rounded-lg bg-success/10 border border-success/20 mb-6 text-center">
            <p className="text-2xl font-bold font-mono text-success">+{saving}€/Monat</p>
            <p className="text-xs text-muted-foreground">Ersparnis</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}
