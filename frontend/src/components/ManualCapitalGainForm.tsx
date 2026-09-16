import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Investment } from "../api/types";
import { Button, Field, inputClass } from "./ui";
import { toInputDate } from "../lib/format";

export function ManualCapitalGainForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [investmentId, setInvestmentId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseCosts, setPurchaseCosts] = useState("0");
  const [saleDate, setSaleDate] = useState(toInputDate(new Date()));
  const [salePrice, setSalePrice] = useState("");
  const [saleCosts, setSaleCosts] = useState("0");
  const [quantity, setQuantity] = useState("1");
  const [ownershipPercentage, setOwnershipPercentage] = useState("100");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Investment[]>("/investments").then(setInvestments).catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!investmentId) return setError("Please choose which investment this disposal relates to.");
    if (!purchaseDate || !purchasePrice) return setError("Please enter the purchase date and price.");
    if (!salePrice) return setError("Please enter the sale price.");
    if (!quantity || Number(quantity) <= 0) return setError("Please enter a quantity greater than zero.");

    setSaving(true);
    try {
      await api.post("/capital-gains/manual", {
        investmentId,
        purchaseDate,
        purchasePrice: Number(purchasePrice),
        purchaseCosts: Number(purchaseCosts || 0),
        saleDate,
        salePrice: Number(salePrice),
        saleCosts: Number(saleCosts || 0),
        quantity: Number(quantity),
        ownershipPercentage: Number(ownershipPercentage || 100),
        notes: notes || null,
      });
      onSaved();
    } catch {
      setError("We couldn't save this disposal. Please check the details and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-[var(--color-ink-soft)] bg-[var(--color-paper-dim)] rounded-lg px-3 py-2">
        Use this for a sale that isn't already recorded as a buy/sell transaction against an investment — for example a private sale, a
        collectible, or something you started holding before using this app.
      </p>
      {error && <p className="text-sm text-[var(--color-brick)] bg-[var(--color-brick-tint)] rounded-lg px-3 py-2">{error}</p>}

      <Field label="Investment" htmlFor="cg-investment">
        <select id="cg-investment" required className={inputClass} value={investmentId} onChange={(e) => setInvestmentId(e.target.value)}>
          <option value="">Choose an investment…</option>
          {investments.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} {i.ticker ? `(${i.ticker})` : ""}
            </option>
          ))}
        </select>
        {investments.length === 0 && <p className="text-xs text-[var(--color-ink-soft)] mt-1">Add the investment first under Investments, then come back here.</p>}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Purchase date" htmlFor="cg-purchase-date">
          <input id="cg-purchase-date" type="date" required className={inputClass} value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </Field>
        <Field label="Sale date" htmlFor="cg-sale-date">
          <input id="cg-sale-date" type="date" required className={inputClass} value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
        </Field>
        <Field label="Purchase price (per unit)" htmlFor="cg-purchase-price">
          <input id="cg-purchase-price" type="number" min="0" step="0.01" required className={inputClass} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
        </Field>
        <Field label="Sale price (per unit)" htmlFor="cg-sale-price">
          <input id="cg-sale-price" type="number" min="0" step="0.01" required className={inputClass} value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
        </Field>
        <Field label="Purchase costs" htmlFor="cg-purchase-costs" hint="Stamp duty, legal fees, brokerage, etc.">
          <input id="cg-purchase-costs" type="number" min="0" step="0.01" className={inputClass} value={purchaseCosts} onChange={(e) => setPurchaseCosts(e.target.value)} />
        </Field>
        <Field label="Sale costs" htmlFor="cg-sale-costs" hint="Agent fees, legal fees, brokerage, etc.">
          <input id="cg-sale-costs" type="number" min="0" step="0.01" className={inputClass} value={saleCosts} onChange={(e) => setSaleCosts(e.target.value)} />
        </Field>
        <Field label="Quantity" htmlFor="cg-quantity">
          <input id="cg-quantity" type="number" min="0" step="any" required className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Field label="Your ownership share" htmlFor="cg-ownership" hint="100% unless this is jointly owned.">
          <input id="cg-ownership" type="number" min="0" max="100" step="1" className={inputClass} value={ownershipPercentage} onChange={(e) => setOwnershipPercentage(e.target.value)} />
        </Field>
      </div>

      <Field label="Notes (optional)" htmlFor="cg-notes">
        <textarea id="cg-notes" rows={2} className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Add disposal"}
        </Button>
      </div>
    </form>
  );
}
