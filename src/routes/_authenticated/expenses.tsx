import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Minus, TrendingDown } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EmptyState,
  Field,
  FormDialog,
  LoadingBlock,
  PageHeader,
  RangeFilter,
  useRangeState,
} from "@/components/kit";
import { EntryDialog } from "@/components/quick-actions";
import { useCategories, useCurrency, useSaveRow, useTransactions } from "@/hooks/use-data";
import { inRange, useCategoryBreakdown, useSeries } from "@/hooks/use-summary";
import { format, formatMoney, parseDate } from "@/lib/finance";

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

type TopSpendView = "categories" | "days";

function ExpensesPage() {
  const currency = useCurrency();
  const { state, setState, range } = useRangeState("month");
  const [topView, setTopView] = useState<TopSpendView>("categories");
  const tx = useTransactions();
  const categories = useCategories();
  const saveCategory = useSaveRow("categories", "Category added");
  const [newCategory, setNewCategory] = useState("");
  const [catOpen, setCatOpen] = useState(false);

  const scoped = useMemo(
    () => (tx.data ?? []).filter((t) => t.type === "expense" && inRange(t.date, range)),
    [tx.data, range],
  );
  const series = useSeries(scoped, "daily");
  const byCategory = useCategoryBreakdown(scoped, "expense");

  const total = scoped.reduce((t, r) => t + Number(r.amount), 0);

  const topDays = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const t of scoped) {
      byDate.set(t.date, (byDate.get(t.date) ?? 0) + Number(t.amount));
    }
    return [...byDate.entries()]
      .map(([date, value]) => ({
        name: format(parseDate(date), "dd MMM yyyy"),
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [scoped]);

  const topCategories = byCategory.slice(0, 3);
  const topSpends = topView === "categories" ? topCategories : topDays;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Expenses"
        description={`${range.label} · ${formatMoney(total, currency)} spent`}
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
            <EntryDialog kind="expense" trigger={<Button size="sm"><Minus className="h-4 w-4" /> Add</Button>} />
          </>
        }
      />

      <RangeFilter state={state} onChange={setState} />

      <section className="card-surface p-4 sm:p-5">
        <h2 className="mb-4 text-base font-semibold">My spend</h2>
        {series.length === 0 ? (
          <EmptyState title="No expenses in this period" icon={TrendingDown} />
        ) : (
          <div className="h-52 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" width={40} />
                <Tooltip
                  formatter={(v: number) => formatMoney(v, currency)}
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="expense" name="Spent" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="card-surface p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Top 3 spends</h2>
          <Select value={topView} onValueChange={(v) => setTopView(v as TopSpendView)}>
            <SelectTrigger className="h-9 w-[10.5rem] text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="categories">By category</SelectItem>
              <SelectItem value="days">By date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {topSpends.length === 0 ? (
          <p className="text-sm text-muted-foreground">No spending data for this period.</p>
        ) : (
          <ol className="space-y-2">
            {topSpends.map((item, i) => (
              <li key={`${topView}-${item.name}`} className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formatMoney(item.value, currency)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {categories.isLoading ? null : null}
    </div>
  );
}
