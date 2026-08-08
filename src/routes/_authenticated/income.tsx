import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  ConfirmDelete,
  EmptyState,
  GRANULARITY_OPTIONS,
  LoadingBlock,
  PageHeader,
  RangeFilter,
  Segmented,
  StatCard,
  useRangeState,
} from "@/components/kit";
import { EntryDialog } from "@/components/quick-actions";
import { useCurrency, useDeleteRow, useTransactions } from "@/hooks/use-data";
import { inRange, useCategoryBreakdown, useSeries } from "@/hooks/use-summary";
import { format, formatMoney, parseDate, type Granularity } from "@/lib/finance";
import type { Transaction } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/income")({
  head: () => ({
    meta: [
      { title: "Income — In&out" },
      { name: "description", content: "Record salary, freelance and business income with trends." },
      { property: "og:title", content: "Income — In&out" },
      { property: "og:description", content: "Income history, sources and trend charts." },
    ],
  }),
  component: IncomePage,
});

function IncomePage() {
  const currency = useCurrency();
  const { state, setState, range } = useRangeState("year");
  const [granularity, setGranularity] = useState<Granularity>("monthly");
  const tx = useTransactions();
  const del = useDeleteRow("transactions", "Income deleted");
  const [editing, setEditing] = useState<Transaction | null>(null);

  const scoped = useMemo(
    () => (tx.data ?? []).filter((t) => t.type === "income" && inRange(t.date, range)),
    [tx.data, range],
  );
  const series = useSeries(scoped, granularity);
  const bySource = useCategoryBreakdown(scoped, "income");
  const total = scoped.reduce((t, r) => t + Number(r.amount), 0);
  const months = new Set(scoped.map((t) => t.date.slice(0, 7))).size || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income"
        description="Salary, freelance, business and other money coming in."
        actions={<EntryDialog kind="income" trigger={<Button size="sm"><Plus className="h-4 w-4" /> Add income</Button>} />}
      />
      <RangeFilter state={state} onChange={setState} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total income" value={total} currency={currency} tone="positive" loading={tx.isLoading} />
        <StatCard label="Avg / month" value={total / months} currency={currency} loading={tx.isLoading} />
        <StatCard label="Entries" value={scoped.length} raw={String(scoped.length)} loading={tx.isLoading} />
        <StatCard label="Sources" value={bySource.length} raw={String(bySource.length)} loading={tx.isLoading} />
      </section>

      <section className="card-surface p-4 sm:p-5">
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-between">
          <h2 className="truncate text-base font-semibold">Income trend</h2>
          <Segmented value={granularity} onChange={setGranularity} options={GRANULARITY_OPTIONS} />
        </div>
        {series.length === 0 ? (
          <EmptyState title="No income in this period" icon={TrendingUp} />
        ) : (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  formatter={(v: number) => formatMoney(v, currency)}
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="income" name="Income" stroke="var(--color-chart-2)" fill="var(--color-chart-2)" fillOpacity={0.18} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="card-surface p-4 sm:p-5">
          <h2 className="mb-3 text-base font-semibold">Source breakdown</h2>
          {bySource.length === 0 ? (
            <p className="text-sm text-muted-foreground">No income sources yet.</p>
          ) : (
            <ul className="space-y-2">
              {bySource.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{s.name}</span>
                  <span className="tabular-nums text-muted-foreground">{formatMoney(s.value, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-surface overflow-hidden">
          <h2 className="border-b border-border p-4 text-base font-semibold">Income history</h2>
          {tx.isLoading ? (
            <div className="p-4"><LoadingBlock /></div>
          ) : scoped.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No income recorded" description="Add your salary or a freelance payment." icon={TrendingUp} />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {scoped.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.source || t.category || "Other"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {format(parseDate(t.date), "dd MMM yyyy")}
                      {t.description ? ` · ${t.description}` : ""}
                      {t.is_recurring ? " · recurring" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-sm font-semibold tabular-nums text-success">
                      {formatMoney(Number(t.amount), currency)}
                    </span>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <ConfirmDelete
                      onConfirm={() => del.mutate(t.id)}
                      trigger={<Button size="icon" variant="ghost"><Trash2 className="h-3.5 w-3.5" /></Button>}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {editing ? (
        <EntryDialog kind="income" existing={editing} open onOpenChange={(o) => { if (!o) setEditing(null); }} />
      ) : null}
    </div>
  );
}
