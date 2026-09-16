import { useEffect, useState } from "react";
import { useFinancialYear } from "../context/FinancialYearContext";
import { api } from "../api/client";
import { Button, Card, SectionHeading } from "../components/ui";
import { formatCurrency, formatCurrencySigned } from "../lib/format";

type ReportKind = "financial-year" | "tax-summary" | "property" | "investment";

const TABS: Array<{ id: ReportKind; label: string }> = [
  { id: "financial-year", label: "Financial year" },
  { id: "tax-summary", label: "Tax summary" },
  { id: "property", label: "Property" },
  { id: "investment", label: "Investment" },
];

export default function ReportsPage() {
  const { financialYearId } = useFinancialYear();
  const [tab, setTab] = useState<ReportKind>("financial-year");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

      <div className="flex rounded-xl border border-[var(--color-line)] p-1 w-fit">
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

      {loading || !data ? (
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
