import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDelete, EmptyState, LoadingBlock, PageHeader, ProgressBar, StatCard } from "@/components/kit";
import { LendDialog, SettleDialog } from "@/components/quick-actions";
import { useCurrency, useDeleteRow, useLendings } from "@/hooks/use-data";
import { dueLabel, formatMoney, pct, settlementStatus } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/lending")({
  head: () => ({
    meta: [
      { title: "Lending — In&out" },
      { name: "description", content: "Track money you lent out, what came back and what is pending." },
      { property: "og:title", content: "Lending — In&out" },
      { property: "og:description", content: "Money owed to you, with expected return dates." },
    ],
  }),
  component: LendingPage,
});

function LendingPage() {
  const currency = useCurrency();
  const lendings = useLendings();
  const del = useDeleteRow("lendings", "Lending deleted");
  const rows = lendings.data ?? [];

  const totalLent = rows.reduce((t, r) => t + Number(r.amount), 0);
  const totalReceived = rows.reduce((t, r) => t + Number(r.amount_received), 0);
  const pending = totalLent - totalReceived;
  const overdue = rows.filter(
    (r) => settlementStatus(Number(r.amount), Number(r.amount_received), r.expected_return_date) === "Overdue",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lending"
        description="Money other people owe you."
        actions={<LendDialog trigger={<Button size="sm"><ArrowLeftRight className="h-4 w-4" /> Add lending</Button>} />}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total lent" value={totalLent} currency={currency} loading={lendings.isLoading} />
        <StatCard label="Received back" value={totalReceived} currency={currency} tone="positive" loading={lendings.isLoading} />
        <StatCard label="Pending" value={pending} currency={currency} tone="warning" loading={lendings.isLoading} />
        <StatCard label="Overdue" value={overdue.length} raw={String(overdue.length)} tone="negative" loading={lendings.isLoading} />
      </section>

      {lendings.isLoading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState
          title="You haven't lent anything yet"
          description="Record money you gave someone so you never forget to collect."
          icon={ArrowLeftRight}
          action={<LendDialog trigger={<Button size="sm">Add lending</Button>} />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((l) => {
            const rem = Math.max(Number(l.amount) - Number(l.amount_received), 0);
            const status = settlementStatus(Number(l.amount), Number(l.amount_received), l.expected_return_date);
            return (
              <article key={l.id} className="card-surface p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{l.person_name}</p>
                    <p className="text-xs text-muted-foreground">{dueLabel(l.expected_return_date)}</p>
                  </div>
                  <Badge variant={status === "Fully Paid" ? "secondary" : status === "Overdue" ? "destructive" : "outline"}>
                    {status}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Lent</dt>
                    <dd className="font-semibold tabular-nums">{formatMoney(Number(l.amount), currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Received</dt>
                    <dd className="font-semibold tabular-nums text-success">{formatMoney(Number(l.amount_received), currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Remaining</dt>
                    <dd className="font-semibold tabular-nums text-warning">{formatMoney(rem, currency)}</dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <ProgressBar percent={pct(Number(l.amount_received), Number(l.amount))} tone="success" />
                </div>
                {l.notes ? <p className="mt-2 text-xs text-muted-foreground">{l.notes}</p> : null}
                <div className="mt-3 flex items-center gap-2">
                  {rem > 0 ? (
                    <SettleDialog
                      kind="lending"
                      recordId={l.id}
                      personName={l.person_name}
                      remaining={rem}
                      trigger={<Button size="sm" variant="secondary">Record collection</Button>}
                    />
                  ) : null}
                  <ConfirmDelete
                    onConfirm={() => del.mutate(l.id)}
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
