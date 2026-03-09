/**
 * Placeholder views for tabs not yet implemented (Sprint 3+)
 */

import { useFinanzplanStore } from '@/store/finanzplanStore';

interface PlaceholderProps {
  title: string;
  description: string;
  sprint: string;
}

function Placeholder({ title, description, sprint }: PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <span className="text-2xl text-muted-foreground">🚧</span>
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground text-sm max-w-sm">{description}</p>
      <span className="mt-4 text-xs text-muted-foreground/60 font-mono">{sprint}</span>
    </div>
  );
}

export function VermoegenView() {
  return (
    <Placeholder
      title="Vermögen"
      description="Assets, Verbindlichkeiten und Nettovermögen — kommt in Sprint 4."
      sprint="Sprint 4"
    />
  );
}

export function PlanungView() {
  return (
    <Placeholder
      title="30-Jahres-Planung"
      description="Einkommens- und Vermögensentwicklung über die Zeit — kommt in Sprint 5."
      sprint="Sprint 5"
    />
  );
}

export function SzenarienView() {
  return (
    <Placeholder
      title="Szenarien"
      description="Vergleich verschiedener Lebenssituationen und Planungsszenarien — kommt in Sprint 5."
      sprint="Sprint 5"
    />
  );
}
