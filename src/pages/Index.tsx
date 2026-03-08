import { useState } from 'react';
import { InsuranceProvider, useInsurance } from '@/hooks/useInsurance';
import { RiskTile } from '@/components/RiskTile';
import { TimelineView } from '@/components/TimelineView';
import { SummaryBar } from '@/components/SummaryBar';
import { RiskType } from '@/lib/insurance-types';

function DashboardContent() {
  const [view, setView] = useState<'dashboard' | 'timeline'>('dashboard');
  const [timelineRisk, setTimelineRisk] = useState<RiskType>('tod');
  const { household } = useInsurance();

  const openTimeline = (risk: RiskType) => {
    setTimelineRisk(risk);
    setView('timeline');
  };

  if (view === 'timeline') {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <TimelineView initialRisk={timelineRisk} onBack={() => setView('dashboard')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-2">
            Zeitachse Absicherung
          </h1>
          <p className="text-muted-foreground">
            {household.persons.map(p => p.name).join(' & ')} · {household.children.length} Kinder · Kredit bis {household.mortgageEndYear}
          </p>
        </div>

        <SummaryBar />

        {/* Risk tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['tod', 'bu', 'unfall', 'sachwerte'] as RiskType[]).map(risk => (
            <RiskTile
              key={risk}
              riskType={risk}
              onOpenTimeline={() => openTimeline(risk)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const Index = () => (
  <InsuranceProvider>
    <DashboardContent />
  </InsuranceProvider>
);

export default Index;
