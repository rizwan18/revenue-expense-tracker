import type { BillFrequency } from "./constants";

/** Advances a due date forward by one billing cycle. CUSTOM bills are not auto-advanced. */
export function nextDueDateAfter(current: Date, frequency: BillFrequency): Date {
  const next = new Date(current);
  switch (frequency) {
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "FORTNIGHTLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "HALF_YEARLY":
      next.setMonth(next.getMonth() + 6);
      break;
    case "ANNUALLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
    case "CUSTOM":
    default:
      break;
  }
  return next;
}
