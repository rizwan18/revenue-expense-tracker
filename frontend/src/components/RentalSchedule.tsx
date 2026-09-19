import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import type { RentalScheduleResponse, ScheduleLine } from "../api/types";
import { Button, Card, Field, SectionHeading, inputClass } from "./ui";
import { Modal } from "./Modal";
import { TransactionForm } from "./TransactionForm";
import { defaultEntryDate, formatMoney, toInputDate } from "../lib/format";

interface EntryTarget {
  line: ScheduleLine;
  direction: "INCOME" | "EXPENSE";
}

/**
 * Rental income & expenses schedule for one property and financial year:
 * ownership %, date available for rent, weeks rented, then a configurable list
 * of income and expense lines with totals and net rent.
 *
 * Every figure is the sum of ordinary transactions recorded against the
 * property, so it always agrees with the dashboard, reports and Money page.
 */
export function RentalSchedule({
  propertyId,
  propertyName,
  financialYearId,
  reloadToken,
  onChanged,
}: {
  propertyId: string;
  propertyName: string;
  financialYearId: string;
  reloadToken: number;
  onChanged: () => void;
}) {
  const [data, setData] = useState<RentalScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [customising, setCustomising] = useState(false);
  const [entry, setEntry] = useState<EntryTarget | null>(null);

  // Rental details inputs (kept as strings so they can be edited freely)
  const [ownership, setOwnership] = useState("100");
  const [available, setAvailable] = useState("");
  const [weeks, setWeeks] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const seededFor = useRef<string | null>(null);

  // "Customise your list" inputs
  const [existingId, setExistingId] = useState("");
  const [newName, setNewName] = useState("");
  const [newDirection, setNewDirection] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [newManual, setNewManual] = useState(false);
  const [lineBusy, setLineBusy] = useState(false);
  const [lineError, setLineError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<RentalScheduleResponse>(`/properties/${propertyId}/schedule?financialYear=${financialYearId}`);
      setData(res);
      setLoadError(null);
      // Fill the details inputs the first time we see this property/year, but never
      // overwrite what someone is typing when the schedule refreshes after an entry is added.
      const key = `${propertyId}:${financialYearId}`;
      if (seededFor.current !== key) {
        seededFor.current = key;
        setOwnership(String(res.details.ownershipPercentage));
        setAvailable(toInputDate(res.details.availableForRentDate));
        setWeeks(res.details.weeksRented != null ? String(res.details.weeksRented) : "");
      }
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "We couldn't load the rental schedule.");
    }
  }, [propertyId, financialYearId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load, reloadToken]);

  async function afterChange() {
    await load();
    onChanged();
  }

  const detailsDirty =
    !!data &&
    (Number(ownership) !== data.details.ownershipPercentage ||
      available !== toInputDate(data.details.availableForRentDate) ||
      (weeks === "" ? null : Number(weeks)) !== data.details.weeksRented);

  async function saveDetails() {
    setDetailsError(null);
    const pct = Number(ownership);
    if (ownership === "" || Number.isNaN(pct) || pct < 0 || pct > 100) return setDetailsError("Ownership must be between 0% and 100%.");
    if (weeks !== "" && (!Number.isInteger(Number(weeks)) || Number(weeks) < 0 || Number(weeks) > 52)) return setDetailsError("Weeks rented must be a whole number from 0 to 52.");
    setSavingDetails(true);
    try {
      await api.put(`/properties/${propertyId}/schedule/details`, {
        financialYear: financialYearId,
        ownershipPercentage: pct,
        availableForRentDate: available || null,
        weeksRented: weeks === "" ? null : Number(weeks),
      });
      seededFor.current = null; // re-seed from what was saved
      await afterChange();
    } catch (err) {
      setDetailsError(err instanceof ApiError ? err.message : "We couldn't save these details. Please try again.");
    } finally {
      setSavingDetails(false);
    }
  }

  async function addLine(payload: { categoryId: string } | { name: string; direction: "INCOME" | "EXPENSE"; isManual: boolean }) {
    setLineError(null);
    setLineBusy(true);
    try {
      await api.post(`/properties/${propertyId}/schedule/lines`, payload);
      setExistingId("");
      setNewName("");
      setNewManual(false);
      await afterChange();
    } catch (err) {
      setLineError(err instanceof ApiError ? err.message : "We couldn't add that line. Please try again.");
    } finally {
      setLineBusy(false);
    }
  }

  async function removeLine(line: ScheduleLine) {
    if (!line.lineId) return;
    const note = line.entryCount > 0 ? ` It has ${line.entryCount} ${line.entryCount === 1 ? "entry" : "entries"} this year — they won't be deleted and will still count in your totals.` : "";
    if (!confirm(`Remove "${line.name}" from this property's list?${note}`)) return;
    setLineError(null);
    try {
      await api.delete(`/properties/${propertyId}/schedule/lines/${line.lineId}`);
      await afterChange();
    } catch (err) {
      setLineError(err instanceof ApiError ? err.message : "We couldn't remove that line. Please try again.");
    }
  }

  if (loading && !data) {
    return (
      <section>
        <SectionHeading title="Rental income & expenses" />
        <p className="text-[var(--color-ink-soft)]">Loading…</p>
      </section>
    );
  }
  if (!data) {
    return (
      <section>
        <SectionHeading title="Rental income & expenses" />
        <p className="text-sm text-[var(--color-brick)]">{loadError ?? "We couldn't load the rental schedule."}</p>
      </section>
    );
  }

  const incomeCategories = data.availableCategories.filter((c) => c.direction === "INCOME");
  const expenseCategories = data.availableCategories.filter((c) => c.direction === "EXPENSE");

  return (
    <section>
      <SectionHeading
        title="Rental income & expenses"
        subtitle={`${propertyName} · ${financialYearId} financial year`}
        action={
          <Button size="sm" variant={customising ? "primary" : "secondary"} onClick={() => setCustomising((v) => !v)}>
            {customising ? "Done" : "Customise list"}
          </Button>
        }
      />

      <Card className="p-0 overflow-hidden">
        {/* Rental details */}
        <div className="p-5 border-b border-[var(--color-line)]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Ownership percentage" htmlFor="rs-own" hint="Your share of this property.">
              <div className="relative">
                <input id="rs-own" type="number" min="0" max="100" step="0.01" className={`${inputClass} pr-8`} value={ownership} onChange={(e) => setOwnership(e.target.value)} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-soft)]">%</span>
              </div>
            </Field>
            <Field label="Date available for rent" htmlFor="rs-available" hint="When it was first genuinely available to rent.">
              <input id="rs-available" type="date" className={inputClass} value={available} onChange={(e) => setAvailable(e.target.value)} />
            </Field>
            <Field label={`Weeks rented in ${financialYearId}`} htmlFor="rs-weeks" hint="Out of 52.">
              <input id="rs-weeks" type="number" min="0" max="52" step="1" className={inputClass} value={weeks} onChange={(e) => setWeeks(e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Button size="sm" onClick={saveDetails} disabled={!detailsDirty || savingDetails}>
              {savingDetails ? "Saving…" : "Save details"}
            </Button>
            {detailsError && <p className="text-sm text-[var(--color-brick)]">{detailsError}</p>}
          </div>
        </div>

        {/* Customise list */}
        {customising && (
          <div className="p-5 border-b border-[var(--color-line)] bg-[var(--color-paper-dim)] space-y-4">
            <div>
              <h3 className="font-display font-semibold">Customise your list</h3>
              <p className="text-sm text-[var(--color-ink-soft)] mt-0.5">Add any income or expense type this property has, or remove the ones that don't apply. Entries you've already recorded are never deleted.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1">
                <label htmlFor="rs-existing" className="block text-sm font-medium mb-1">
                  Add an existing type
                </label>
                <select id="rs-existing" className={inputClass} value={existingId} onChange={(e) => setExistingId(e.target.value)}>
                  <option value="">Choose…</option>
                  {incomeCategories.length > 0 && (
                    <optgroup label="Income">
                      {incomeCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {expenseCategories.length > 0 && (
                    <optgroup label="Expenses">
                      {expenseCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <Button size="sm" onClick={() => addLine({ categoryId: existingId })} disabled={!existingId || lineBusy}>
                Add to list
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Or create a new type</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input aria-label="New line name" className={`${inputClass} flex-1`} placeholder="e.g. Pest control, Bond retained" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <select aria-label="New line type" className={`${inputClass} sm:w-40`} value={newDirection} onChange={(e) => setNewDirection(e.target.value as "INCOME" | "EXPENSE")}>
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
                <Button size="sm" onClick={() => addLine({ name: newName.trim(), direction: newDirection, isManual: newManual })} disabled={!newName.trim() || lineBusy}>
                  Create &amp; add
                </Button>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newManual} onChange={(e) => setNewManual(e.target.checked)} className="w-4 h-4 accent-[var(--color-eucalyptus)]" />
                Manually calculated (worked out elsewhere, e.g. a depreciation schedule)
              </label>
            </div>
            {lineError && <p className="text-sm text-[var(--color-brick)]">{lineError}</p>}
          </div>
        )}

        {/* Income */}
        <ScheduleSection
          title="Income"
          direction="INCOME"
          lines={data.income.lines}
          totalLabel="Gross rent (total income)"
          total={data.income.total}
          customising={customising}
          onAdd={(line) => setEntry({ line, direction: "INCOME" })}
          onRemove={removeLine}
          onAddToList={(line) => line.categoryId && addLine({ categoryId: line.categoryId })}
        />

        {/* Expenses */}
        <ScheduleSection
          title="Expenses"
          direction="EXPENSE"
          lines={data.expenses.lines}
          totalLabel="Total expenses"
          total={data.expenses.total}
          customising={customising}
          onAdd={(line) => setEntry({ line, direction: "EXPENSE" })}
          onRemove={removeLine}
          onAddToList={(line) => line.categoryId && addLine({ categoryId: line.categoryId })}
        />

        {/* Net rent */}
        <div className="px-5 py-4 bg-[var(--color-paper-dim)] space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-display font-semibold">Net rent</span>
            <span className={`font-display text-xl font-semibold ${data.netRent >= 0 ? "text-[var(--color-eucalyptus)]" : "text-[var(--color-brick)]"}`}>{formatMoney(data.netRent)}</span>
          </div>
          {data.ownershipPercentage < 100 && (
            <div className="flex items-center justify-between text-sm text-[var(--color-ink-soft)]">
              <span>Your share at {data.ownershipPercentage}% ownership</span>
              <span className="font-medium text-[var(--color-ink)]">{formatMoney(data.yourShare)}</span>
            </div>
          )}
          <p className="text-xs text-[var(--color-ink-soft)] pt-1">
            Worked out from the entries you've recorded — general information, not tax advice. Check figures such as capital allowances and capital works with your accountant.
          </p>
        </div>
      </Card>

      {entry && (
        <Modal title={`Add ${entry.direction === "INCOME" ? "income" : "expense"} — ${entry.line.name}`} onClose={() => setEntry(null)}>
          <TransactionForm
            defaults={{
              direction: entry.direction,
              categoryId: entry.line.categoryId ?? undefined,
              description: entry.line.name,
              date: defaultEntryDate(financialYearId),
              propertyId,
            }}
            linkedTo={{ kind: "property", name: propertyName }}
            onCancel={() => setEntry(null)}
            onSaved={() => {
              setEntry(null);
              afterChange();
            }}
          />
        </Modal>
      )}
    </section>
  );
}

function ScheduleSection({
  title,
  direction,
  lines,
  totalLabel,
  total,
  customising,
  onAdd,
  onRemove,
  onAddToList,
}: {
  title: string;
  direction: "INCOME" | "EXPENSE";
  lines: ScheduleLine[];
  totalLabel: string;
  total: number;
  customising: boolean;
  onAdd: (line: ScheduleLine) => void;
  onRemove: (line: ScheduleLine) => void;
  onAddToList: (line: ScheduleLine) => void;
}) {
  const isExpense = direction === "EXPENSE";
  const money = (n: number) => formatMoney(isExpense && n > 0 ? -n : n);
  const tone = isExpense ? "text-[var(--color-brick)]" : "text-[var(--color-eucalyptus)]";

  return (
    <div className="border-b border-[var(--color-line)]">
      <h3 className="px-5 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">{title}</h3>
      {lines.length === 0 ? (
        <p className="px-5 py-3 text-sm text-[var(--color-ink-soft)]">Nothing on the list yet. Use “Customise list” to add {isExpense ? "an expense" : "an income"} type.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-line)]">
          {lines.map((line) => (
            <li key={line.lineId ?? `${line.categoryId ?? "none"}-${direction}`} className="flex items-center gap-3 px-5 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-ink)] flex flex-wrap items-center gap-x-2">
                  <span className="truncate">{line.name}</span>
                  {line.isManual && <span className="text-[11px] rounded-full px-2 py-0.5 bg-[var(--color-sky-tint)] text-[var(--color-sky)]">manually calculated</span>}
                  {!line.listed && <span className="text-[11px] rounded-full px-2 py-0.5 bg-[var(--color-ochre-tint)] text-[#7a4d1a]">not on your list</span>}
                </p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  {line.entryCount === 0 ? "No entries yet" : `${line.entryCount} ${line.entryCount === 1 ? "entry" : "entries"}`}
                  {!line.listed && line.categoryId === null ? " · categorise these on the Money page" : ""}
                </p>
              </div>
              <span className={`font-medium tabular-nums shrink-0 ${line.amount > 0 ? tone : "text-[var(--color-ink-soft)]"}`}>{money(line.amount)}</span>
              <div className="flex gap-1 shrink-0 w-28 justify-end">
                {(line.listed || line.categoryId) && (
                  <button onClick={() => onAdd(line)} className="text-xs text-[var(--color-eucalyptus)] px-2 py-1 hover:underline">
                    + Add
                  </button>
                )}
                {customising && line.listed && (
                  <button onClick={() => onRemove(line)} className="text-xs text-[var(--color-brick)] px-2 py-1 hover:underline">
                    Remove
                  </button>
                )}
                {customising && !line.listed && line.categoryId && (
                  <button onClick={() => onAddToList(line)} className="text-xs text-[var(--color-sky)] px-2 py-1 hover:underline">
                    Add to list
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-line)] font-medium">
        <span>{totalLabel}</span>
        <span className={`tabular-nums ${tone}`}>{money(total)}</span>
      </div>
    </div>
  );
}
