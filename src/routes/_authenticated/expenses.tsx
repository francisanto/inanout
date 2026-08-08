import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Minus, Pencil, Trash2, TrendingDown } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ConfirmDelete,
  EmptyState,
  Field,
  FormDialog,
  GRANULARITY_OPTIONS,
  LoadingBlock,
  PageHeader,
  RangeFilter,
  Segmented,
  StatCard,
  useRangeState,
} from "@/components/kit";
import { EntryDialog } from "@/components/quick-actions";
import { useCategories, useCurrency, useDeleteRow, useSaveRow, useTransactions } from "@/hooks/use-data";
import { inRange, useCategoryBreakdown, useSeries } from "@/hooks/use-summary";
import { format, formatMoney, parseDate, type Granularity } from "@/lib/finance";
import type { Transaction } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — In&out" },
      { name: "description", content: "Log expenses by category and analyse spending trends." },
      { property: "og:title", content: "Expenses — In&out" },
      { property: "og:description", content: "Category spending, trends and daily averages." },
    ],
  }),
  component: ExpensesPage,
});

const CHART_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function ExpensesPage() {
  const currency = useCurrency();
  const { state, setState, range } = useRangeState("month");
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const tx = useTransactions();
  const categories = useCategories();
  const saveCategory = useSaveRow("categories", "Category added");
  const del = useDeleteRow("transactions", "Expense deleted");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [catOpen, setCatOpen] = useState(false);

  const scoped = useMemo(
    () => (tx.data ?? []).filter((t) => t.type === "expense" && inRange(t.date, range)),
    [tx.data, range],
  );
  const series = useSeries(scoped, granularity);
  const byCategory = useCategoryBreakdown(scoped, "expense");

  const total = scoped.reduce((t, r) => t + Number(r.amount), 0);
  const days = new Set(scoped.map((t) => t.date)).size || 1;
  const perDay = total / days;
  const highest = [...series].sort((a, b) => b.expense - a.expense)[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Every rupee going out, grouped and charted."
        actions={
          <>
            <FormDialog
              open={catOpen}
              onOpenChange={setCatOpen}
              trigger={<Button size="sm" variant="outline">New category</Button>}
              title="Add expense category"
              submitLabel="Add category"
              submitting={saveCategory.isPending}
              onSubmit={async () => {
                if (!newCategory.trim()) return;
                await saveCategory.mutateAsync({ name: newCategory.trim(), kind: "expense" });
                setNewCategory("");
                setCatOpen(false);
              }}
            >
              <Field label="Category name">
                <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} required />
              </Field>
            </FormDialog>
            <EntryDialog kind="expense" trigger={<Button size="sm"><Minus className="h-4 w-4" /> Add expense</Button>} />
          </>
        }
      />

      <RangeFilter state={state} onChange={setState} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total spending" value={total} currency={currency} tone="negative" loading={tx.isLoading} />
        <StatCard label="Avg / active day" value={perDay} currency={currency} loading={tx.isLoading} />
        <StatCard
          label="Highest day"
          value={highest?.expense ?? 0}
          currency={currency}
          hint={highest?.label}
          loading={tx.isLoading}
        />
        <StatCard label="Categories used" value={byCategory.length} raw={String(byCategory.length)} loading={tx.isLoading} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-4 sm:p-5">
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-between">
            <h2 className="truncate text-base font-semibold">Spending trend</h2>
            <Segmented value={granularity} onChange={setGranularity} options={GRANULARITY_OPTIONS} />
          </div>
          {series.length === 0 ? (
            <EmptyState title="No expenses in this period" icon={TrendingDown} />
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ left: -18, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    formatter={(v: number) => formatMoney(v, currency)}
                    contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="expense" name="Expense" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card-surface p-4 sm:p-5">
          <h2 className="mb-4 text-base font-semibold">By category</h2>
          {byCategory.length === 0 ? (
            <EmptyState title="Nothing to break down yet" icon={TrendingDown} />
          ) : (
            <div className="grid items-center gap-4 sm:grid-cols-2">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                      {byCategory.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatMoney(v, currency)}
                      contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {byCategory.slice(0, 6).map((c, i) => (
                  <li key={c.name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">{formatMoney(c.value, currency)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="card-surface overflow-hidden">
        <h2 className="border-b border-border p-4 text-base font-semibold">Expense history</h2>
        {tx.isLoading ? (
          <div className="p-4"><LoadingBlock /></div>
        ) : scoped.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No expenses recorded"
              description="Add your first expense to start seeing analytics."
              icon={TrendingDown}
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {scoped.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.category || "Other"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {format(parseDate(t.date), "dd MMM yyyy")}
                    {t.description ? ` · ${t.description}` : ""}
                    {t.payment_method ? ` · ${t.payment_method}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-sm font-semibold tabular-nums">{formatMoney(Number(t.amount), currency)}</span>
                  <Button size="icon" variant="ghost" onClick={() => setEditing(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <ConfirmDelete
                    onConfirm={() => del.mutate(t.id)}
                    trigger={
                      <Button size="icon" variant="ghost">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing ? (
        <EntryDialog
          kind="expense"
          existing={editing}
          open
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
        />
      ) : null}
      {categories.isLoading ? null : null}
    </div>
  );
}
