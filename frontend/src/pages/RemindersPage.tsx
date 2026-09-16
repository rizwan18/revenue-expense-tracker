import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import type { Reminder } from "../api/types";
import { Card, EmptyState, SectionHeading, Button } from "../components/ui";
import { formatDate, daysUntil } from "../lib/format";

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Reminder[]>("/reminders")
      .then((res) => setReminders(res.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function handleSnooze(id: string) {
    await api.post(`/reminders/${id}/snooze`, { days: 3 });
    load();
  }
  async function handleComplete(id: string) {
    await api.post(`/reminders/${id}/complete`);
    load();
  }
  async function handleDisable(id: string) {
    await api.post(`/reminders/${id}/disable`);
    load();
  }

  return (
    <div className="space-y-6">
      <SectionHeading title="Reminders" subtitle="Reminders are created automatically from your bills and expected dividends." />

      {loading ? (
        <p className="text-[var(--color-ink-soft)]">Loading…</p>
      ) : reminders.length === 0 ? (
        <EmptyState title="No reminders right now" description="Add a bill or an expected dividend and we'll remind you before it's due." />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-[var(--color-line)]">
            {reminders.map((r) => {
              const days = daysUntil(r.dueDate);
              return (
                <li key={r.id} className="flex items-center justify-between px-5 py-3 gap-4">
                  <div>
                    <p className="font-medium text-[var(--color-ink)]">{r.title}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      {days <= 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due in ${days} days`} · {formatDate(r.dueDate)}
                      {r.status === "SNOOZED" ? " · Snoozed" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="secondary" onClick={() => handleSnooze(r.id)}>
                      Snooze 3 days
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleComplete(r.id)}>
                      Done
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDisable(r.id)}>
                      Dismiss
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
