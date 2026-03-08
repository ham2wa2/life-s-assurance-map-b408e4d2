import { useInsurance } from '@/hooks/useInsurance';

export function SummaryBar() {
  const { contracts, suggestions } = useInsurance();
  
  const totalMonthly = contracts
    .filter(c => c.active)
    .reduce((sum, c) => sum + c.monthlyPremium, 0);

  const totalSavingPotential = suggestions.reduce((sum, s) => sum + s.monthlySaving, 0);

  return (
    <div className="flex items-center justify-between py-4 px-6 rounded-xl bg-card border border-border mb-8">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Monatliche Gesamtkosten</p>
        <p className="text-2xl font-bold font-mono text-card-foreground">{totalMonthly}€<span className="text-sm text-muted-foreground font-normal">/mtl</span></p>
      </div>
      {totalSavingPotential > 0 && (
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Einsparpotenzial</p>
          <p className="text-2xl font-bold font-mono text-success">+{totalSavingPotential}€<span className="text-sm text-muted-foreground font-normal">/mtl</span></p>
        </div>
      )}
    </div>
  );
}
