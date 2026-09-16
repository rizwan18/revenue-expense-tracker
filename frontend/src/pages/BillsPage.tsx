import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import type { Bill } from "../api/types";
import { Button, Card, EmptyState, SectionHeading } from "../components/ui";
import { Modal } from "../components/Modal";
import { BillForm } from "../components/BillForm";
import { formatCurrency, formatDate, daysUntil } from "../lib/format";

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  FORTNIGHTLY: "Fortnightly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half-yearly",
  ANNUALLY: "Annually",
  CUSTOM: "One-off",
};

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Bill[]>("/bills")
      .then(setBills)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function handleMarkPaid(id: string) {
    await api.post(`/bills/${id}/mark-paid`);
    load();
  }

  const overdue = bills.filter((b) => b.status === "OVERDUE");
  const upcoming = bills.filter((b) => b.status === "UPCOMING").sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
  const paid = bills.filter((b) => b.status === "PAID");

  return (
    <div className="space-y-8">
      <SectionHeading title="Bills" subtitle="Everything due, at a glance." action={<Button onClick={() => setShowForm(true)}>+ Add bill</Button>} />

      {loading ? (
        <p className="text-[var(--color-ink-soft)]">Loading…</p>
      ) : bills.length === 0 ? (
        <EmptyState title="No bills yet" description="Add electricity, insurance, council rates and other recurring bills so you never miss a due date." action={<Button onClick={() => setShowForm(true)}>Add bill</Button>} />
      ) : (
        <>
          {overdue.length > 0 && <BillGroup title="Overdue" bills={overdue} onMarkPaid={handleMarkPaid} tone="negative" />}
          <BillGroup title="Upcoming" bills={upcoming} onMarkPaid={handleMarkPaid} tone="neutral" />
          {paid.length > 0 && <BillGroup title="Recently paid" bills={paid.slice(0, 5)} onMarkPaid={handleMarkPaid} tone="positive" />}
        </>
      )}

      {showForm && (
        <Modal title="Add a bill" onClose={() => setShowForm(false)}>
          <BillForm
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

function BillGroup({ title, bills, onMarkPaid, tone }: { title: string; bills: Bill[]; onMarkPaid: (id: string) => void; tone: "negative" | "neutral" | "positive" }) {
  if (bills.length === 0) return null;
  return (
    <section>
      <h3 className="font-display text-lg font-semibold mb-2">{title}</h3>
      <Card className="p-0 overflow-hidden">
        <ul className="divide-y divide-[var(--color-line)]">
          {bills.map((b) => {
            const days = daysUntil(b.nextDueDate);
            return (
              <li key={b.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-[var(--color-ink)]">{b.name}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    {b.provider ? `${b.provider} · ` : ""}
                    {FREQUENCY_LABELS[b.frequency] ?? b.frequency} · due {formatDate(b.nextDueDate)}
                    {tone === "negative" ? ` · ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue` : tone === "neutral" && days <= 7 ? ` · in ${days} day${days === 1 ? "" : "s"}` : ""}
                    {b.property ? ` · ${b.property.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatCurrency(b.amount)}</span>
                  {b.status !== "PAID" && (
                    <button onClick={() => onMarkPaid(b.id)} className="text-xs text-[var(--color-eucalyptus)] font-medium hover:underline">
                      Mark paid
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}
