import { useEffect, useState, useCallback } from "react";
import { useFinancialYear } from "../context/FinancialYearContext";
import { api } from "../api/client";
import type { CapitalGainDisposal } from "../api/types";
import { Button, Card, EmptyState, SectionHeading } from "../components/ui";
import { Modal } from "../components/Modal";
import { ManualCapitalGainForm } from "../components/ManualCapitalGainForm";
import { formatCurrency, formatCurrencySigned, formatDate } from "../lib/format";

type ReportKind = "financial-year" | "tax-summary" | "property" | "investment" | "capital-gains";

const TABS: Array<{ id: ReportKind; label: string }> = [
  { id: "financial-year", label: "Financial year" },
  { id: "tax-summary", label: "Tax summary" },
  { id: "property", label: "Property" },
  { id: "investment", label: "Investment" },
  { id: "capital-gains", label: "Capital gains" },
];

export default function ReportsPage() {
  const { financialYearId } = useFinancialYear();
  const [tab, setTab] = useState<ReportKind>("financial-year");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tab === "capital-gains") return; // has its own self-contained component below
    setLoading(true);
    api
      .get<Record<string, unknown>>(`/reports/${tab}?financialYear=${financialYearId}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [tab, financialYearId]);

  async function downloadCsv(reportType: string) {
    const blob = await api.get<Blob>(`/reports/export/${reportType}.csv?financialYear=${financialYearId}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-${financialYearId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <SectionHeading title="Reports" subtitle="Professional summaries you can share with your accountant." />

      <div className="flex flex-wrap rounded-xl border border-[var(--color-line)] p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? "bg-[var(--color-eucalyptus-tint)] text-[var(--color-eucalyptus-dark)]" : "text-[var(--color-ink-soft)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "capital-gains" ? (
        <CapitalGainsReport />
      ) : loading || !data ? (
        <p className="text-[var(--color-ink-soft)]">Loading…</p>
      ) : (
        <>
          {tab === "financial-year" && <FinancialYearReport data={data} />}
          {tab === "tax-summary" && <TaxSummaryReport data={data} onExport={() => downloadCsv("tax-summary")} />}
          {tab === "property" && <PropertyReport data={data} />}
          {tab === "investment" && <InvestmentReport data={data} />}
        </>
      )}
    </div>
  );
}

function CapitalGainsReport() {
  const { financialYearId } = useFinancialYear();
  const [items, setItems] = useState<CapitalGainDisposal[]>([]);
  const [totals, setTotals] = useState<{ gains: number; losses: number; net: number } | null>(null);
  const [disclaimer, setDisclaimer] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<{ items: CapitalGainDisposal[]; totals: { gains: number; losses: number; net: number }; disclaimer: string }>(
        `/capital-gains?financialYear=${financialYearId}`
      )
      .then((res) => {
        setItems(res.items);
        setTotals(res.totals);
        setDisclaimer(res.disclaimer);
      })
      .finally(() => setLoading(false));
  }, [financialYearId]);

  useEffect(load, [load]);

  async function handleDeleteManual(id: string) {
    if (!confirm("Remove this disposal record? This can't be undone.")) return;
    await api.delete(`/capital-gains/manual/${id}`);
    load();
  }

  if (loading) return <p className="text-[var(--color-ink-soft)]">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs bg-[var(--color-ochre-tint)] text-[#7a4d1a] rounded-lg px-3 py-2 flex-1 mr-4">{disclaimer}</p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          + Add manual disposal
        </Button>
      </div>

      {totals && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <p className="text-sm text-[var(--color-ink-soft)]">Gains</p>
            <p className="font-display text-xl font-semibold text-[var(--color-eucalyptus)]">{formatCurrency(totals.gains)}</p>
          </Card>
          <Card>
            <p className="text-sm text-[var(--color-ink-soft)]">Losses</p>
            <p className="font-display text-xl font-semibold text-[var(--color-brick)]">{formatCurrency(totals.losses)}</p>
          </Card>
          <Card>
            <p className="text-sm text-[var(--color-ink-soft)]">Net</p>
            <p className="font-display text-xl font-semibold">{formatCurrencySigned(totals.net)}</p>
          </Card>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="No disposals this financial year"
          description="Sales recorded against your investments will show up here automatically, or add one manually for a sale that isn't tracked as a buy/sell transaction."
          action={<Button onClick={() => setShowForm(true)}>Add manual disposal</Button>}
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-[var(--color-line)]">
            {items.map((d) => (
              <li key={`${d.source}-${d.id}`} className="flex items-center justify-between px-5 py-3 gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--color-ink)] truncate">
                    {d.investmentName} {d.ticker ? `(${d.ticker})` : ""}
                  </p>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    Sold {formatDate(d.saleDate)} · {d.quantity} units · {d.source === "manual" ? "Manually recorded" : "From buy/sell history"}
                    {d.holdingPeriodDays !== null ? ` · Held ${d.holdingPeriodDays} days` : ""}
                    {d.hasDocuments ? " · Document attached" : ""}
                  </p>
                  {d.notes && <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">{d.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-medium ${d.grossGainLoss >= 0 ? "text-[var(--color-eucalyptus)]" : "text-[var(--color-brick)]"}`}>
                    {formatCurrencySigned(d.grossGainLoss)}
                  </p>
                  {d.source === "manual" && (
                    <button onClick={() => handleDeleteManual(d.id)} className="text-xs text-[var(--color-brick)] hover:underline">
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {showForm && (
        <Modal title="Add a manual capital gains disposal" onClose={() => setShowForm(false)}>
          <ManualCapitalGainForm
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

function ReportFooter({ text }: { text: string }) {
  return <p className="text-xs text-[var(--color-ink-soft)] mt-4 pt-4 border-t border-[var(--color-line)]">{text}</p>;
}

function FinancialYearReport({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    householdName?: string;
    financialYear: string;
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    propertyIncome: number;
    investmentIncome: number;
    dividends: number;
    capitalGains: { gains: number; losses: number; net: number };
    footer: string;
  };
  return (
    <Card>
      <h3 className="font-display text-lg font-semibold">{d.householdName ?? "Your household"}</h3>
      <p className="text-sm text-[var(--color-ink-soft)] mb-4">{d.financialYear}</p>
      <div className="grid grid-cols-2 gap-3">
        <Line label="Total income" value={formatCurrency(d.totalIncome)} />
        <Line label="Total expenses" value={formatCurrency(d.totalExpenses)} />
        <Line label="Net income" value={formatCurrency(d.netIncome)} bold />
        <Line label="Property income" value={formatCurrency(d.propertyIncome)} />
        <Line label="Investment income" value={formatCurrency(d.investmentIncome)} />
        <Line label="Dividends" value={formatCurrency(d.dividends)} />
        <Line label="Capital gains (net)" value={formatCurrencySigned(d.capitalGains.net)} />
      </div>
      <ReportFooter text={d.footer} />
    </Card>
  );
}

function TaxSummaryReport({ data, onExport }: { data: Record<string, unknown>; onExport: () => void }) {
  const d = data as {
    financialYear: string;
    disclaimer: string;
    totals: Record<string, number>;
    potentiallyRelevantExpenses: Array<{ date: string; description: string; amount: number; category: string | null; potentialTaxCategory: string | null; hasReceipt: boolean }>;
  };
  return (
    <Card>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Tax information summary</h3>
          <p className="text-sm text-[var(--color-ink-soft)]">{d.financialYear}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={onExport}>
          Export CSV
        </Button>
      </div>
      <p className="text-xs bg-[var(--color-ochre-tint)] text-[#7a4d1a] rounded-lg px-3 py-2 mb-4">{d.disclaimer}</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Line label="Total recorded income" value={formatCurrency(d.totals.totalRecordedIncome ?? 0)} />
        <Line label="Total recorded expenses" value={formatCurrency(d.totals.totalRecordedExpenses ?? 0)} />
        <Line label="Net rental income" value={formatCurrency(d.totals.netRentalIncome ?? 0)} />
        <Line label="Investment income" value={formatCurrency(d.totals.investmentIncome ?? 0)} />
        <Line label="Dividend income" value={formatCurrency(d.totals.dividendIncome ?? 0)} />
        <Line label="Franking credits" value={formatCurrency(d.totals.frankingCredits ?? 0)} />
        <Line label="Capital gains recorded" value={formatCurrencySigned(d.totals.capitalGainsRecorded ?? 0)} />
      </div>
      <h4 className="font-medium mb-2">Potentially relevant expenses — review with your accountant</h4>
      {d.potentiallyRelevantExpenses.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">None recorded yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {d.potentiallyRelevantExpenses.slice(0, 10).map((e, i) => (
            <li key={i} className="flex justify-between">
              <span className="text-[var(--color-ink-soft)]">
                {e.description} {e.hasReceipt ? "· Receipt attached" : "· No receipt"}
              </span>
              <span className="font-medium">{formatCurrency(e.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PropertyReport({ data }: { data: Record<string, unknown> }) {
  const d = data as { properties: Array<{ property: string; rentalIncome: number; expenses: number; netRentalIncome: number }>; footer: string };
  return (
    <Card>
      <h3 className="font-display text-lg font-semibold mb-4">Property report</h3>
      {d.properties.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">No properties recorded yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-line)]">
          {d.properties.map((p) => (
            <li key={p.property} className="py-3 flex justify-between text-sm">
              <span className="font-medium">{p.property}</span>
              <span className="text-[var(--color-ink-soft)]">
                Income {formatCurrency(p.rentalIncome)} · Expenses {formatCurrency(p.expenses)} · Net {formatCurrency(p.netRentalIncome)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <ReportFooter text={d.footer} />
    </Card>
  );
}

function InvestmentReport({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    holdings: Array<{ investment: string; ticker: string | null; quantityHeld: number; currentValue: number; unrealisedGainLoss: number; dividendIncomeFy: number }>;
    footer: string;
  };
  return (
    <Card>
      <h3 className="font-display text-lg font-semibold mb-4">Investment report</h3>
      {d.holdings.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">No investments recorded yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-line)]">
          {d.holdings.map((h) => (
            <li key={h.investment} className="py-3 flex justify-between text-sm">
              <span className="font-medium">
                {h.investment} {h.ticker ? `(${h.ticker})` : ""}
              </span>
              <span className="text-[var(--color-ink-soft)]">
                Value {formatCurrency(h.currentValue)} · Unrealised {formatCurrencySigned(h.unrealisedGainLoss)} · Dividends {formatCurrency(h.dividendIncomeFy)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <ReportFooter text={d.footer} />
    </Card>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[var(--color-ink-soft)]">{label}</span>
      <span className={bold ? "font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}
