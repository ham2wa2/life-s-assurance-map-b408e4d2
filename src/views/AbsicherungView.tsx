/**
 * AbsicherungView — extracted from Index.tsx (Sprint 2)
 * Unchanged logic — shows RiskTiles, TimelineView, SummaryBar
 */

import { useState } from 'react';
import { useInsurance } from '@/hooks/useInsurance';
import { RiskTile } from '@/components/RiskTile';
import { TimelineView } from '@/components/TimelineView';
import { SummaryBar } from '@/components/SummaryBar';
import { ContractDialog } from '@/components/ContractDialog';
import { RiskType, Contract } from '@/lib/insurance-types';

export function AbsicherungView() {
  const [view, setView] = useState<'dashboard' | 'timeline'>('dashboard');
  const [timelineRisk, setTimelineRisk] = useState<RiskType>('tod');
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>();

  const { household } = useInsurance();

  const openTimeline = (risk: RiskType) => {
    setTimelineRisk(risk);
    setView('timeline');
  };

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract);
    setShowContractDialog(true);
  };

  if (view === 'timeline') {
    return (
      <TimelineView initialRisk={timelineRisk} onBack={() => setView('dashboard')} />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Absicherung</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {household.persons.map((p) => p.name).join(' & ')}
            {household.mortgageAmount > 0 && ` · Kredit bis ${household.mortgageEndYear}`}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingContract(undefined);
            setShowContractDialog(true);
          }}
          className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Vertrag
        </button>
      </div>

      <SummaryBar />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(['tod', 'bu', 'unfall', 'sachwerte'] as RiskType[]).map((risk) => (
          <RiskTile
            key={risk}
            riskType={risk}
            onOpenTimeline={() => openTimeline(risk)}
            onEditContract={handleEditContract}
          />
        ))}
      </div>

      {showContractDialog && (
        <ContractDialog
          contract={editingContract}
          onClose={() => setShowContractDialog(false)}
        />
      )}
    </div>
  );
}
