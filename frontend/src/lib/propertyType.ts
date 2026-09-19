export type PropertyType = "INVESTMENT" | "PPR";

interface PropertyTypeInfo {
  label: string;
  short: string;
  description: string;
  /** Pill: tinted background, dark text (colour is never the only cue — the label is always shown too). */
  badge: string;
  /** Coloured stripe down the left edge of a card/row. */
  accent: string;
  /** Selected state for the radio cards in the property form. */
  selected: string;
  dot: string;
}

// Investment property = green, principal place of residence = blue.
// Class names are written out in full so Tailwind can see them.
export const PROPERTY_TYPE_INFO: Record<PropertyType, PropertyTypeInfo> = {
  INVESTMENT: {
    label: "Investment property",
    short: "Investment",
    description: "Rented out (or available to rent) to earn income.",
    badge: "bg-[var(--color-eucalyptus-tint)] text-[var(--color-eucalyptus-dark)]",
    accent: "border-l-4 border-l-[var(--color-eucalyptus)]",
    selected: "border-[var(--color-eucalyptus)] bg-[var(--color-eucalyptus-tint)]",
    dot: "bg-[var(--color-eucalyptus)]",
  },
  PPR: {
    label: "Principal place of residence (PPR)",
    short: "PPR",
    description: "The home you live in.",
    badge: "bg-[var(--color-sky-tint)] text-[#264a5c]",
    accent: "border-l-4 border-l-[var(--color-sky)]",
    selected: "border-[var(--color-sky)] bg-[var(--color-sky-tint)]",
    dot: "bg-[var(--color-sky)]",
  },
};

/** Properties saved before types existed are investment properties. */
export function propertyTypeOf(p?: { propertyType?: string | null } | null): PropertyType {
  return p?.propertyType === "PPR" ? "PPR" : "INVESTMENT";
}
