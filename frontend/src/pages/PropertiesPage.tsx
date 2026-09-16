import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Property } from "../api/types";
import { Button, Card, EmptyState, SectionHeading } from "../components/ui";
import { Modal } from "../components/Modal";
import { PropertyForm } from "../components/PropertyForm";
import { formatCurrency } from "../lib/format";

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Property[]>("/properties")
      .then(setProperties)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="space-y-6">
      <SectionHeading title="Properties" subtitle="Track rental income and expenses for each property you own." action={<Button onClick={() => setShowForm(true)}>+ Add property</Button>} />

      {loading ? (
        <p className="text-[var(--color-ink-soft)]">Loading…</p>
      ) : properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Add your first investment property to start tracking rental income and expenses."
          action={<Button onClick={() => setShowForm(true)}>Add property</Button>}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {properties.map((p) => (
            <Link key={p.id} to={`/properties/${p.id}`}>
              <Card className="hover:border-[var(--color-eucalyptus)] transition-colors h-full">
                <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                {p.address && <p className="text-sm text-[var(--color-ink-soft)]">{p.address}</p>}
                <div className="mt-3 flex gap-6 text-sm">
                  {p.currentEstimatedValue != null && (
                    <div>
                      <p className="text-[var(--color-ink-soft)]">Estimated value</p>
                      <p className="font-medium">{formatCurrency(p.currentEstimatedValue)}</p>
                    </div>
                  )}
                  {p.rentAmount != null && (
                    <div>
                      <p className="text-[var(--color-ink-soft)]">Rent</p>
                      <p className="font-medium">
                        {formatCurrency(p.rentAmount)} / {p.rentFrequency?.toLowerCase()}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="Add a property" onClose={() => setShowForm(false)}>
          <PropertyForm
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
