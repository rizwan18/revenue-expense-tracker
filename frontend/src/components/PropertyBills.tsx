import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Bill } from "../api/types";
import { Button, Card, SectionHeading } from "./ui";
import { Modal } from "./Modal";
import { BillForm } from "./BillForm";
import { formatCurrency, formatDate } from "../lib/format";

const FREQUENCY_LABEL: Record<string, string> = {
  WEEKLY: "weekly",
  FORTNIGHTLY: "fortnightly",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  HALF_YEARLY: "half-yearly",
  ANNUALLY: "annually",
  CUSTOM: "one-off",
};

/** Recurring bills (council rates, water, insurance…) linked to one property, with due-date reminders. */
export function PropertyBills({ propertyId }: { propertyId: string }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    return api
      .get<Bill[]>("/bills")
      .then((all) => setBills(all.filter((b) => b.property?.id === propertyId)))
      .catch(() => setBills([]));
  }, [propertyId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleMarkPaid(id: string) {
    await api.post(`/bills/${id}/mark-paid`);
    load();
  }

  const sorted = [...bills].sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

  return (
    <section>
      <SectionHeading
        title="Bills"
        subtitle="Regular costs for this property, with due-date reminders."
        action={
          <Button size="sm" onClick={() => setShowForm(true)}>
            + Add bill
          </Button>
        }
      />
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <p className="p-5 text-sm text-[var(--color-ink-soft)]">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="p-5 text-sm text-[var(--color-ink-soft)]">No bills linked to this property yet. Add council rates, water, insurance or land tax so you never miss a due date.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {sorted.map((b) => (
              <li key={b.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{b.name}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    {b.status === "OVERDUE" ? "Overdue since " : "Due "}
                    {formatDate(b.nextDueDate)} · {FREQUENCY_LABEL[b.frequency] ?? b.frequency}
                    {b.provider ? ` · ${b.provider}` : ""}
                  </p>
                </div>
                <span className={`font-medium shrink-0 ${b.status === "OVERDUE" ? "text-[var(--color-brick)]" : ""}`}>{formatCurrency(b.amount)}</span>
                <button onClick={() => handleMarkPaid(b.id)} className="text-xs text-[var(--color-eucalyptus)] px-2 py-1 hover:underline shrink-0">
                  Mark paid
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="px-5 py-3 bg-[var(--color-paper-dim)] text-xs text-[var(--color-ink-soft)]">
          "Mark paid" moves the reminder to the next due date. To record the cost, add it as an expense on the Income/Expense tab.{" "}
          <Link to="/bills" className="text-[var(--color-sky)] hover:underline">
            See all bills
          </Link>
        </div>
      </Card>

      {showForm && (
        <Modal title="Add a bill for this property" onClose={() => setShowForm(false)}>
          <BillForm
            defaultPropertyId={propertyId}
            onCancel={() => setShowForm(false)}
            onSaved={() => {
              setShowForm(false);
              load();
            }}
          />
        </Modal>
      )}
    </section>
  );
}
