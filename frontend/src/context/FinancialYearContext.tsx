import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Mirrors the backend's Australian financial-year id format ("YYYY-YY").
 * We compute a sensible default client-side (based on the browser's local
 * date) purely for the initial render; the backend is always the source of
 * truth once data loads, since it applies the household's configured
 * timezone.
 */
function defaultFinancialYearId(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const startYear = month >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endShort}`;
}

interface FinancialYearContextValue {
  financialYearId: string;
  setFinancialYearId: (id: string) => void;
}

const FinancialYearContext = createContext<FinancialYearContextValue | undefined>(undefined);

export function FinancialYearProvider({ children }: { children: ReactNode }) {
  const [financialYearId, setFinancialYearId] = useState(defaultFinancialYearId());
  const value = useMemo(() => ({ financialYearId, setFinancialYearId }), [financialYearId]);
  return <FinancialYearContext.Provider value={value}>{children}</FinancialYearContext.Provider>;
}

export function useFinancialYear() {
  const ctx = useContext(FinancialYearContext);
  if (!ctx) throw new Error("useFinancialYear must be used within FinancialYearProvider");
  return ctx;
}
