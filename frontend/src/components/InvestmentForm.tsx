import { useState, type FormEvent } from "react";
import { api } from "../api/client";
import { Button, Field, inputClass } from "./ui";

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "SHARE", label: "Share" },
  { value: "ETF", label: "ETF" },
  { value: "LIC", label: "LIC" },
  { value: "MANAGED_FUND", label: "Managed fund" },
  { value: "BOND", label: "Bond" },
  { value: "TERM_DEPOSIT", label: "Term deposit" },
  { value: "CRYPTO", label: "Cryptocurrency" },
  { value: "P2P", label: "Peer-to-peer investment" },
  { value: "PRIVATE", label: "Private investment" },
  { value: "COLLECTIBLE", label: "Collectible" },
  { value: "OTHER", label: "Other" },
];

export function InvestmentForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [type, setType] = useState("SHARE");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please name this investment.");
    setSaving(true);
    try {
      await api.post("/investments", { name, ticker: ticker || null, type, notes: notes || null });
      onSaved();
    } catch {
      setError("We couldn't save this investment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-[var(--color-brick)] bg-[var(--color-brick-tint)] rounded-lg px-3 py-2">{error}</p>}
      <Field label="Name" htmlFor="inv-name" hint="e.g. “Vanguard Australian Shares ETF”">
        <input id="inv-name" required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="ASX ticker (optional)" htmlFor="inv-ticker">
          <input id="inv-ticker" className={inputClass} value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="VAS" />
        </Field>
        <Field label="Type" htmlFor="inv-type">
          <select id="inv-type" className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Notes (optional)" htmlFor="inv-notes">
        <textarea id="inv-notes" rows={2} className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Add investment"}
        </Button>
      </div>
    </form>
  );
}
