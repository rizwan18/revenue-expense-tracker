import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Investment } from "../api/types";
import { Button, Card, EmptyState, SectionHeading, HelpText } from "../components/ui";
import { Modal } from "../components/Modal";
import { InvestmentForm } from "../components/InvestmentForm";
import { formatCurrency, formatCurrencySigned } from "../lib/format";

const TYPE_LABELS: Record<string, string> = {
  SHARE: "Share",
  ETF: "ETF",
  LIC: "LIC",
  MANAGED_FUND: "Managed fund",
  BOND: "Bond",
  TERM_DEPOSIT: "Term deposit",
  CRYPTO: "Cryptocurrency",
  P2P: "Peer-to-peer",
  PRIVATE: "Private investment",
  COLLECTIBLE: "Collectible",
  OTHER: "Other",
};

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Investment[]>("/investments")
      .then(setInvestments)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const totalValue = investments.reduce((s, i) => s + i.summary.currentValue, 0);
  const totalUnrealised = investments.reduce((s, i) => s + i.summary.unrealisedGainLoss, 0);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Shares, ETFs & other investments"
        subtitle="Track holdings, dividends, and gains — all figures are estimates based on what you enter."
        action={<Button onClick={() => setShowForm(true)}>+ Add investment</Button>}
      />

      {!loading && investments.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-sm text-[var(--color-ink-soft)]">Total portfolio value</p>
            <p className="font-display text-2xl font-semibold mt-1">{formatCurrency(totalValue)}</p>
          </Card>
          <Card>
            <p className="text-sm text-[var(--color-ink-soft)]">
              <HelpText term="Unrealised Gain/Loss">
                <span>Unrealised gain/loss</span>
              </HelpText>
            </p>
            <p className={`font-display text-2xl font-semibold mt-1 ${totalUnrealised >= 0 ? "text-[var(--color-eucalyptus)]" : "text-[var(--color-brick)]"}`}>
              {formatCurrencySigned(totalUnrealised)}
            </p>
          </Card>
        </div>
      )}

      {loading ? (
        <p className="text-[var(--color-ink-soft)]">Loading…</p>
      ) : investments.length === 0 ? (
        <EmptyState
          title="No investments yet"
          description="Track shares, ETFs and other investments in one place."
          action={<Button onClick={() => setShowForm(true)}>Add investment</Button>}
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-[var(--color-line)]">
            {investments.map((inv) => (
              <li key={inv.id}>
                <Link to={`/investments/${inv.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-[var(--color-paper-dim)]">
                  <div>
                    <p className="font-medium text-[var(--color-ink)]">
                      {inv.name} {inv.ticker && <span className="text-[var(--color-ink-soft)] font-normal">({inv.ticker})</span>}
                    </p>
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      {TYPE_LABELS[inv.type] ?? inv.type} · {inv.summary.quantity} held
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(inv.summary.currentValue)}</p>
                    <p className={`text-xs ${inv.summary.unrealisedGainLoss >= 0 ? "text-[var(--color-eucalyptus)]" : "text-[var(--color-brick)]"}`}>
                      {formatCurrencySigned(inv.summary.unrealisedGainLoss)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {showForm && (
        <Modal title="Add an investment" onClose={() => setShowForm(false)}>
          <InvestmentForm
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
