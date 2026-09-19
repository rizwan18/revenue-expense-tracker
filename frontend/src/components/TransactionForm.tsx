import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Category, Account, Property, Investment, Transaction } from "../api/types";
import { Button, Field, inputClass } from "./ui";
import { toInputDate } from "../lib/format";

export interface TransactionFormDefaults {
  direction?: "INCOME" | "EXPENSE";
  /** Pre-select the category with this name (matched against the chosen direction). */
  categoryName?: string;
  /** Pre-select this exact category (takes precedence over categoryName). */
  categoryId?: string;
  description?: string;
  /** yyyy-mm-dd */
  date?: string;
  propertyId?: string;
  investmentId?: string;
}

export function TransactionForm({
  initial,
  defaults,
  suggestedCategories,
  linkedTo,
  onSaved,
  onCancel,
}: {
  initial?: Transaction;
  /** Starting values for a new transaction (ignored when editing). */
  defaults?: TransactionFormDefaults;
  /** Category names to list first, under a "Suggested" heading. */
  suggestedCategories?: string[];
  /** When set, the transaction is tied to a property/investment and the pickers are hidden. */
  linkedTo?: { kind: "property" | "investment"; name: string };
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [direction, setDirection] = useState<"INCOME" | "EXPENSE">(initial?.direction ?? defaults?.direction ?? "EXPENSE");
  const [date, setDate] = useState(toInputDate(initial?.date) || defaults?.date || toInputDate(new Date()));
  const [description, setDescription] = useState(initial?.description ?? defaults?.description ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? defaults?.categoryId ?? "");
  const [propertyId, setPropertyId] = useState(initial?.propertyId ?? defaults?.propertyId ?? "");
  const [investmentId, setInvestmentId] = useState(initial?.investmentId ?? defaults?.investmentId ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isRecurring, setIsRecurring] = useState(initial?.isRecurring ?? false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Category[]>("/categories").then(setCategories).catch(() => {});
    api.get<Account[]>("/accounts").then(setAccounts).catch(() => {});
    api.get<Property[]>("/properties").then(setProperties).catch(() => {});
    api.get<Investment[]>("/investments").then(setInvestments).catch(() => {});
  }, []);

  const filteredCategories = categories.filter((c) => c.direction === direction);

  // Pre-select the requested category (e.g. "Council Rates") once the list has loaded.
  useEffect(() => {
    if (initial || !defaults?.categoryName || categoryId) return;
    const match = categories.find((c) => c.name === defaults.categoryName && c.direction === direction);
    if (match) setCategoryId(match.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  function changeDirection(d: "INCOME" | "EXPENSE") {
    setDirection(d);
    // A category only makes sense for one direction, so clear it if it no longer fits.
    const current = categories.find((c) => c.id === categoryId);
    if (current && current.direction !== d) setCategoryId("");
  }

  const suggested = suggestedCategories ? filteredCategories.filter((c) => suggestedCategories.includes(c.name)) : [];
  const otherCategories = filteredCategories.filter((c) => !suggested.includes(c));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!description.trim()) return setError("Please add a short description.");
    if (!amount || Number(amount) <= 0) return setError("Please enter an amount greater than zero.");

    setSaving(true);
    try {
      const payload = {
        date,
        description,
        amount: Number(amount),
        direction,
        categoryId: categoryId || null,
        propertyId: propertyId || null,
        investmentId: investmentId || null,
        notes: notes || null,
        isRecurring,
      };
      if (initial) {
        await api.put(`/transactions/${initial.id}`, payload);
      } else {
        await api.post("/transactions", payload);
      }
      onSaved();
    } catch {
      setError("We couldn't save this transaction. Please check the details and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-[var(--color-brick)] bg-[var(--color-brick-tint)] rounded-lg px-3 py-2">{error}</p>}

      <div className="flex rounded-xl border border-[var(--color-line)] p-1">
        {(["EXPENSE", "INCOME"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => changeDirection(d)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              direction === d ? (d === "INCOME" ? "bg-[var(--color-eucalyptus-tint)] text-[var(--color-eucalyptus-dark)]" : "bg-[var(--color-brick-tint)] text-[var(--color-brick)]") : "text-[var(--color-ink-soft)]"
            }`}
          >
            {d === "INCOME" ? "Income" : "Expense"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" htmlFor="tx-date">
          <input id="tx-date" type="date" required className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Amount (AUD)" htmlFor="tx-amount">
          <input id="tx-amount" type="number" min="0" step="0.01" required className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      </div>

      <Field label="Description" htmlFor="tx-description">
        <input id="tx-description" required className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Council rates — Smith St" />
      </Field>

      <Field label="Category" htmlFor="tx-category">
        <select id="tx-category" className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">No category</option>
          {suggested.length > 0 && (
            <optgroup label="Suggested">
              {suggested.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          )}
          {suggested.length > 0 ? (
            <optgroup label="All categories">
              {otherCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ) : (
            otherCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))
          )}
        </select>
      </Field>

      {!linkedTo && properties.length > 0 && (
        <Field label="Property (optional)" htmlFor="tx-property">
          <select id="tx-property" className={inputClass} value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">Not property-related</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {!linkedTo && investments.length > 0 && (
        <Field label="Investment (optional)" htmlFor="tx-investment">
          <select id="tx-investment" className={inputClass} value={investmentId} onChange={(e) => setInvestmentId(e.target.value)}>
            <option value="">Not investment-related</option>
            {investments.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {linkedTo && (
        <p className="text-sm text-[var(--color-ink-soft)] bg-[var(--color-paper-dim)] rounded-lg px-3 py-2">
          This will be recorded against the {linkedTo.kind} <span className="font-medium text-[var(--color-ink)]">{linkedTo.name}</span>.
        </p>
      )}

      <Field label="Notes (optional)" htmlFor="tx-notes">
        <textarea id="tx-notes" rows={2} className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="w-4 h-4 accent-[var(--color-eucalyptus)]" />
        Make this recurring
      </label>

      {accounts.length === 0 && <p className="text-xs text-[var(--color-ink-soft)]">Tip: add an account in Settings to track which bank account this came from.</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : initial ? "Save changes" : "Add transaction"}
        </Button>
      </div>
    </form>
  );
}
