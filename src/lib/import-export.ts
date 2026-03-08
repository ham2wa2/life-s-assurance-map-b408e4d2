import { HouseholdData, Contract } from './insurance-types';

export interface ExportData {
  version: 1;
  exportedAt: string;
  household: HouseholdData;
  contracts: Contract[];
}

export function exportToJSON(household: HouseholdData, contracts: Contract[]): void {
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    household,
    contracts,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `absicherung-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromJSON(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as ExportData;
        if (!data.household || !data.contracts || !Array.isArray(data.contracts)) {
          throw new Error('Ungültiges Dateiformat');
        }
        if (!data.household.persons || !Array.isArray(data.household.persons)) {
          throw new Error('Ungültige Haushaltsdaten');
        }
        resolve(data);
      } catch (e) {
        reject(new Error('Datei konnte nicht gelesen werden. Bitte eine gültige JSON-Datei wählen.'));
      }
    };
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));
    reader.readAsText(file);
  });
}

export function exportToPDF(): void {
  window.print();
}
