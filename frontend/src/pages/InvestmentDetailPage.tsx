import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Investment } from "../api/types";
import { Button, Card, SectionHeading, StatTile, HelpText } from "../components/ui";
import { Modal } from "../components/Modal";
import { InvestmentTransactionForm } from "../components/InvestmentTransactionForm";
import { DividendForm } from "../components/DividendForm";
import { formatCurrency, formatCurrencySigned, formatDate } from "../lib/format";

export default function InvestmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [investment, setInvestment] = useState<Investment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTxForm, setShowTxForm] = useState(false);
  const [showDividendForm, setShowDividendForm] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<Investment>(`/investments/${id}`)
      .then(setInvestment)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  async function handleDelete() {
    if (!id || !confirm("Remove this investment and all its recorded transactions and dividends?")) return;
    await api.delete(`/investments/${id}`);
    navigate("/investments");
  }

  async function handleDeleteTx(txId: string) {
    if (!confirm("Remove this transaction?")) return;
    await api.delete(`/investments/transactions/${txId}`);
    load();
  }

  async function handleMarkReceived(dividendId: string) {
    await api.post(`/dividends/${dividendId}/mark-received`);
    load();
  }

  if (loading || !investment) return <p className="text-[var(--color-ink-soft)]">Loading…</p>;

  return (
    <div className="space-y-6">
      <SectionHeading
        title={`${investment.name}${investment.ticker ? ` (${investment.ticker})` : ""}`}
        subtitle={investment.notes ?? undefined}
        action={
          <Button variant="danger" onClick={handleDelete}>
            Remove
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Quantity held" value={String(investment.summary.quantity)} />
        <StatTile label="Cost base" value={formatCurrency(investment.summary.costBase)} help="What you paid in total, including brokerage." />
        <StatTile label="Current value" value={formatCurrency(investment.summary.currentValue)} tone="accent" />
        <StatTile
          label="Unrealised gain/loss"
          value={formatCurrencySigned(investment.summary.unrealisedGainLoss)}
          tone={investment.summary.unrealisedGainLoss >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <SectionHeading title="Buy / sell history" action={<Button size="sm" onClick={() => setShowTxForm(true)}>+ Add</Button>} />
          <Card className="p-0 overflow-hidden">
            {investment.investmentTransactions.length === 0 ? (
              <p className="p-5 text-sm text-[var(--color-ink-soft)]">No transactions recorded yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {[...investment.investmentTransactions]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((tx) => (
                    <li key={tx.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="font-medium">
                          {tx.type === "BUY" ? "Buy" : "Sell"} · {tx.quantity} @ {formatCurrency(tx.pricePerUnit)}
                        </p>
                        <p className="text-xs text-[var(--color-ink-soft)]">
                          {formatDate(tx.date)}
                          {tx.brokerage > 0 ? ` · Brokerage ${formatCurrency(tx.brokerage)}` : ""}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteTx(tx.id)} className="text-xs text-[var(--color-brick)] hover:underline">
                        Delete
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </Card>
        </section>

        <section>
          <SectionHeading
            title="Dividends"
            action={<Button size="sm" onClick={() => setShowDividendForm(true)}>+ Add</Button>}
          />
          <Card className="p-0 overflow-hidden">
            {investment.dividends.length === 0 ? (
              <p className="p-5 text-sm text-[var(--color-ink-soft)]">No dividends recorded yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {[...investment.dividends]
                  .sort((a, b) => new Date(b.paymentDate ?? 0).getTime() - new Date(a.paymentDate ?? 0).getTime())
                  .map((d) => (
                    <li key={d.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="font-medium">{formatCurrency(d.netAmount)} net</p>
                        <p className="text-xs text-[var(--color-ink-soft)]">
                          {d.paymentDate ? formatDate(d.paymentDate) : "Date not set"} · {d.status === "RECEIVED" ? "Received" : "Expected"}
                          {d.frankingCredit > 0 ? ` · ${formatCurrency(d.frankingCredit)} ` : " "}
                          {d.frankingCredit > 0 && (
                            <HelpText term="Franking Credit">
                              <span>franking</span>
                            </HelpText>
                          )}
                        </p>
                      </div>
                      {d.status === "EXPECTED" && (
                        <button onClick={() => handleMarkReceived(d.id)} className="text-xs text-[var(--color-eucalyptus)] hover:underline">
                          Mark received
                        </button>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </Card>
        </section>
      </div>

      {showTxForm && (
        <Modal title="Add a buy/sell transaction" onClose={() => setShowTxForm(false)}>
          <InvestmentTransactionForm
            investmentId={investment.id}
            onCancel={() => setShowTxForm(false)}
            onSaved={() => {
              setShowTxForm(false);
              load();
            }}
          />
        </Modal>
      )}

      {showDividendForm && (
        <Modal title="Add a dividend" onClose={() => setShowDividendForm(false)}>
          <DividendForm
            investmentId={investment.id}
            onCancel={() => setShowDividendForm(false)}
            onSaved={() => {
              setShowDividendForm(false);
              load();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
