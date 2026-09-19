import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Transaction } from "../api/types";
import { Button, Card, SectionHeading } from "./ui";
import { Modal } from "./Modal";
import { TransactionForm } from "./TransactionForm";
import { defaultEntryDate, formatCurrency, formatCurrencySigned, formatDate } from "../lib/format";

type Scope = { kind: "property" | "investment"; id: string; name: string };

/** One-tap shortcuts shown above the list. Names match the household's default categories. */
const QUICK_ADD: Record<Scope["kind"], { INCOME: string[]; EXPENSE: string[] }> = {
  property: {
    INCOME: ["Rental Income", "Other Income"],
    EXPENSE: ["Council Rates", "Water Rates", "Repairs & Maintenance", "Insurance", "Land Tax", "Property Management", "Body Corporate", "Strata", "Mortgage Interest"],
  },
  investment: {
    INCOME: ["Interest", "ETF Distributions", "Managed Fund Distribution", "Other Investment Income"],
    EXPENSE: ["Accounting", "Legal", "Other"],
  },
};

interface FormState {
  editing?: Transaction;
  direction: "INCOME" | "EXPENSE";
  categoryName?: string;
}

/**
 * Income & expenses recorded against a single property or investment for the
 * selected financial year, with quick-add shortcuts (council rates, water
 * rates, maintenance, rent received…). These are ordinary transactions, so
 * they also appear on the Money page, dashboard and reports.
 */
export function LinkedTransactions({
  scope,
  financialYearId,
  onChanged,
  reloadToken = 0,
  showQuickAdd = true,
  title = "Income & expenses",
}: {
  scope: Scope;
  financialYearId: string;
  onChanged?: () => void;
  /** Change this number to make the list reload (e.g. after the rental schedule adds an entry). */
  reloadToken?: number;
  showQuickAdd?: boolean;
  title?: string;
}) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ financialYear: financialYearId, pageSize: "200" });
    params.set(scope.kind === "property" ? "propertyId" : "investmentId", scope.id);
    return api
      .get<{ items: Transaction[] }>(`/transactions?${params.toString()}`)
      .then((res) => setItems(res.items))
      .catch(() => setItems([]));
  }, [scope.kind, scope.id, financialYearId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load, reloadToken]);

  function refresh() {
    load();
    onChanged?.();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this entry? This can't be undone.")) return;
    await api.delete(`/transactions/${id}`);
    refresh();
  }

  async function handleDuplicate(id: string) {
    await api.post(`/transactions/${id}/duplicate`);
    refresh();
  }

  const income = items.filter((t) => t.direction === "INCOME").reduce((sum, t) => sum + t.amount, 0);
  const expenses = items.filter((t) => t.direction === "EXPENSE").reduce((sum, t) => sum + t.amount, 0);
  const quick = QUICK_ADD[scope.kind];
  const suggested = [...quick.INCOME, ...quick.EXPENSE];

  return (
    <section>
      <SectionHeading
        title={title}
        subtitle={`${items.length} ${items.length === 1 ? "entry" : "entries"} for the ${financialYearId} financial year`}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setForm({ direction: "INCOME" })}>
              + Add income
            </Button>
            <Button size="sm" onClick={() => setForm({ direction: "EXPENSE" })}>
              + Add expense
            </Button>
          </div>
        }
      />

      {showQuickAdd && (
        <div className="mb-3 space-y-2">
          <QuickRow label="Income" names={quick.INCOME} tone="income" onPick={(n) => setForm({ direction: "INCOME", categoryName: n })} />
          <QuickRow label="Expenses" names={quick.EXPENSE} tone="expense" onPick={(n) => setForm({ direction: "EXPENSE", categoryName: n })} />
          {scope.kind === "investment" && (
            <p className="text-xs text-[var(--color-ink-soft)]">Dividends have their own section above, so franking credits are tracked. Use this section for interest, distributions and fees.</p>
          )}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <p className="p-5 text-sm text-[var(--color-ink-soft)]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-5 text-sm text-[var(--color-ink-soft)]">
            {scope.kind === "property"
              ? "Nothing recorded yet for this financial year. Add rent received, council rates, water rates, maintenance and other costs using the buttons above."
              : "Nothing recorded yet for this financial year. Add interest, distributions or fees using the buttons above."}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-[var(--color-line)]">
              {items.map((t) => (
                <li key={t.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--color-ink)] truncate">{t.description}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      {formatDate(t.date)} · {t.category?.name ?? "Uncategorised"}
                      {t.isRecurring ? " · Recurring" : ""}
                    </p>
                    {t.potentialTaxCategory && <p className="text-xs text-[var(--color-ochre)] mt-0.5">{t.potentialTaxCategory}</p>}
                  </div>
                  <span className={`font-medium shrink-0 ${t.direction === "INCOME" ? "text-[var(--color-eucalyptus)]" : "text-[var(--color-brick)]"}`}>
                    {formatCurrencySigned(t.direction === "INCOME" ? t.amount : -t.amount)}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setForm({ editing: t, direction: t.direction })} className="text-xs text-[var(--color-sky)] px-2 py-1 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDuplicate(t.id)} className="text-xs text-[var(--color-sky)] px-2 py-1 hover:underline">
                      Duplicate
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="text-xs text-[var(--color-brick)] px-2 py-1 hover:underline">
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 px-5 py-3 bg-[var(--color-paper-dim)] text-sm">
              <span>
                Income <span className="font-medium text-[var(--color-eucalyptus)]">{formatCurrency(income)}</span>
              </span>
              <span>
                Expenses <span className="font-medium text-[var(--color-brick)]">{formatCurrency(expenses)}</span>
              </span>
              <span>
                Net <span className="font-medium">{formatCurrencySigned(income - expenses)}</span>
              </span>
            </div>
          </>
        )}
      </Card>

      {form && (
        <Modal
          title={form.editing ? "Edit entry" : form.direction === "INCOME" ? `Add income${form.categoryName ? ` — ${form.categoryName}` : ""}` : `Add expense${form.categoryName ? ` — ${form.categoryName}` : ""}`}
          onClose={() => setForm(null)}
        >
          <TransactionForm
            initial={form.editing}
            defaults={{
              direction: form.direction,
              categoryName: form.categoryName,
              description: form.categoryName,
              date: defaultEntryDate(financialYearId),
              ...(scope.kind === "property" ? { propertyId: scope.id } : { investmentId: scope.id }),
            }}
            suggestedCategories={suggested}
            linkedTo={{ kind: scope.kind, name: scope.name }}
            onCancel={() => setForm(null)}
            onSaved={() => {
              setForm(null);
              refresh();
            }}
          />
        </Modal>
      )}
    </section>
  );
}

function QuickRow({ label, names, tone, onPick }: { label: string; names: string[]; tone: "income" | "expense"; onPick: (name: string) => void }) {
  const chip =
    tone === "income"
      ? "bg-[var(--color-eucalyptus-tint)] text-[var(--color-eucalyptus-dark)] hover:brightness-95"
      : "bg-[var(--color-brick-tint)] text-[var(--color-brick)] hover:brightness-95";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-[var(--color-ink-soft)] w-16 shrink-0">{label}</span>
      {names.map((n) => (
        <button key={n} type="button" onClick={() => onPick(n)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${chip}`}>
          + {n}
        </button>
      ))}
    </div>
  );
}
