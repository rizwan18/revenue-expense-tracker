import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useFinancialYear } from "../context/FinancialYearContext";
import { api } from "../api/client";
import type { DashboardResponse } from "../api/types";
import { Card, SectionHeading, StatTile, Alert, Button, HelpText } from "../components/ui";
import { formatCurrency, formatCurrencySigned, formatDateShort, daysUntil } from "../lib/format";
import { PropertyTypeBadge, PropertyTypeLegend } from "../components/PropertyTypeBadge";
import { PROPERTY_TYPE_INFO, propertyTypeOf } from "../lib/propertyType";

export default function DashboardPage() {
  const { financialYearId } = useFinancialYear();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<DashboardResponse>(`/dashboard?financialYear=${financialYearId}`)
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setError("We couldn't load your dashboard. Please try again."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [financialYearId]);

  if (loading) return <DashboardSkeleton />;
  if (error || !data) return <Alert severity="warning" message={error ?? "No data available."} />;

  const hasAnyData =
    data.snapshot.totalIncome > 0 ||
    data.snapshot.totalExpenses > 0 ||
    data.propertySnapshot.numberOfProperties > 0 ||
    data.investmentSnapshot.totalInvestmentValue > 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-[var(--color-ink-soft)]">Good {timeOfDayGreeting()}</p>
        <h1 className="font-display text-3xl font-semibold text-[var(--color-ink)]">{data.financialYear.label}</h1>
        <p className="text-[var(--color-ink-soft)]">
          {formatDateShort(data.financialYear.startDate)} – {formatDateShort(data.financialYear.endDate)} · {data.financialYear.daysRemaining} days remaining
        </p>
      </div>

      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((a) => (
            <Alert key={a.id} message={a.message} severity={a.severity} />
          ))}
        </div>
      )}

      {!hasAnyData && (
        <Card className="text-center py-10">
          <h2 className="font-display text-xl font-semibold mb-2">Let's get your first year set up</h2>
          <p className="text-[var(--color-ink-soft)] mb-5 max-w-md mx-auto">
            Add a property, an investment, or your everyday income and expenses to see your dashboard come to life.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/properties">
              <Button>Add a property</Button>
            </Link>
            <Link to="/investments">
              <Button variant="secondary">Add an investment</Button>
            </Link>
            <Link to="/money">
              <Button variant="secondary">Record income or an expense</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Financial snapshot */}
      <section>
        <SectionHeading title="Financial snapshot" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile label="Total income" value={formatCurrency(data.snapshot.totalIncome)} tone="positive" />
          <StatTile label="Total expenses" value={formatCurrency(data.snapshot.totalExpenses)} tone="negative" />
          <StatTile label="Net income" value={formatCurrency(data.snapshot.netIncome)} tone={data.snapshot.netIncome >= 0 ? "positive" : "negative"} />
          <StatTile label="Investment income" value={formatCurrency(data.snapshot.investmentIncome)} tone="accent" />
          <StatTile label="Property income" value={formatCurrency(data.snapshot.propertyIncome)} tone="neutral" />
          <StatTile label="Dividends" value={formatCurrency(data.snapshot.dividends)} tone="neutral" />
          <StatTile label="Upcoming bills" value={String(data.snapshot.upcomingBillsCount)} tone="neutral" />
          <StatTile label="Outstanding bills" value={String(data.snapshot.outstandingBillsCount)} tone={data.snapshot.outstandingBillsCount > 0 ? "negative" : "neutral"} />
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Investment snapshot */}
        <section>
          <SectionHeading title="Investment snapshot" />
          <Card className="space-y-3">
            <Row label="Investment property value" value={formatCurrency(data.investmentSnapshot.propertyValue)} />
            <Row label="Share / ETF portfolio value" value={formatCurrency(data.investmentSnapshot.shareValue)} />
            <Row label="Other investment value" value={formatCurrency(data.investmentSnapshot.otherValue)} />
            <div className="border-t border-[var(--color-line)] pt-3">
              <Row label="Total investment value" value={formatCurrency(data.investmentSnapshot.totalInvestmentValue)} bold />
            </div>
            <Row
              label={
                <HelpText term="Unrealised Gain/Loss">
                  <span>Capital gains this year</span>
                </HelpText>
              }
              value={formatCurrencySigned(data.investmentSnapshot.capitalGains.net)}
            />
            <p className="text-xs text-[var(--color-ink-soft)]">Investment value is an estimate based on your latest recorded prices — not a live market quote.</p>
          </Card>
        </section>

        {/* Property snapshot */}
        <section>
          <SectionHeading title="Property snapshot" />
          <Card className="space-y-3">
            {data.properties.length > 0 && (
              <>
                <ul className="space-y-2">
                  {data.properties.map((p) => {
                    const type = propertyTypeOf(p);
                    return (
                      <li key={p.id}>
                        <Link
                          to={`/properties/${p.id}`}
                          className={`flex items-center justify-between gap-3 rounded-xl border border-[var(--color-line)] px-3 py-2 hover:bg-[var(--color-paper-dim)] ${PROPERTY_TYPE_INFO[type].accent}`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--color-ink)] truncate">{p.name}</p>
                            <PropertyTypeBadge type={type} />
                          </div>
                          {p.currentEstimatedValue != null && <span className="text-sm font-medium shrink-0">{formatCurrency(p.currentEstimatedValue)}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <PropertyTypeLegend />
                <div className="border-t border-[var(--color-line)] pt-3 space-y-3">
                  <Row label="Properties" value={`${data.propertySnapshot.investmentCount} investment · ${data.propertySnapshot.pprCount} PPR`} />
                </div>
              </>
            )}
            {data.properties.length === 0 && <Row label="Number of properties" value="0" />}
            <Row label="Total rental income" value={formatCurrency(data.propertySnapshot.totalRentalIncome)} />
            <Row label="Total property expenses" value={formatCurrency(data.propertySnapshot.totalPropertyExpenses)} />
            <div className="border-t border-[var(--color-line)] pt-3">
              <Row
                label={
                  <HelpText term="Net Rental Income">
                    <span>Net rental income</span>
                  </HelpText>
                }
                value={formatCurrency(data.propertySnapshot.netRentalIncome)}
                bold
              />
            </div>
            <p className="text-xs text-[var(--color-ink-soft)]">Rental figures cover investment properties only.</p>
            <Row
              label={
                <HelpText term="Estimated Equity">
                  <span>Estimated equity (investment)</span>
                </HelpText>
              }
              value={formatCurrency(data.propertySnapshot.estimatedEquity)}
            />
            {data.propertySnapshot.pprCount > 0 && <Row label="Home equity (PPR)" value={formatCurrency(data.propertySnapshot.ppr.equity)} />}
          </Card>
        </section>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming payments */}
        <section>
          <SectionHeading title="Upcoming payments" action={<Link to="/bills" className="text-sm text-[var(--color-eucalyptus)] font-medium">View all</Link>} />
          <Card className="p-0 overflow-hidden">
            {data.upcomingPayments.length === 0 ? (
              <p className="p-5 text-sm text-[var(--color-ink-soft)]">Nothing due in the next 30 days.</p>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {data.upcomingPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="font-medium text-[var(--color-ink)]">{p.name}</p>
                      <p className="text-xs text-[var(--color-ink-soft)]">
                        {p.property ? `${p.property} · ` : ""}
                        due {formatDateShort(p.dueDate)}
                        {daysUntil(p.dueDate) <= 3 ? " · soon" : ""}
                      </p>
                    </div>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* Recent activity */}
        <section>
          <SectionHeading title="Recent activity" action={<Link to="/money" className="text-sm text-[var(--color-eucalyptus)] font-medium">View all</Link>} />
          <Card className="p-0 overflow-hidden">
            {data.recentActivity.length === 0 ? (
              <p className="p-5 text-sm text-[var(--color-ink-soft)]">No transactions recorded yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {data.recentActivity.map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="font-medium text-[var(--color-ink)]">{t.description}</p>
                      <p className="text-xs text-[var(--color-ink-soft)]">
                        {t.category ?? "Uncategorised"} · {formatDateShort(t.date)}
                      </p>
                    </div>
                    <span className={`font-medium ${t.amount >= 0 ? "text-[var(--color-eucalyptus)]" : "text-[var(--color-brick)]"}`}>
                      {formatCurrencySigned(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: React.ReactNode; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]"}`}>{label}</span>
      <span className={bold ? "font-display text-lg font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-10 w-64 bg-[var(--color-paper-dim)] rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 bg-[var(--color-paper-dim)] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
