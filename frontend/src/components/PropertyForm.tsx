import { useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Property } from "../api/types";
import { Button, Field, inputClass } from "./ui";
import { toInputDate } from "../lib/format";

export function PropertyForm({ initial, onSaved, onCancel }: { initial?: Property; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [purchaseDate, setPurchaseDate] = useState(toInputDate(initial?.purchaseDate));
  const [purchasePrice, setPurchasePrice] = useState(initial?.purchasePrice != null ? String(initial.purchasePrice) : "");
  const [currentEstimatedValue, setCurrentEstimatedValue] = useState(initial?.currentEstimatedValue != null ? String(initial.currentEstimatedValue) : "");
  const [loanBalance, setLoanBalance] = useState(initial?.loanBalance != null ? String(initial.loanBalance) : "");
  const [rentAmount, setRentAmount] = useState(initial?.rentAmount != null ? String(initial.rentAmount) : "");
  const [rentFrequency, setRentFrequency] = useState(initial?.rentFrequency ?? "WEEKLY");
  const [rentalAgent, setRentalAgent] = useState(initial?.rentalAgent ?? "");
  const [tenantName, setTenantName] = useState(initial?.tenantName ?? "");
  const [showMore, setShowMore] = useState(!!initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please give this property a name.");

    setSaving(true);
    try {
      const payload = {
        name,
        address: address || null,
        purchaseDate: purchaseDate || null,
        purchasePrice: purchasePrice ? Number(purchasePrice) : null,
        currentEstimatedValue: currentEstimatedValue ? Number(currentEstimatedValue) : null,
        loanBalance: loanBalance ? Number(loanBalance) : null,
        rentAmount: rentAmount ? Number(rentAmount) : null,
        rentFrequency: rentAmount ? rentFrequency : null,
        rentalAgent: rentalAgent || null,
        tenantName: tenantName || null,
      };
      if (initial) {
        await api.put(`/properties/${initial.id}`, payload);
      } else {
        await api.post("/properties", payload);
      }
      onSaved();
    } catch {
      setError("We couldn't save this property. Please check the details and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-[var(--color-brick)] bg-[var(--color-brick-tint)] rounded-lg px-3 py-2">{error}</p>}

      <Field label="Property name" htmlFor="p-name" hint="e.g. “Smith Street rental” — just for your own reference.">
        <input id="p-name" required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Address (optional)" htmlFor="p-address">
        <input id="p-address" className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>

      {!showMore && (
        <button type="button" onClick={() => setShowMore(true)} className="text-sm text-[var(--color-eucalyptus)] font-medium">
          + Add rent, value and loan details (optional)
        </button>
      )}

      {showMore && (
        <div className="space-y-4 border-t border-[var(--color-line)] pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Purchase date" htmlFor="p-purchase-date">
              <input id="p-purchase-date" type="date" className={inputClass} value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </Field>
            <Field label="Purchase price" htmlFor="p-purchase-price">
              <input id="p-purchase-price" type="number" min="0" className={inputClass} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
            </Field>
            <Field label="Current estimated value" htmlFor="p-value">
              <input id="p-value" type="number" min="0" className={inputClass} value={currentEstimatedValue} onChange={(e) => setCurrentEstimatedValue(e.target.value)} />
            </Field>
            <Field label="Loan balance" htmlFor="p-loan">
              <input id="p-loan" type="number" min="0" className={inputClass} value={loanBalance} onChange={(e) => setLoanBalance(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Rent amount" htmlFor="p-rent">
              <input id="p-rent" type="number" min="0" className={inputClass} value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} />
            </Field>
            <Field label="Rent frequency" htmlFor="p-rent-freq">
              <select id="p-rent-freq" className={inputClass} value={rentFrequency} onChange={(e) => setRentFrequency(e.target.value)}>
                <option value="WEEKLY">Weekly</option>
                <option value="FORTNIGHTLY">Fortnightly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Rental agent (optional)" htmlFor="p-agent">
              <input id="p-agent" className={inputClass} value={rentalAgent} onChange={(e) => setRentalAgent(e.target.value)} />
            </Field>
            <Field label="Tenant name (optional)" htmlFor="p-tenant">
              <input id="p-tenant" className={inputClass} value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
            </Field>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : initial ? "Save changes" : "Add property"}
        </Button>
      </div>
    </form>
  );
}
