import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Property, Category } from "../api/types";
import { Button, Field, inputClass } from "./ui";
import { toInputDate } from "../lib/format";

const FREQUENCY_OPTIONS = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "FORTNIGHTLY", label: "Fortnightly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "HALF_YEARLY", label: "Half-yearly" },
  { value: "ANNUALLY", label: "Annually" },
  { value: "CUSTOM", label: "Custom / one-off" },
];

const REMINDER_OPTIONS = [1, 3, 7, 14, 30];

export function BillForm({ onSaved, onCancel, defaultPropertyId }: { onSaved: () => void; onCancel: () => void; defaultPropertyId?: string }) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("MONTHLY");
  const [nextDueDate, setNextDueDate] = useState(toInputDate(new Date()));
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? "");
  const [reminderDaysBefore, setReminderDaysBefore] = useState(7);
  const [autoRenew, setAutoRenew] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Property[]>("/properties").then(setProperties).catch(() => {});
    api.get<Category[]>("/categories").then(setCategories).catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please name this bill.");
    if (!amount || Number(amount) <= 0) return setError("Please enter an amount greater than zero.");
    setSaving(true);
    try {
      await api.post("/bills", {
        name,
        provider: provider || null,
        amount: Number(amount),
        frequency,
        nextDueDate,
        propertyId: propertyId || null,
        reminderDaysBefore,
        autoRenew,
      });
      onSaved();
    } catch {
      setError("We couldn't save this bill. Please check the details and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-[var(--color-brick)] bg-[var(--color-brick-tint)] rounded-lg px-3 py-2">{error}</p>}
      <Field label="Bill name" htmlFor="bill-name" hint="e.g. “Electricity”, “Home insurance”, “Council rates”">
        <input id="bill-name" required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Provider (optional)" htmlFor="bill-provider">
        <input id="bill-provider" className={inputClass} value={provider} onChange={(e) => setProvider(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" htmlFor="bill-amount">
          <input id="bill-amount" type="number" min="0" step="0.01" required className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="How often" htmlFor="bill-frequency">
          <select id="bill-frequency" className={inputClass} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {FREQUENCY_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Next due date" htmlFor="bill-due">
        <input id="bill-due" type="date" required className={inputClass} value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
      </Field>
      {!defaultPropertyId && properties.length > 0 && (
        <Field label="Property (optional)" htmlFor="bill-property">
          <select id="bill-property" className={inputClass} value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">Not property-related</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Remind me before it's due" htmlFor="bill-reminder">
        <select id="bill-reminder" className={inputClass} value={reminderDaysBefore} onChange={(e) => setReminderDaysBefore(Number(e.target.value))}>
          {REMINDER_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d} day{d === 1 ? "" : "s"} before
            </option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} className="w-4 h-4 accent-[var(--color-eucalyptus)]" />
        This bill renews automatically
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Add bill"}
        </Button>
      </div>
    </form>
  );
}
