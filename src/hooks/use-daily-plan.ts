import { useMemo } from "react";
import { useProfile, useTransactions } from "@/hooks/use-data";
import { toISO } from "@/lib/finance";


export interface CategoryPlan {
  category: string;
  spentTotal: number;
  share: number;
  perDay: number;
  todaySpent: number;
}

export interface DailyPlan {
  loading: boolean;
  /** Days of history actually used. */
  days: number;
  /** Average spend per day over the lookback window. */
  avgPerDay: number;
  /** Recommended daily limit (slightly under the average to trim spending). */
  dailyLimit: number;
  /** The limit suggested from history, ignoring any custom override. */
  suggestedLimit: number;
  /** True when the user set their own limit. */
  isCustom: boolean;
  /** Lookback window in days, from the user's settings. */
  lookbackDays: number;
  todaySpent: number;
  remainingToday: number;
  percentUsed: number;
  categories: CategoryPlan[];
  topCategory: CategoryPlan | null;
  hasData: boolean;
}


const DAY_MS = 86_400_000;

/**
 * Looks at the last N days of expenses (from the user's settings) and derives a
 * recommended daily spending limit, split across the categories actually used.
 * A custom limit saved on the profile overrides the suggestion.
 */
export function useDailyPlan(trim = 0.1): DailyPlan {
  const tx = useTransactions();
  const profile = useProfile();
  const lookbackDays = profile.data?.daily_plan_lookback ?? 90;
  const customLimit = profile.data?.daily_limit ?? null;

  return useMemo(() => {

    const now = new Date();
    const todayKey = toISO(now);
    const fromKey = toISO(new Date(now.getTime() - lookbackDays * DAY_MS));

    const rows = (tx.data ?? []).filter(
      (t) => t.type === "expense" && t.date >= fromKey && t.date <= todayKey,
    );

    let earliest = todayKey;
    const byCategory = new Map<string, { total: number; today: number }>();
    let total = 0;
    let todaySpent = 0;

    for (const t of rows) {
      const amount = Number(t.amount || 0);
      const key = t.category || "Other";
      const entry = byCategory.get(key) ?? { total: 0, today: 0 };
      entry.total += amount;
      if (t.date === todayKey) {
        entry.today += amount;
        todaySpent += amount;
      }
      byCategory.set(key, entry);
      total += amount;
      if (t.date < earliest) earliest = t.date;
    }

    const spanDays = Math.max(
      1,
      Math.min(
        lookbackDays,
        Math.round((now.getTime() - new Date(earliest).getTime()) / DAY_MS) + 1,
      ),
    );

    const avgPerDay = total / spanDays;
    const dailyLimit = Math.round(avgPerDay * (1 - trim));

    const categories: CategoryPlan[] = [...byCategory.entries()]
      .map(([category, v]) => {
        const share = total ? v.total / total : 0;
        return {
          category,
          spentTotal: v.total,
          share,
          perDay: Math.round(dailyLimit * share),
          todaySpent: v.today,
        };
      })
      .sort((a, b) => b.spentTotal - a.spentTotal);

    return {
      loading: tx.isLoading,
      days: spanDays,
      avgPerDay,
      dailyLimit,
      todaySpent,
      remainingToday: dailyLimit - todaySpent,
      percentUsed: dailyLimit ? Math.round((todaySpent / dailyLimit) * 100) : 0,
      categories,
      topCategory: categories[0] ?? null,
      hasData: rows.length > 0,
    };
  }, [tx.data, tx.isLoading, lookbackDays, trim]);
}
