import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Reminder } from "../api/types";
import { Card, SectionHeading } from "./ui";
import { daysUntil, formatCurrency, formatDate } from "../lib/format";

/**
 * Expenses for this property that are dated in the future. Each one gets a
 * reminder automatically when it's recorded (under Income/Expense), and it
 * also appears on the main Reminders page.
 */
export function PropertyUpcomingPayments({ propertyId }: { propertyId: string }) {
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    return api
      .get<Reminder[]>("/reminders")
      .then((all) =>
        setItems(
          all
            .filter((r) => r.transaction?.propertyId === propertyId && (r.status === "PENDING" || r.status === "SNOOZED"))
            .sort((a, b) => new Date(a.transaction!.date).getTime() - new Date(b.transaction!.date).getTime())
        )
      )
      .catch(() => setItems([]));
  }, [propertyId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function act(id: string, action: "complete" | "disable") {
    await api.post(`/reminders/${id}/${action}`);
    load();
  }

  return (
    <section>
      <SectionHeading title="Upcoming payments" subtitle="Expenses dated in the future appear here automatically, and on the Reminders page." />
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <p className="p-5 text-sm text-[var(--color-ink-soft)]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-5 text-sm text-[var(--color-ink-soft)]">
            Nothing coming up. When you record an expense for this property with a future date (on the Income/Expense tab), it will show up here as a reminder.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {items.map((r) => {
              const tx = r.transaction!;
              const days = daysUntil(tx.date);
              return (
                <li key={r.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{tx.description}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      {days <= 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due in ${days} days`} · {formatDate(tx.date)}
                      {tx.category ? ` · ${tx.category.name}` : ""}
                    </p>
                  </div>
                  <span className="font-medium shrink-0">{formatCurrency(tx.amount)}</span>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => act(r.id, "complete")} className="text-xs text-[var(--color-eucalyptus)] px-2 py-1 hover:underline">
                      Done
                    </button>
                    <button onClick={() => act(r.id, "disable")} className="text-xs text-[var(--color-ink-soft)] px-2 py-1 hover:underline">
                      Dismiss
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
