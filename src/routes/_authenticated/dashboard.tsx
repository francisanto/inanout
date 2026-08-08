import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  HandCoins,
  PiggyBank,
  Scale,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  GRANULARITY_OPTIONS,
  LoadingBlock,
  PageHeader,
  ProgressBar,
  RangeFilter,
  Segmented,
  StatCard,
  useRangeState,
} from "@/components/kit";
import { QuickActions } from "@/components/quick-actions";
import { useCurrency } from "@/hooks/use-data";
import {
  useBudgetProgress,
  useFinanceSummary,
  useSeries,
  useUpcomingObligations,
} from "@/hooks/use-summary";
import { useBorrowings, useLendings } from "@/hooks/use-data";
import { TX_TYPE_LABELS, dueLabel, formatMoney, format, parseDate } from "@/lib/finance";
import { useState } from "react";
import type { Granularity } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — In&out" },
      { name: "description", content: "Your live financial overview: balance, income, expenses and net worth." },
      { property: "og:title", content: "Dashboard — In&out" },
      { property: "og:description", content: "Live personal finance overview." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { state, setState, range } = useRangeState("month");
  const currency = useCurrency();
  const s = useFinanceSummary(range);
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const series = useSeries(s.scoped, granularity);
  const budgets = useBudgetProgress();
  const obligations = useUpcomingObligations();
  const borrowings = useBorrowings();
  const lendings = useLendings();

  const recent = s.all.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`${range.label} · all values in ${formatMoney(0, currency).replace("0", "")}`}
        actions={<RangeFilter state={state} onChange={setState} includeAll={false} />}
      />

      <QuickActions />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Current balance" value={s.currentBalance} currency={currency} icon={Wallet} loading={s.loading} />
        <StatCard label="Total income" value={s.income} currency={currency} icon={TrendingUp} tone="positive" loading={s.loading} />
        <StatCard label="Total expenses" value={s.expenses} currency={currency} icon={TrendingDown} tone="negative" loading={s.loading} />
        <StatCard label="Net worth" value={s.netWorth} currency={currency} icon={Scale} tone="info" loading={s.loading} />
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="You owe" value={s.owe} currency={currency} icon={HandCoins} tone="negative" loading={s.loading} />
        <StatCard label="Owed to you" value={s.owed} currency={currency} icon={Users} tone="positive" loading={s.loading} />
        <StatCard label="Debt remaining" value={s.debtRemaining} currency={currency} icon={CreditCard} tone="warning" loading={s.loading} />
        <StatCard label="Savings" value={s.savings} currency={currency} icon={PiggyBank} tone="positive" loading={s.loading} />
      </section>

      <section className="card-surface p-4 sm:p-5">
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
          <h2 className="truncate text-base font-semibold">Income vs expenses</h2>
          <Segmented value={granularity} onChange={setGranularity} options={GRANULARITY_OPTIONS} />
        </div>
        {s.loading ? (
          <LoadingBlock rows={2} />
        ) : series.length === 0 ? (
          <EmptyState
            title="No activity in this period"
            description="Add an expense or income to see your trend chart."
            icon={TrendingDown}
          />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-5)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-5)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  formatter={(v: number) => formatMoney(v, currency)}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="income" name="Income" stroke="var(--color-chart-2)" fill="url(#gIn)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="var(--color-chart-5)" fill="url(#gOut)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Budget progress</h2>
            <Button asChild size="sm" variant="ghost">
              <Link to="/budgets">Manage</Link>
            </Button>
          </div>
          {budgets.loading ? (
            <LoadingBlock rows={2} />
          ) : budgets.rows.length === 0 ? (
            <EmptyState title="No budgets yet" description="Set monthly limits per category." icon={Wallet} />
          ) : (
            <div className="space-y-4">
              {budgets.rows.slice(0, 5).map((b) => (
                <div key={b.id}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{b.category}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatMoney(b.spent, currency)} / {formatMoney(b.amount, currency)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar
                      percent={b.percent}
                      tone={b.percent >= 100 ? "destructive" : b.percent >= 85 ? "warning" : "primary"}
                    />
                  </div>
                  {b.percent >= 100 ? (
                    <p className="mt-1 text-xs text-destructive">
                      ⚠️ {b.category} budget exceeded by {formatMoney(Math.abs(b.remaining), currency)}.
                    </p>
                  ) : b.percent >= 85 ? (
                    <p className="mt-1 text-xs text-warning">
                      ⚠️ You have used {b.percent}% of your {b.category} budget.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-surface p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Upcoming payments</h2>
            <Button asChild size="sm" variant="ghost">
              <Link to="/daily-plan">Daily plan</Link>
            </Button>
          </div>
          {obligations.loading ? (
            <LoadingBlock rows={2} />
          ) : obligations.items.length === 0 ? (
            <EmptyState title="Nothing due soon" description="Recurring bills and EMIs will appear here." icon={CreditCard} />
          ) : (
            <ul className="divide-y divide-border">
              {obligations.items.slice(0, 6).map((o) => (
                <li key={`${o.kind}-${o.id}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{o.label}</p>
                    <p className="text-xs text-muted-foreground">{dueLabel(o.date)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatMoney(o.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Recent transactions</h2>
            <Button asChild size="sm" variant="ghost">
              <Link to="/transactions">View all</Link>
            </Button>
          </div>
          {s.loading ? (
            <LoadingBlock rows={3} />
          ) : recent.length === 0 ? (
            <EmptyState title="No transactions yet" description="Use the quick actions above to add your first record." icon={Wallet} />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {t.description || t.category || TX_TYPE_LABELS[t.type]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseDate(t.date), "dd MMM yyyy")} · {TX_TYPE_LABELS[t.type]}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      t.type === "income" || t.type === "borrowed" ? "text-success" : "text-foreground"
                    }`}
                  >
                    {t.type === "income" || t.type === "borrowed" ? (
                      <ArrowUpRight className="mr-1 inline h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="mr-1 inline h-3.5 w-3.5" />
                    )}
                    {formatMoney(Number(t.amount), currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-surface p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">People</h2>
            <Button asChild size="sm" variant="ghost">
              <Link to="/people">All people</Link>
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                You owe
              </p>
              {(borrowings.data ?? []).filter((b) => Number(b.amount) - Number(b.amount_repaid) > 0).length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">Nobody, you're clear.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {(borrowings.data ?? [])
                    .filter((b) => Number(b.amount) - Number(b.amount_repaid) > 0)
                    .slice(0, 3)
                    .map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{b.person_name}</span>
                        <span className="font-semibold tabular-nums text-destructive">
                          {formatMoney(Number(b.amount) - Number(b.amount_repaid), currency)}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Owes you
              </p>
              {(lendings.data ?? []).filter((l) => Number(l.amount) - Number(l.amount_received) > 0).length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">No pending collections.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {(lendings.data ?? [])
                    .filter((l) => Number(l.amount) - Number(l.amount_received) > 0)
                    .slice(0, 3)
                    .map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{l.person_name}</span>
                        <span className="font-semibold tabular-nums text-success">
                          {formatMoney(Number(l.amount) - Number(l.amount_received), currency)}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
