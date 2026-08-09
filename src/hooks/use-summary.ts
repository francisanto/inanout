import { useMemo } from "react";
import {
  useAccounts,
  useBorrowings,
  useBudgets,
  useDebts,
  useGoals,
  useLendings,
  useTransactions,
} from "@/hooks/use-data";
import {
  MONTH_KEY,
  bucketKey,
  bucketLabel,
  daysUntil,
  type DateRange,
  type Granularity,
} from "@/lib/finance";
import type { Transaction } from "@/lib/types";

export function inRange(date: string, range: DateRange) {
  return date >= range.from && date <= range.to;
}

const sum = (rows: { amount: number }[]) => rows.reduce((t, r) => t + Number(r.amount || 0), 0);

export function useFinanceSummary(range: DateRange) {
  const tx = useTransactions();
  const borrowings = useBorrowings();
  const lendings = useLendings();
  const debts = useDebts();
  const goals = useGoals();
  const accounts = useAccounts();

  const loading =
    tx.isLoading ||
    borrowings.isLoading ||
    lendings.isLoading ||
    debts.isLoading ||
    goals.isLoading ||
    accounts.isLoading;

  const value = useMemo(() => {
    const all = tx.data ?? [];
    const scoped = all.filter((t) => inRange(t.date, range));
    const byType = (list: Transaction[], type: string) => list.filter((t) => t.type === type);

    const income = sum(byType(scoped, "income"));
    const expenses = sum(byType(scoped, "expense"));
    const borrowedIn = sum(byType(scoped, "borrowed"));
    const lentOut = sum(byType(scoped, "lending"));
    const repayments = sum(byType(scoped, "repayment"));
    const debtPayments = sum(byType(scoped, "debt_payment"));

    const opening = (accounts.data ?? []).reduce((t, a) => t + Number(a.opening_balance || 0), 0);
    const lifetime = {
      income: sum(byType(all, "income")),
      expenses: sum(byType(all, "expense")),
      borrowed: sum(byType(all, "borrowed")),
      lent: sum(byType(all, "lending")),
      repayment: sum(byType(all, "repayment")),
      debtPayment: sum(byType(all, "debt_payment")),
    };

    // Repayments cover both directions: money given back and money received back.
    const repaymentsOut = sum(
      all.filter((t) => t.type === "repayment" && (t.borrowing_id || t.category === "Borrowing repaid")),
    );
    const repaymentsIn = lifetime.repayment - repaymentsOut;

    const currentBalance =
      opening +
      lifetime.income +
      lifetime.borrowed +
      repaymentsIn -
      lifetime.expenses -
      lifetime.lent -
      repaymentsOut -
      lifetime.debtPayment;

    const owe = (borrowings.data ?? []).reduce(
      (t, b) => t + Math.max(Number(b.amount) - Number(b.amount_repaid), 0),
      0,
    );
    const owed = (lendings.data ?? []).reduce(
      (t, l) => t + Math.max(Number(l.amount) - Number(l.amount_received), 0),
      0,
    );
    const debtRemaining = (debts.data ?? []).reduce(
      (t, d) => t + Math.max(Number(d.total_amount) - Number(d.paid_amount), 0),
      0,
    );
    const savings = (goals.data ?? []).reduce((t, g) => t + Number(g.saved_amount), 0);
    const netWorth = currentBalance + owed + savings - owe - debtRemaining;

    return {
      income,
      expenses,
      borrowedIn,
      lentOut,
      repayments,
      debtPayments,
      netFlow: income - expenses,
      currentBalance,
      owe,
      owed,
      debtRemaining,
      savings,
      netWorth,
      scoped,
      all,
    };
  }, [tx.data, borrowings.data, lendings.data, debts.data, goals.data, accounts.data, range]);

  return { ...value, loading };
}

export function useSeries(scoped: Transaction[], granularity: Granularity) {
  return useMemo(() => {
    const map = new Map<string, { key: string; expense: number; income: number }>();
    for (const t of scoped) {
      if (t.type !== "expense" && t.type !== "income") continue;
      const key = bucketKey(t.date, granularity);
      const entry = map.get(key) ?? { key, expense: 0, income: 0 };
      if (t.type === "expense") entry.expense += Number(t.amount);
      else entry.income += Number(t.amount);
      map.set(key, entry);
    }
    return [...map.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((e) => ({ ...e, label: bucketLabel(e.key, granularity) }));
  }, [scoped, granularity]);
}

export function useCategoryBreakdown(scoped: Transaction[], type: "expense" | "income") {
  return useMemo(() => {
    const map = new Map<string, number>();
    for (const t of scoped) {
      if (t.type !== type) continue;
      const key = (type === "income" ? t.source || t.category : t.category) || "Other";
      map.set(key, (map.get(key) ?? 0) + Number(t.amount));
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [scoped, type]);
}

export function useBudgetProgress(month = MONTH_KEY()) {
  const budgets = useBudgets();
  const tx = useTransactions();
  const monthEnd = month.slice(0, 8) + "31";
  const rows = useMemo(() => {
    const spendByCat = new Map<string, number>();
    for (const t of tx.data ?? []) {
      if (t.type !== "expense") continue;
      if (t.date < month || t.date > monthEnd) continue;
      const key = (t.category || "Other").toLowerCase();
      spendByCat.set(key, (spendByCat.get(key) ?? 0) + Number(t.amount));
    }
    return (budgets.data ?? [])
      .filter((b) => b.month === month)
      .map((b) => {
        const spent = spendByCat.get(b.category.toLowerCase()) ?? 0;
        const amount = Number(b.amount);
        return {
          ...b,
          amount,
          spent,
          remaining: amount - spent,
          percent: amount ? Math.round((spent / amount) * 100) : 0,
        };
      });
  }, [budgets.data, tx.data, month, monthEnd]);

  return { rows, loading: budgets.isLoading || tx.isLoading };
}

export interface Obligation {
  id: string;
  label: string;
  amount: number;
  date: string;
  days: number;
  kind: "debt" | "borrowing" | "lending";
}

export function useUpcomingObligations(windowDays = 30) {
  const debts = useDebts();
  const borrowings = useBorrowings();
  const lendings = useLendings();

  const items = useMemo(() => {
    const out: Obligation[] = [];
    for (const d of debts.data ?? []) {
      const days = daysUntil(d.due_date);
      const remaining = Number(d.total_amount) - Number(d.paid_amount);
      if (days === null || days > windowDays || remaining <= 0) continue;
      out.push({
        id: d.id,
        label: `${d.name} EMI`,
        amount: Number(d.emi_amount) || remaining,
        date: d.due_date!,
        days,
        kind: "debt",
      });
    }
    for (const b of borrowings.data ?? []) {
      const days = daysUntil(b.due_date);
      const remaining = Number(b.amount) - Number(b.amount_repaid);
      if (days === null || days > windowDays || remaining <= 0) continue;
      out.push({
        id: b.id,
        label: `Repay ${b.person_name}`,
        amount: remaining,
        date: b.due_date!,
        days,
        kind: "borrowing",
      });
    }
    for (const l of lendings.data ?? []) {
      const days = daysUntil(l.expected_return_date);
      const remaining = Number(l.amount) - Number(l.amount_received);
      if (days === null || days > windowDays || remaining <= 0) continue;
      out.push({
        id: l.id,
        label: `Collect from ${l.person_name}`,
        amount: remaining,
        date: l.expected_return_date!,
        days,
        kind: "lending",
      });
    }
    return out.sort((a, b) => a.days - b.days);
  }, [debts.data, borrowings.data, lendings.data, windowDays]);

  return {
    items,
    loading: debts.isLoading || borrowings.isLoading || lendings.isLoading,
  };
}
