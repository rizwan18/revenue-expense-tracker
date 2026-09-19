import { PROPERTY_TYPE_INFO, type PropertyType } from "../lib/propertyType";

export function PropertyTypeBadge({ type, full = false }: { type: PropertyType; full?: boolean }) {
  const info = PROPERTY_TYPE_INFO[type];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${info.badge}`}>
      <span aria-hidden className={`w-2 h-2 rounded-full ${info.dot}`} />
      {full ? info.label : info.short}
    </span>
  );
}

/** Small key explaining the colours. */
export function PropertyTypeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-soft)]">
      <PropertyTypeBadge type="INVESTMENT" full />
      <PropertyTypeBadge type="PPR" full />
    </div>
  );
}
