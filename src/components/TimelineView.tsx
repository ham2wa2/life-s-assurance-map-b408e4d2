import { useState, useMemo } from 'react';
import { useInsurance } from '@/hooks/useInsurance';
import { Slider } from '@/components/ui/slider';
import { AdjustmentOverlay } from '@/components/AdjustmentOverlay';
import { RiskType, RISK_LABELS } from '@/lib/insurance-types';

interface TimelineViewProps {
  initialRisk?: RiskType;
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-destructive',
  over: 'bg-overinsured',
};

const statusLabels: Record<string, string> = {
  green: 'Gut abgesichert',
  yellow: 'Teilweise gedeckt',
  red: 'Lücke!',
  over: 'Überversichert',
};

export function TimelineView({ initialRisk = 'tod', onBack }: TimelineViewProps) {
  const { timeline, suggestions, household, contracts } = useInsurance();
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeRisk, setActiveRisk] = useState<'tod' | 'bu'>(initialRisk === 'bu' ? 'bu' : 'tod');
  const [showAdjustment, setShowAdjustment] = useState<string | null>(null);

  const currentYearData = useMemo(
    () => timeline.find(y => y.year === selectedYear) ?? timeline[0],
    [timeline, selectedYear]
  );

  const yearSuggestion = useMemo(
    () => suggestions.find(s => s.year === selectedYear && contracts.find(c => c.id === s.contractId)?.riskType === activeRisk),
    [suggestions, selectedYear, activeRisk, contracts]
  );

  const need = activeRisk === 'tod' ? currentYearData.todNeed : currentYearData.buNeed;
  const coverage = activeRisk === 'tod' ? currentYearData.todCoverage : currentYearData.buCoverage;
  const status = activeRisk === 'tod' ? currentYearData.todStatus : currentYearData.buStatus;

  const milestones = useMemo(() => {
    const ms: { year: number; label: string }[] = [];
    ms.push({ year: household.mortgageEndYear, label: 'Kredit fertig' });
    household.children.forEach(child => {
      const birthYear = 2026 - child.age;
      ms.push({ year: birthYear + 18, label: `${child.name} 18J` });
      ms.push({ year: birthYear + 25, label: `${child.name} 25J` });
    });
    const hv = household.persons.find(p => p.role === 'hauptverdiener');
    if (hv) ms.push({ year: 2026 + (household.retirementAge - hv.age), label: 'Rente' });
    return ms.sort((a, b) => a.year - b.year);
  }, [household]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1">
          ← Zurück
        </button>
        <div className="flex gap-2">
          {(['tod', 'bu'] as const).map(risk => (
            <button
              key={risk}
              onClick={() => setActiveRisk(risk)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeRisk === risk 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {RISK_LABELS[risk]}
            </button>
          ))}
        </div>
      </div>

      {/* Year info card */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-card-foreground font-mono">{selectedYear}</h2>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            status === 'green' ? 'bg-success/15 text-success' :
            status === 'yellow' ? 'bg-warning/15 text-warning' :
            status === 'red' ? 'bg-destructive/15 text-destructive' :
            'bg-overinsured/15 text-overinsured'
          }`}>
            <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
            {statusLabels[status]}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6 mt-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Bedarf</p>
            <p className="text-xl font-bold font-mono text-card-foreground">
              {need > 0 ? `${(need / 1000).toFixed(0)}k€` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Deckung</p>
            <p className="text-xl font-bold font-mono text-card-foreground">
              {coverage > 0 ? `${(coverage / 1000).toFixed(0)}k€` : '—'}
            </p>
          </div>
        </div>

        {/* Coverage vs need bar */}
        <div className="mt-4">
          <div className="h-4 rounded-full bg-muted overflow-hidden relative">
            {need > 0 && (
              <>
                <div
                  className={`h-full ${statusColors[status]} transition-all duration-500 rounded-full`}
                  style={{ width: `${Math.min(100, (coverage / need) * 100)}%` }}
                />
                {coverage > need && (
                  <div
                    className="absolute top-0 h-full bg-overinsured/40 rounded-r-full"
                    style={{
                      left: `${(need / coverage) * 100}%`,
                      width: `${Math.min(100 - (need / coverage) * 100, 100)}%`,
                    }}
                  />
                )}
              </>
            )}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">0€</span>
            <span className="text-xs text-muted-foreground">
              {Math.max(need, coverage) > 0 ? `${(Math.max(need, coverage) / 1000).toFixed(0)}k€` : ''}
            </span>
          </div>
        </div>

        {/* Suggestion */}
        {yearSuggestion && (
          <button
            onClick={() => setShowAdjustment(yearSuggestion.contractId)}
            className="mt-4 w-full py-3 px-4 rounded-lg bg-accent/10 border border-accent/30 text-sm text-card-foreground hover:bg-accent/20 transition-colors text-left"
          >
            <span className="font-medium">💡 Anpassungsvorschlag:</span>{' '}
            {contracts.find(c => c.id === yearSuggestion.contractId)?.provider}{' '}
            {(yearSuggestion.currentAmount / 1000).toFixed(0)}k€ → {(yearSuggestion.suggestedAmount / 1000).toFixed(0)}k€
            <span className="block text-success font-mono font-bold mt-1">
              +{yearSuggestion.monthlySaving}€/Monat sparen
            </span>
          </button>
        )}
      </div>

      {/* Timeline visualization */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Zeitachse</h3>
        
        <div className="flex gap-0.5 h-10 mb-2 rounded-lg overflow-hidden">
          {timeline.map((y) => {
            const s = activeRisk === 'tod' ? y.todStatus : y.buStatus;
            const isSelected = y.year === selectedYear;
            return (
              <button
                key={y.year}
                onClick={() => setSelectedYear(y.year)}
                className={`flex-1 ${statusColors[s]} transition-all hover:opacity-80 relative ${
                  isSelected ? 'ring-2 ring-foreground ring-offset-1 ring-offset-card z-10 rounded-sm' : ''
                }`}
                title={`${y.year}: ${statusLabels[s]}`}
              />
            );
          })}
        </div>

        {/* Year labels */}
        <div className="flex justify-between text-xs text-muted-foreground mb-4">
          <span>2026</span>
          <span>2035</span>
          <span>2045</span>
          <span>2060</span>
        </div>

        {/* Milestones */}
        <div className="flex flex-wrap gap-2">
          {milestones.map((ms, i) => (
            <button
              key={i}
              onClick={() => setSelectedYear(ms.year)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                selectedYear === ms.year
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-border hover:border-primary/50'
              }`}
            >
              {ms.year}: {ms.label}
            </button>
          ))}
        </div>

        {/* Slider */}
        <div className="mt-6">
          <Slider
            value={[selectedYear]}
            min={2026}
            max={2060}
            step={1}
            onValueChange={([v]) => setSelectedYear(v)}
          />
        </div>
      </div>

      {/* Adjustment Overlay */}
      {showAdjustment && (
        <AdjustmentOverlay
          contractId={showAdjustment}
          year={selectedYear}
          onClose={() => setShowAdjustment(null)}
        />
      )}
    </div>
  );
}
