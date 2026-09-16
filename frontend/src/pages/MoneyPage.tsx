import { useEffect, useState, useCallback } from "react";
import { useFinancialYear } from "../context/FinancialYearContext";
import { api } from "../api/client";
import type { Transaction } from "../api/types";
import { Button, Card, EmptyState, SectionHeading, inputClass } from "../components/ui";
import { Modal } from "../components/Modal";
import { TransactionForm } from "../components/TransactionForm";
import { formatCurrencySigned, formatDate } from "../lib/format";

type DirectionFilter = "ALL" | "INCOME" | "EXPENSE";

export default function MoneyPage() {
  const { financialYearId } = useFinancialYear();
  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState<DirectionFilter>("ALL");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>(undefined);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ financialYear: financialYearId, pageSize: "100" });
    if (direction !== "ALL") params.set("direction", direction);
    if (search) params.set("search", search);
    api
      .get<{ items: Transaction[]; total: number }>(`/transactions?${params.toString()}`)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [financialYearId, direction, search]);

  useEffect(() => {
    const t = setTimeout(load, 200); // small debounce for search
    return () => clearTimeout(t);
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Remove this transaction? This can't be undone.")) return;
    await api.delete(`/transactions/${id}`);
    load();
  }

  async function handleDuplicate(id: string) {
    await api.post(`/transactions/${id}/duplicate`);
    load();
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Money"
        subtitle={`${total} transaction${total === 1 ? "" : "s"} this financial year`}
        action={
          <Button
            onClick={() => {
              setEditing(undefined);
              setShowForm(true);
            }}
          >
            + Add
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex rounded-xl border border-[var(--color-line)] p-1">
          {(["ALL", "INCOME", "EXPENSE"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                direction === d ? "bg-[var(--color-eucalyptus-tint)] text-[var(--color-eucalyptus-dark)]" : "text-[var(--color-ink-soft)]"
              }`}
            >
              {d === "ALL" ? "All" : d === "INCOME" ? "Income" : "Expenses"}
            </button>
          ))}
        </div>
        <input
          placeholder="Search transactions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} max-w-xs`}
          aria-label="Search transactions"
        />
      </div>

      {loading ? (
        <p className="text-[var(--color-ink-soft)]">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Record your income and expenses here — salary, pension, rent received, council rates, groceries and more."
          action={<Button onClick={() => setShowForm(true)}>Add your first transaction</Button>}
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-[var(--color-line)]">
            {items.map((t) => (
              <li key={t.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--color-ink)] truncate">{t.description}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    {formatDate(t.date)} · {t.category?.name ?? "Uncategorised"}
                    {t.property ? ` · ${t.property.name}` : ""}
                    {t.investment ? ` · ${t.investment.name}` : ""}
                    {t.isRecurring ? " · Recurring" : ""}
                  </p>
                  {t.potentialTaxCategory && <p className="text-xs text-[var(--color-ochre)] mt-0.5">{t.potentialTaxCategory}</p>}
                </div>
                <span className={`font-medium shrink-0 ${t.direction === "INCOME" ? "text-[var(--color-eucalyptus)]" : "text-[var(--color-brick)]"}`}>
                  {formatCurrencySigned(t.direction === "INCOME" ? t.amount : -t.amount)}
                </span>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditing(t);
                      setShowForm(true);
                    }}
                    className="text-xs text-[var(--color-sky)] px-2 py-1 hover:underline"
                  >
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
        </Card>
      )}

      {showForm && (
        <Modal title={editing ? "Edit transaction" : "Add a transaction"} onClose={() => setShowForm(false)}>
          <TransactionForm
            initial={editing}
            onCancel={() => setShowForm(false)}
            onSaved={() => {
              setShowForm(false);
              load();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
