import { useState, type FormEvent } from "react";
import { api } from "../api/client";
import { Button, Field, inputClass } from "./ui";
import { toInputDate } from "../lib/format";

export function DividendForm({ investmentId, onSaved, onCancel }: { investmentId: string; onSaved: () => void; onCancel: () => void }) {
  const [paymentDate, setPaymentDate] = useState(toInputDate(new Date()));
  const [grossAmount, setGrossAmount] = useState("");
  const [frankingCredit, setFrankingCredit] = useState("0");
  const [taxWithheld, setTaxWithheld] = useState("0");
  const [status, setStatus] = useState<"EXPECTED" | "RECEIVED">("RECEIVED");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!grossAmount || Number(grossAmount) < 0) return setError("Please enter the gross dividend amount.");
    setSaving(true);
    try {
      const gross = Number(grossAmount);
      const withheld = Number(taxWithheld || 0);
      const netAmount = gross - withheld;
      await api.post("/dividends", {
        investmentId,
        paymentDate,
        grossAmount: gross,
        frankingCredit: Number(frankingCredit || 0),
        taxWithheld: withheld,
        netAmount,
        status,
      });
      onSaved();
    } catch {
      setError("We couldn't save this dividend. Please check the details and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-[var(--color-brick)] bg-[var(--color-brick-tint)] rounded-lg px-3 py-2">{error}</p>}
      <div className="flex rounded-xl border border-[var(--color-line)] p-1">
        {(["RECEIVED", "EXPECTED"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${status === s ? "bg-[var(--color-eucalyptus-tint)] text-[var(--color-eucalyptus-dark)]" : "text-[var(--color-ink-soft)]"}`}
          >
            {s === "RECEIVED" ? "Already received" : "Expected"}
          </button>
        ))}
      </div>
      <Field label={status === "RECEIVED" ? "Payment date" : "Expected payment date"} htmlFor="div-date">
        <input id="div-date" type="date" required className={inputClass} value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
      </Field>
      <Field label="Gross dividend" htmlFor="div-gross">
        <input id="div-gross" type="number" min="0" step="0.01" required className={inputClass} value={grossAmount} onChange={(e) => setGrossAmount(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Franking credit" htmlFor="div-franking" hint="Tax already paid on your behalf.">
          <input id="div-franking" type="number" min="0" step="0.01" className={inputClass} value={frankingCredit} onChange={(e) => setFrankingCredit(e.target.value)} />
        </Field>
        <Field label="Tax withheld" htmlFor="div-withheld">
          <input id="div-withheld" type="number" min="0" step="0.01" className={inputClass} value={taxWithheld} onChange={(e) => setTaxWithheld(e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Add dividend"}
        </Button>
      </div>
    </form>
  );
}
