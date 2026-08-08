import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  differenceInCalendarDays,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  parseISO,
} from "date-fns";

export type RangeKey = "today" | "week" | "month" | "year" | "custom" | "all";
export type Granularity = "daily" | "weekly" | "monthly" | "yearly";

export const TX_TYPES = [
  "expense",
  "income",
  "borrowed",
  "lending",
  "repayment",
  "debt_payment",
  "transfer",
] as const;
export type TxType = (typeof TX_TYPES)[number];

export const TX_TYPE_LABELS: Record<string, string> = {
  expense: "Expense",
  income: "Income",
  borrowed: "Borrowed",
  lending: "Lent",
  repayment: "Repayment",
  debt_payment: "Debt payment",
  transfer: "Transfer",
};

export const ACCOUNT_TYPES = ["cash", "bank", "upi", "credit_card", "wallet", "other"] as const;
export const PAYMENT_METHODS = ["Cash", "UPI", "Debit card", "Credit card", "Net banking", "Wallet", "Other"];
export const DEBT_TYPES = ["credit_card", "loan", "emi", "bnpl", "other"] as const;
export const FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;

export const CURRENCIES: Record<string, { symbol: string; locale: string }> = {
  INR: { symbol: "₹", locale: "en-IN" },
  USD: { symbol: "$", locale: "en-US" },
  EUR: { symbol: "€", locale: "de-DE" },
  GBP: { symbol: "£", locale: "en-GB" },
  AED: { symbol: "AED ", locale: "en-AE" },
};

export function formatMoney(value: number, currency = "INR", compact = false): string {
  const meta = CURRENCIES[currency] ?? CURRENCIES["INR"]!;
  const amount = Number.isFinite(value) ? value : 0;
  const formatted = new Intl.NumberFormat(meta.locale, {
    maximumFractionDigits: compact ? 1 : amount % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
  }).format(amount);
  return `${meta.symbol}${formatted}`;
}

export const toISO = (d: Date) => format(d, "yyyy-MM-dd");
export const parseDate = (s: string) => parseISO(s);

export interface DateRange {
  from: string;
  to: string;
  label: string;
}

export function resolveRange(key: RangeKey, custom?: { from?: string; to?: string }): DateRange {
  const now = new Date();
  switch (key) {
    case "today":
      return { from: toISO(startOfDay(now)), to: toISO(endOfDay(now)), label: "Today" };
    case "week":
      return {
        from: toISO(startOfWeek(now, { weekStartsOn: 1 })),
        to: toISO(endOfWeek(now, { weekStartsOn: 1 })),
        label: "This week",
      };
    case "year":
      return { from: toISO(startOfYear(now)), to: toISO(endOfYear(now)), label: "This year" };
    case "all":
      return { from: "1970-01-01", to: toISO(addYears(now, 5)), label: "All time" };
    case "custom":
      return {
        from: custom?.from || toISO(startOfMonth(now)),
        to: custom?.to || toISO(endOfMonth(now)),
        label: "Custom range",
      };
    case "month":
    default:
      return { from: toISO(startOfMonth(now)), to: toISO(endOfMonth(now)), label: "This month" };
  }
}

export function bucketKey(dateStr: string, g: Granularity): string {
  const d = parseISO(dateStr);
  switch (g) {
    case "daily":
      return format(d, "yyyy-MM-dd");
    case "weekly":
      return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
    case "monthly":
      return format(d, "yyyy-MM");
    case "yearly":
      return format(d, "yyyy");
  }
}

export function bucketLabel(key: string, g: Granularity): string {
  if (g === "yearly") return key;
  if (g === "monthly") return format(parseISO(`${key}-01`), "MMM yyyy");
  if (g === "weekly") return `W/${format(parseISO(key), "dd MMM")}`;
  return format(parseISO(key), "dd MMM");
}

export function nextDueFrom(date: string, frequency: string): string {
  const d = parseISO(date);
  switch (frequency) {
    case "daily":
      return toISO(addDays(d, 1));
    case "weekly":
      return toISO(addWeeks(d, 1));
    case "yearly":
      return toISO(addYears(d, 1));
    default:
      return toISO(addMonths(d, 1));
  }
}

/** Advances a next-due date forward until it is today or later. */
export function rollForward(nextDue: string, frequency: string): string {
  let cur = nextDue;
  let guard = 0;
  while (differenceInCalendarDays(parseISO(cur), startOfDay(new Date())) < 0 && guard < 500) {
    cur = nextDueFrom(cur, frequency);
    guard += 1;
  }
  return cur;
}

export function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  return differenceInCalendarDays(parseISO(date), startOfDay(new Date()));
}

export function dueLabel(date?: string | null): string {
  const d = daysUntil(date);
  if (d === null) return "No due date";
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  if (d < 0) return `Overdue by ${Math.abs(d)}d`;
  return `In ${d} days`;
}

export type SettlementStatus = "Active" | "Partially Paid" | "Fully Paid" | "Overdue";

export function settlementStatus(
  total: number,
  settled: number,
  dueDate?: string | null,
): SettlementStatus {
  const remaining = Math.max(total - settled, 0);
  if (remaining <= 0.001) return "Fully Paid";
  const d = daysUntil(dueDate);
  if (d !== null && d < 0) return "Overdue";
  if (settled > 0) return "Partially Paid";
  return "Active";
}

export function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.min(Math.round((part / whole) * 100), 999);
}

export const MONTH_KEY = (d = new Date()) => toISO(startOfMonth(d));
export { startOfMonth, endOfMonth, format };
