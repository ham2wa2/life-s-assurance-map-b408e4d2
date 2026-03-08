import { HouseholdData, Contract, YearlyNeed, AdjustmentSuggestion } from './insurance-types';

const currentYear = 2026;

export function calculateMortgageRemaining(data: HouseholdData, year: number): number {
  if (year >= data.mortgageEndYear) return 0;
  const totalYears = data.mortgageEndYear - currentYear;
  const yearsLeft = data.mortgageEndYear - year;
  return Math.max(0, data.mortgageAmount * (yearsLeft / totalYears));
}

export function calculateStudyCosts(data: HouseholdData, year: number): number {
  let total = 0;
  for (const child of data.children) {
    const childBirthYear = currentYear - child.age;
    const studyStart = childBirthYear + 18;
    const studyEnd = childBirthYear + 25;
    if (year >= studyStart && year <= studyEnd) {
      total += data.studyCostPerYear;
    }
  }
  return total;
}

export function calculateTodNeed(data: HouseholdData, year: number): number {
  const hauptverdiener = data.persons.find(p => p.role === 'hauptverdiener');
  const partner = data.persons.find(p => p.role === 'partner');
  if (!hauptverdiener) return 0;

  const mortgage = calculateMortgageRemaining(data, year);
  const study = calculateStudyCosts(data, year);
  const partnerGap = partner 
    ? Math.max(0, hauptverdiener.netIncome * 0.6 - partner.netIncome) * 12 * 5
    : hauptverdiener.netIncome * 0.6 * 12 * 5;

  const hauptverdienerAge = hauptverdiener.age + (year - currentYear);
  if (hauptverdienerAge >= data.retirementAge) return 0;

  return mortgage + study * 4 + partnerGap;
}

export function calculateBuNeed(data: HouseholdData, year: number): number {
  const hauptverdiener = data.persons.find(p => p.role === 'hauptverdiener');
  const partner = data.persons.find(p => p.role === 'partner');
  if (!hauptverdiener) return 0;

  const hauptverdienerAge = hauptverdiener.age + (year - currentYear);
  if (hauptverdienerAge >= data.retirementAge) return 0;

  const gesetzlicheRente = hauptverdiener.netIncome * 0.45;
  const partnerIncome = partner?.netIncome ?? 0;
  const gap = Math.max(0, hauptverdiener.netIncome - gesetzlicheRente - partnerIncome);
  
  return gap * 1.2 * 12;
}

export function getCoverageForYear(contracts: Contract[], riskType: 'tod' | 'bu', year: number): number {
  return contracts
    .filter(c => c.riskType === riskType && c.active && c.endYear >= year)
    .reduce((sum, c) => sum + c.coverageAmount, 0);
}

function getStatus(coverage: number, need: number): 'green' | 'yellow' | 'red' | 'over' {
  if (need === 0 && coverage > 0) return 'over';
  if (need === 0) return 'green';
  const ratio = coverage / need;
  if (ratio > 1.2) return 'over';
  if (ratio >= 1) return 'green';
  if (ratio >= 0.7) return 'yellow';
  return 'red';
}

export function calculateTimeline(data: HouseholdData, contracts: Contract[]): YearlyNeed[] {
  const years: YearlyNeed[] = [];
  for (let year = currentYear; year <= currentYear + 34; year++) {
    const todNeed = calculateTodNeed(data, year);
    const buNeed = calculateBuNeed(data, year);
    const todCoverage = getCoverageForYear(contracts, 'tod', year);
    const buCoverage = getCoverageForYear(contracts, 'bu', year);
    years.push({
      year,
      todNeed,
      buNeed,
      todCoverage,
      buCoverage,
      todStatus: getStatus(todCoverage, todNeed),
      buStatus: getStatus(buCoverage, buNeed),
    });
  }
  return years;
}

export function generateSuggestions(
  data: HouseholdData,
  contracts: Contract[],
  timeline: YearlyNeed[]
): AdjustmentSuggestion[] {
  const suggestions: AdjustmentSuggestion[] = [];

  for (const contract of contracts) {
    if (!contract.active) continue;
    
    // Find the year where this contract becomes excessive
    for (const yearData of timeline) {
      if (yearData.year <= currentYear) continue;
      
      const riskType = contract.riskType as 'tod' | 'bu';
      if (riskType !== 'tod' && riskType !== 'bu') continue;

      const need = riskType === 'tod' ? yearData.todNeed : yearData.buNeed;
      const coverage = riskType === 'tod' ? yearData.todCoverage : yearData.buCoverage;
      
      if (coverage > need * 1.2 && need > 0) {
        const suggestedAmount = Math.ceil(need / 10000) * 10000;
        const ratio = suggestedAmount / contract.coverageAmount;
        const saving = contract.monthlyPremium * (1 - ratio);
        
        if (saving > 5) {
          suggestions.push({
            contractId: contract.id,
            year: yearData.year,
            currentAmount: contract.coverageAmount,
            suggestedAmount: Math.max(suggestedAmount, 50000),
            monthlySaving: Math.round(saving),
            reason: yearData.year >= data.mortgageEndYear 
              ? 'Kredit fertig abbezahlt'
              : 'Bedarf gesunken',
          });
          break;
        }
      } else if (need === 0 && coverage > 0) {
        suggestions.push({
          contractId: contract.id,
          year: yearData.year,
          currentAmount: contract.coverageAmount,
          suggestedAmount: 0,
          monthlySaving: contract.monthlyPremium,
          reason: 'Kein Bedarf mehr',
        });
        break;
      }
    }
  }

  return suggestions;
}
