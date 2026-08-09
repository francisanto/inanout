import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ListOrdered, Pencil, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ConfirmDelete,
  EmptyState,
  LoadingBlock,
  PageHeader,
  RangeFilter,
  Segmented,
  StatCard,
  useRangeState,
} from "@/components/kit";
import { EntryDialog } from "@/components/quick-actions";
import { useCurrency, useDeleteRow, useTransactions } from "@/hooks/use-data";
import { inRange } from "@/hooks/use-summary";
import { TX_TYPE_LABELS, format, formatMoney, parseDate } from "@/lib/finance";
import type { Transaction } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — In&out" },
      { name: "description", content: "Search and filter every money movement recorded in In&out." },
      { property: "og:title", content: "Transactions — In&out" },
      { property: "og:description", content: "Full transaction history with search and filters." },
    ],
  }),
  component: TransactionsPage,
});

type Filter = "all" | "expense" | "income" | "borrowed" | "lending" | "repayment" | "debt_payment";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Out" },
  { value: "income", label: "In" },
  { value: "borrowed", label: "Borrowed" },
  { value: "lending", label: "Lent" },
  { value: "repayment", label: "Repaid" },
  { value: "debt_payment", label: "Debt" },
];

function TransactionsPage() {
  const currency = useCurrency();
  const tx = useTransactions();
  const del = useDeleteRow("transactions", "Transaction deleted");
  const { state, setState, range } = useRangeState("month");
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (tx.data ?? []).filter((t) => {
      if (!inRange(t.date, range)) return false;
      if (filter !== "all" && t.type !== filter) return false;
      if (!term) return true;
      return [t.description, t.category, t.notes, t.source, t.payment_method]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [tx.data, range, filter, q]);

  const inflow = rows
    .filter((t) => t.type === "income" || t.type === "borrowed")
    .reduce((t, r) => t + Number(r.amount), 0);
  const outflow = rows
    .filter((t) => t.type === "expense" || t.type === "lending" || t.type === "debt_payment")
    .reduce((t, r) => t + Number(r.amount), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Transactions" description="Everything in and out." />

      <div className="space-y-3">
        <RangeFilter state={state} onChange={setState} />
        <Segmented value={filter} onChange={setFilter} options={FILTERS} />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search description, category, notes"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <section className="grid grid-cols-3 gap-3">
        <StatCard label="In" value={inflow} currency={currency} tone="positive" />
        <StatCard label="Out" value={outflow} currency={currency} tone="negative" />
        <StatCard label="Entries" value={rows.length} raw={String(rows.length)} />
      </section>

      {tx.isLoading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState title="No matching transactions" description="Try a wider date range or clear the search." icon={ListOrdered} />
      ) : (
        <ul className="card-surface divide-y divide-border">
          {rows.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {t.description || t.category || TX_TYPE_LABELS[t.type]}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{format(parseDate(t.date), "dd MMM yyyy")}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {TX_TYPE_LABELS[t.type]}
                  </Badge>
                  {t.category ? <span className="truncate">{t.category}</span> : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    t.type === "income" || t.type === "borrowed" ? "text-success" : "text-foreground"
                  }`}
                >
                  {formatMoney(Number(t.amount), currency)}
                </span>
                {t.type === "expense" || t.type === "income" ? (
                  <Button size="icon" variant="ghost" onClick={() => setEditing(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
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

      {editing ? (
        <EntryDialog
          key={editing.id}
          kind={editing.type === "income" ? "income" : "expense"}
          existing={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}
