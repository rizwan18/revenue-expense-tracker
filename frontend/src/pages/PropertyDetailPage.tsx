import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFinancialYear } from "../context/FinancialYearContext";
import { api } from "../api/client";
import type { PropertySummary } from "../api/types";
import { Button, Card, SectionHeading, StatTile, HelpText } from "../components/ui";
import { Modal } from "../components/Modal";
import { PropertyForm } from "../components/PropertyForm";
import { formatCurrency, formatDate } from "../lib/format";

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { financialYearId } = useFinancialYear();
  const [summary, setSummary] = useState<PropertySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<PropertySummary>(`/properties/${id}/summary?financialYear=${financialYearId}`)
      .then(setSummary)
      .finally(() => setLoading(false));
  }, [id, financialYearId]);

  useEffect(load, [load]);

  async function handleDelete() {
    if (!id || !confirm("Remove this property? Its transactions will remain but lose their property link.")) return;
    await api.delete(`/properties/${id}`);
    navigate("/properties");
  }

  if (loading || !summary) return <p className="text-[var(--color-ink-soft)]">Loading…</p>;

  const { property } = summary;

  return (
    <div className="space-y-6">
      <SectionHeading
        title={property.name}
        subtitle={property.address ?? undefined}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowEdit(true)}>
              Edit
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Remove
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Rental income" value={formatCurrency(summary.rentalIncome)} tone="positive" />
        <StatTile label="Expenses" value={formatCurrency(summary.expenses)} tone="negative" />
        <StatTile
          label="Net rental income"
          value={formatCurrency(summary.netRentalIncome)}
          tone={summary.netRentalIncome >= 0 ? "positive" : "negative"}
          help="Rent received minus property expenses."
        />
        <StatTile label="Annualised rental income" value={formatCurrency(summary.annualisedRentalIncome)} tone="neutral" help="Estimated full-year rent based on the current rate." />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-display font-semibold mb-3">
            <HelpText term="Rental Yield">
              <span>Property details</span>
            </HelpText>
          </h3>
          <dl className="space-y-2 text-sm">
            <Row label="Estimated value" value={property.currentEstimatedValue != null ? formatCurrency(property.currentEstimatedValue) : "Not recorded"} />
            <Row label="Loan balance" value={property.loanBalance != null ? formatCurrency(property.loanBalance) : "Not recorded"} />
            <Row label="Estimated equity" value={summary.estimatedEquity != null ? formatCurrency(summary.estimatedEquity) : "Not enough information"} />
            <Row label="Rental yield" value={summary.rentalYield != null ? `${summary.rentalYield.toFixed(1)}%` : "Not enough information"} />
            <Row label="Purchase date" value={property.purchaseDate ? formatDate(property.purchaseDate) : "Not recorded"} />
            <Row label="Rental agent" value={property.rentalAgent || "Not recorded"} />
            <Row label="Tenant" value={property.tenantName || "Not recorded"} />
          </dl>
          <p className="text-xs text-[var(--color-ink-soft)] mt-3">Estimated value, equity and yield are calculated from figures you enter — treat them as estimates, not valuations.</p>
        </Card>

        <Card>
          <h3 className="font-display font-semibold mb-3">Major expenses this financial year</h3>
          {summary.majorExpenses.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-soft)]">No expenses recorded yet for this financial year.</p>
          ) : (
            <ul className="space-y-2">
              {summary.majorExpenses.map((e) => (
                <li key={e.category} className="flex justify-between text-sm">
                  <span className="text-[var(--color-ink-soft)]">{e.category}</span>
                  <span className="font-medium">{formatCurrency(e.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {showEdit && (
        <Modal title="Edit property" onClose={() => setShowEdit(false)}>
          <PropertyForm
            initial={property}
            onCancel={() => setShowEdit(false)}
            onSaved={() => {
              setShowEdit(false);
              load();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-[var(--color-ink-soft)]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
