import { createFileRoute } from "@tanstack/react-router";
import { HandCoins, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDelete, EmptyState, LoadingBlock, PageHeader, ProgressBar, StatCard } from "@/components/kit";
import { BorrowDialog, SettleDialog } from "@/components/quick-actions";
import { useBorrowings, useCurrency, useDeleteRow } from "@/hooks/use-data";
import { dueLabel, formatMoney, pct, settlementStatus } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/borrowings")({
  head: () => ({
    meta: [
      { title: "Borrowings — In&out" },
      { name: "description", content: "Track money you borrowed, repayments made and what remains." },
      { property: "og:title", content: "Borrowings — In&out" },
      { property: "og:description", content: "Money you owe, with due dates and partial repayments." },
    ],
  }),
  component: BorrowingsPage,
});

function BorrowingsPage() {
  const currency = useCurrency();
  const borrowings = useBorrowings();
  const del = useDeleteRow("borrowings", "Borrowing deleted");
  const rows = borrowings.data ?? [];

  const totalBorrowed = rows.reduce((t, r) => t + Number(r.amount), 0);
  const totalRepaid = rows.reduce((t, r) => t + Number(r.amount_repaid), 0);
  const remaining = totalBorrowed - totalRepaid;
  const overdue = rows.filter(
    (r) => settlementStatus(Number(r.amount), Number(r.amount_repaid), r.due_date) === "Overdue",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Borrowings"
        description="Money you borrowed from other people."
        actions={<BorrowDialog trigger={<Button size="sm"><HandCoins className="h-4 w-4" /> Add borrowing</Button>} />}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total borrowed" value={totalBorrowed} currency={currency} loading={borrowings.isLoading} />
        <StatCard label="Total repaid" value={totalRepaid} currency={currency} tone="positive" loading={borrowings.isLoading} />
        <StatCard label="Remaining" value={remaining} currency={currency} tone="negative" loading={borrowings.isLoading} />
        <StatCard label="Overdue" value={overdue.length} raw={String(overdue.length)} tone="warning" loading={borrowings.isLoading} />
      </section>

      {borrowings.isLoading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No borrowings yet"
          description="Record money you took from someone to keep track of repayments."
          icon={HandCoins}
          action={<BorrowDialog trigger={<Button size="sm">Add borrowing</Button>} />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((b) => {
            const rem = Math.max(Number(b.amount) - Number(b.amount_repaid), 0);
            const status = settlementStatus(Number(b.amount), Number(b.amount_repaid), b.due_date);
            return (
              <article key={b.id} className="card-surface p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{b.person_name}</p>
                    <p className="text-xs text-muted-foreground">{dueLabel(b.due_date)}</p>
                  </div>
                  <Badge
                    variant={
                      status === "Fully Paid" ? "secondary" : status === "Overdue" ? "destructive" : "outline"
                    }
                  >
                    {status}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Borrowed</dt>
                    <dd className="font-semibold tabular-nums">{formatMoney(Number(b.amount), currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Paid</dt>
                    <dd className="font-semibold tabular-nums text-success">{formatMoney(Number(b.amount_repaid), currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Remaining</dt>
                    <dd className="font-semibold tabular-nums text-destructive">{formatMoney(rem, currency)}</dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <ProgressBar percent={pct(Number(b.amount_repaid), Number(b.amount))} tone="success" />
                </div>
                {b.notes ? <p className="mt-2 text-xs text-muted-foreground">{b.notes}</p> : null}
                <div className="mt-3 flex items-center gap-2">
                  {rem > 0 ? (
                    <SettleDialog
                      kind="borrowing"
                      recordId={b.id}
                      personName={b.person_name}
                      remaining={rem}
                      trigger={<Button size="sm" variant="secondary">Record repayment</Button>}
                    />
                  ) : null}
                  <ConfirmDelete
                    onConfirm={() => del.mutate(b.id)}
                    trigger={<Button size="icon" variant="ghost"><Trash2 className="h-3.5 w-3.5" /></Button>}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
