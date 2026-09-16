export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);
}

export function formatCurrencySigned(amount: number): string {
  const formatted = formatCurrency(Math.abs(amount));
  return amount < 0 ? `-${formatted}` : `+${formatted}`;
}

export function formatDate(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatDateShort(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(date);
}

export function toInputDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return date.toISOString().slice(0, 10);
}

export function daysUntil(dateInput: string | Date): number {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
