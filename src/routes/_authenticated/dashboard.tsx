import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarClock,
  Scale,
  TrendingDown,
  TrendingUp,
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
  LoadingBlock,
  PageHeader,
  RangeFilter,
  StatCard,
  useRangeState,
} from "@/components/kit";
import { QuickActions } from "@/components/quick-actions";
import { DailyPlanCard } from "@/components/daily-plan";
import { TxRow } from "@/components/tx-list";
import { useCurrency } from "@/hooks/use-data";
import { useFinanceSummary, useSeries, useUpcomingObligations } from "@/hooks/use-summary";
import { dueLabel, formatMoney } from "@/lib/finance";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — In&out" },
      { name: "description", content: "Your live financial overview: balance, income, expenses and what's due." },
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
  const granularity = state.key === "year" ? "monthly" : "daily";
  const series = useSeries(s.scoped, granularity);
  const obligations = useUpcomingObligations();

  const recent = s.all.slice(0, 6);

  return (
    <div className="space-y-5">
      <PageHeader
        title="In&out"
        description={range.label}
        actions={<RangeFilter state={state} onChange={setState} includeAll={false} />}
      />

      <QuickActions />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Balance" value={s.currentBalance} currency={currency} icon={Wallet} loading={s.loading} />
        <StatCard label="In" value={s.income} currency={currency} icon={TrendingUp} tone="positive" loading={s.loading} />
        <StatCard label="Out" value={s.expenses} currency={currency} icon={TrendingDown} tone="negative" loading={s.loading} />
        <StatCard
          label="Net worth"
          value={s.netWorth}
          currency={currency}
          icon={Scale}
          tone="info"
          hint={`You owe ${formatMoney(s.owe + s.debtRemaining, currency)} · owed ${formatMoney(s.owed, currency)}`}
          loading={s.loading}
        />
      </section>

      <section className="card-surface p-4">
        <h2 className="mb-4 text-base font-semibold">In vs out</h2>
        {s.loading ? (
          <LoadingBlock rows={2} />
        ) : series.length === 0 ? (
          <EmptyState title="No activity yet" description="Add an expense or income to see your trend." icon={TrendingDown} />
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -22, right: 8, top: 8 }}>
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
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" width={44} />
                <Tooltip
                  formatter={(v: number) => formatMoney(v, currency)}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="income" name="In" stroke="var(--color-chart-2)" fill="url(#gIn)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="Out" stroke="var(--color-chart-5)" fill="url(#gOut)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Due soon</h2>
          </div>
          {obligations.loading ? (
            <LoadingBlock rows={2} />
          ) : obligations.items.length === 0 ? (
            <EmptyState title="Nothing due soon" icon={CalendarClock} />
          ) : (
            <ul className="divide-y divide-border">
              {obligations.items.slice(0, 5).map((o) => (
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

        <div className="card-surface p-4">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Recent</h2>
            <Button asChild size="sm" variant="ghost">
              <Link to="/transactions">View all</Link>
            </Button>
          </div>
          {s.loading ? (
            <LoadingBlock rows={3} />
          ) : recent.length === 0 ? (
            <EmptyState title="No transactions yet" description="Use the buttons above to add your first record." icon={Wallet} />
          ) : (
            <ul className="-mx-3 divide-y divide-border sm:-mx-4">
              {recent.map((t) => (
                <TxRow key={t.id} tx={t} currency={currency} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

