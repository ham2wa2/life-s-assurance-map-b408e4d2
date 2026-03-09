/**
 * HaushaltView — Sprint 2
 * Personen, Einkommen, Ausgaben, Kredit & Bildung
 */

import { useState } from 'react';
import { useFinanzplanStore } from '@/store/finanzplanStore';
import { Person, HouseholdConfig } from '@/lib/types';

// ── helpers ──────────────────────────────────────────────────

const currentYear = new Date().getFullYear();

function fmtEur(val: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
}

// ── Subcomponents ────────────────────────────────────────────

interface PersonCardProps {
  person: Person;
  onSave: (updates: Partial<Omit<Person, 'id'>>) => void;
  onDelete?: () => void;
}

function PersonCard({ person, onSave, onDelete }: PersonCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name);
  const [birthYear, setBirthYear] = useState(person.birthYear);
  const [income, setIncome] = useState(person.netIncomeMonthly);
  const [retirementAge, setRetirementAge] = useState(person.retirementAge);

  const age = currentYear - person.birthYear;
  const roleLabel = person.role === 'hauptverdiener' ? 'Hauptverdiener/in' : person.role === 'partner' ? 'Partner/in' : 'Kind';

  const handleSave = () => {
    onSave({ name, birthYear, netIncomeMonthly: income, retirementAge });
    setEditing(false);
  };

  const handleCancel = () => {
    setName(person.name);
    setBirthYear(person.birthYear);
    setIncome(person.netIncomeMonthly);
    setRetirementAge(person.retirementAge);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-card border border-primary/30 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{roleLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Name</label>
            <input
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Geburtsjahr</label>
            <input
              type="number"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={birthYear}
              onChange={(e) => setBirthYear(parseInt(e.target.value) || birthYear)}
              min={currentYear - 80}
              max={currentYear - 18}
            />
          </div>
          {person.role !== 'kind' && (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Netto/Monat (€)</label>
                <input
                  type="number"
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={income}
                  onChange={(e) => setIncome(parseInt(e.target.value) || 0)}
                  min={0}
                  step={100}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Rentenalter</label>
                <input
                  type="number"
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={retirementAge}
                  onChange={(e) => setRetirementAge(parseInt(e.target.value) || 67)}
                  min={55}
                  max={75}
                />
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Speichern
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg border border-input text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Abbrechen
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-4 py-2 rounded-lg border border-destructive/30 text-destructive text-sm hover:bg-destructive/5 transition-colors"
            >
              Löschen
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{roleLabel}</p>
          <p className="text-lg font-semibold text-foreground">{person.name || '—'}</p>
          <p className="text-sm text-muted-foreground">{person.birthYear} · {age} Jahre</p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground border border-border rounded-md px-3 py-1.5 hover:bg-muted/50"
        >
          Bearbeiten
        </button>
      </div>
      {person.role !== 'kind' && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Netto/Monat</span>
          <span className="text-sm font-semibold text-foreground">{fmtEur(person.netIncomeMonthly)}</span>
        </div>
      )}
      {person.role !== 'kind' && (
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Rentenalter</span>
          <span className="text-sm text-foreground">{person.retirementAge} Jahre</span>
        </div>
      )}
    </div>
  );
}

// ── Add Person Form ───────────────────────────────────────────

interface AddPersonFormProps {
  role: 'partner' | 'kind';
  onAdd: (data: Omit<Person, 'id'>) => void;
  onCancel: () => void;
}

function AddPersonForm({ role, onAdd, onCancel }: AddPersonFormProps) {
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState(
    role === 'partner' ? currentYear - 35 : currentYear - 10
  );
  const [income, setIncome] = useState(0);
  const [retirementAge, setRetirementAge] = useState(67);

  const roleLabel = role === 'partner' ? 'Partner/in' : 'Kind';

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ role, name, birthYear, netIncomeMonthly: income, retirementAge });
  };

  return (
    <div className="bg-card border border-primary/30 rounded-xl p-5 space-y-4">
      <p className="text-sm font-semibold text-foreground">{roleLabel} hinzufügen</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Name</label>
          <input
            autoFocus
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={roleLabel}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Geburtsjahr</label>
          <input
            type="number"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={birthYear}
            onChange={(e) => setBirthYear(parseInt(e.target.value) || birthYear)}
            min={currentYear - 80}
            max={currentYear}
          />
        </div>
        {role === 'partner' && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Netto/Monat (€)</label>
            <input
              type="number"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={income}
              onChange={(e) => setIncome(parseInt(e.target.value) || 0)}
              min={0}
              step={100}
            />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          Hinzufügen
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-input text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

// ── Expense Row ───────────────────────────────────────────────

interface ExpenseRowProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  step?: number;
}

function ExpenseRow({ label, value, onChange, step = 50 }: ExpenseRowProps) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(String(value));

  const handleBlur = () => {
    const n = parseInt(raw) || 0;
    onChange(n);
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            type="number"
            className="w-28 border border-primary/40 rounded-md px-2 py-1 text-sm text-right bg-background focus:outline-none"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            step={step}
          />
          <span className="text-sm text-muted-foreground">€</span>
        </div>
      ) : (
        <button
          onClick={() => { setRaw(String(value)); setEditing(true); }}
          className="text-sm font-semibold text-foreground hover:text-primary transition-colors tabular-nums"
        >
          {fmtEur(value)}
        </button>
      )}
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────

export function HaushaltView() {
  const persons     = useFinanzplanStore((s) => s.persons);
  const household   = useFinanzplanStore((s) => s.household);
  const contracts   = useFinanzplanStore((s) => s.contracts);
  const {
    addPerson, updatePerson, deletePerson,
    setHouseholdConfig,
  } = useFinanzplanStore.getState();

  const [showAddPartner, setShowAddPartner] = useState(false);
  const [showAddKind, setShowAddKind] = useState(false);

  const hauptverdiener = persons.find((p) => p.role === 'hauptverdiener');
  const partner        = persons.find((p) => p.role === 'partner');
  const kinder         = persons.filter((p) => p.role === 'kind');

  const totalIncome = persons
    .filter((p) => p.role !== 'kind')
    .reduce((s, p) => s + p.netIncomeMonthly, 0);

  const totalExpenses =
    household.wohnkostenMonatlich +
    household.lebenshaltungMonatlich +
    household.sonstigesMonatlich;

  const totalPremiums = contracts
    .filter((c) => c.active)
    .reduce((s, c) => s + c.monthlyPremium, 0);

  const monthlySavings = totalIncome - totalExpenses - totalPremiums;
  const savingsColor = monthlySavings > 0 ? 'text-emerald-600' : 'text-destructive';

  return (
    <div className="space-y-8">

      {/* ── Personen ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Personen</h2>
        </div>

        <div className="space-y-3">
          {/* Hauptverdiener */}
          {hauptverdiener && (
            <PersonCard
              person={hauptverdiener}
              onSave={(updates) => updatePerson(hauptverdiener.id, updates)}
            />
          )}

          {/* Partner */}
          {partner ? (
            <PersonCard
              person={partner}
              onSave={(updates) => updatePerson(partner.id, updates)}
              onDelete={() => deletePerson(partner.id)}
            />
          ) : !showAddPartner ? (
            <button
              onClick={() => setShowAddPartner(true)}
              className="w-full border border-dashed border-border rounded-xl p-4 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors text-left"
            >
              + Partner/in hinzufügen
            </button>
          ) : (
            <AddPersonForm
              role="partner"
              onAdd={(data) => { addPerson(data); setShowAddPartner(false); }}
              onCancel={() => setShowAddPartner(false)}
            />
          )}

          {/* Kinder */}
          {kinder.map((kind) => (
            <PersonCard
              key={kind.id}
              person={kind}
              onSave={(updates) => updatePerson(kind.id, updates)}
              onDelete={() => deletePerson(kind.id)}
            />
          ))}

          {showAddKind ? (
            <AddPersonForm
              role="kind"
              onAdd={(data) => { addPerson(data); setShowAddKind(false); }}
              onCancel={() => setShowAddKind(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddKind(true)}
              className="w-full border border-dashed border-border rounded-xl p-4 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors text-left"
            >
              + Kind hinzufügen
            </button>
          )}
        </div>
      </section>

      {/* ── Ausgaben ── */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Monatliche Ausgaben</h2>
        <div className="bg-card border border-border rounded-xl px-5">
          <ExpenseRow
            label="Wohnkosten (Miete / NK)"
            value={household.wohnkostenMonatlich}
            onChange={(v) => setHouseholdConfig({ wohnkostenMonatlich: v })}
          />
          <ExpenseRow
            label="Lebenshaltung (Lebensmittel, Freizeit)"
            value={household.lebenshaltungMonatlich}
            onChange={(v) => setHouseholdConfig({ lebenshaltungMonatlich: v })}
          />
          <ExpenseRow
            label="Sonstiges (Abos, Auto, etc.)"
            value={household.sonstigesMonatlich}
            onChange={(v) => setHouseholdConfig({ sonstigesMonatlich: v })}
          />
        </div>
      </section>

      {/* ── Kredit & Bildung ── */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Kredit & Bildung</h2>
        <div className="bg-card border border-border rounded-xl px-5">
          <ExpenseRow
            label="Kreditbetrag (€)"
            value={household.mortgageAmount}
            onChange={(v) => setHouseholdConfig({ mortgageAmount: v })}
            step={5000}
          />
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-sm text-foreground">Kredit läuft bis</span>
            <input
              type="number"
              className="w-24 border border-input rounded-md px-2 py-1 text-sm text-right bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={household.mortgageEndYear}
              onChange={(e) => setHouseholdConfig({ mortgageEndYear: parseInt(e.target.value) || household.mortgageEndYear })}
              min={currentYear}
              max={currentYear + 40}
            />
          </div>
          <ExpenseRow
            label="Studiumskosten/Jahr pro Kind (€)"
            value={household.studyCostPerYear}
            onChange={(v) => setHouseholdConfig({ studyCostPerYear: v })}
            step={1000}
          />
        </div>
      </section>

      {/* ── Monatliche Bilanz ── */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Monatliche Bilanz</h2>
        <div className="bg-card border border-border rounded-xl px-5 py-1">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-sm text-muted-foreground">Gesamteinkommen</span>
            <span className="text-sm font-semibold tabular-nums">{fmtEur(totalIncome)}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-sm text-muted-foreground">Fixausgaben</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">– {fmtEur(totalExpenses)}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-sm text-muted-foreground">Versicherungsprämien</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">– {fmtEur(totalPremiums)}</span>
          </div>
          <div className="flex items-center justify-between py-4">
            <span className="text-sm font-semibold text-foreground">Freie Liquidität</span>
            <span className={`text-base font-bold tabular-nums ${savingsColor}`}>
              {monthlySavings >= 0 ? '' : '– '}{fmtEur(Math.abs(monthlySavings))}
            </span>
          </div>
        </div>
        {monthlySavings < 0 && (
          <p className="mt-2 text-xs text-destructive">
            Ausgaben übersteigen das Einkommen um {fmtEur(Math.abs(monthlySavings))}/Monat.
          </p>
        )}
      </section>
    </div>
  );
}
