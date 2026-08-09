import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock, PageHeader, StatCard } from "@/components/kit";
import { MarkPaidButton } from "@/components/mark-paid";
import { SettleDialog } from "@/components/quick-actions";
import { useBorrowings, useCurrency, useLendings } from "@/hooks/use-data";
import { dueLabel, formatMoney } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/people")({
  head: () => ({
    meta: [
      { title: "People — In&out" },
      { name: "description", content: "See who you owe and who owes you, person by person." },
      { property: "og:title", content: "People — In&out" },
      { property: "og:description", content: "Per-person money history." },
    ],
  }),
  component: PeoplePage,
});

interface PersonRow {
  name: string;
  owedToYou: number;
  youOwe: number;
  lendings: { id: string; remaining: number; date: string | null }[];
  borrowings: { id: string; remaining: number; date: string | null }[];
}

function PeoplePage() {
  const currency = useCurrency();
  const borrowings = useBorrowings();
  const lendings = useLendings();

  const rows = useMemo<PersonRow[]>(() => {
    const map = new Map<string, PersonRow>();
    const get = (name: string) => {
      const key = name.trim() || "Unknown";
      if (!map.has(key)) map.set(key, { name: key, owedToYou: 0, youOwe: 0, lendings: [], borrowings: [] });
      return map.get(key)!;
    };
    for (const l of lendings.data ?? []) {
      const rem = Math.max(Number(l.amount) - Number(l.amount_received), 0);
      const p = get(l.person_name);
      p.owedToYou += rem;
      if (rem > 0) p.lendings.push({ id: l.id, remaining: rem, date: l.expected_return_date });
    }
    for (const b of borrowings.data ?? []) {
      const rem = Math.max(Number(b.amount) - Number(b.amount_repaid), 0);
      const p = get(b.person_name);
      p.youOwe += rem;
      if (rem > 0) p.borrowings.push({ id: b.id, remaining: rem, date: b.due_date });
    }
    return [...map.values()].sort((a, b) => b.owedToYou + b.youOwe - (a.owedToYou + a.youOwe));
  }, [borrowings.data, lendings.data]);

  const totalOwedToYou = rows.reduce((t, r) => t + r.owedToYou, 0);
  const totalYouOwe = rows.reduce((t, r) => t + r.youOwe, 0);
  const loading = borrowings.isLoading || lendings.isLoading;

  return (
    <div className="space-y-5">
      <PageHeader title="People" description="Who owes you, and who you owe." />

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Owed to you" value={totalOwedToYou} currency={currency} tone="positive" loading={loading} />
        <StatCard label="You owe" value={totalYouOwe} currency={currency} tone="negative" loading={loading} />
      </section>

      {loading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState title="No people yet" description="Add a lending or borrowing and people show up here." icon={Users} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((p) => (
            <article key={p.name} className="card-surface p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <p className="truncate font-semibold">{p.name}</p>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    p.owedToYou - p.youOwe >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatMoney(p.owedToYou - p.youOwe, currency)}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {p.lendings.map((l) => (
                  <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-muted-foreground">
                      Owes you {formatMoney(l.remaining, currency)} · {dueLabel(l.date)}
                    </span>
                    <div className="flex gap-1.5">
                      <SettleDialog
                        kind="lending"
                        recordId={l.id}
                        personName={p.name}
                        remaining={l.remaining}
                        trigger={
                          <Button size="sm" variant="secondary">
                            Part paid
                          </Button>
                        }
                      />
                      <MarkPaidButton kind="lending" recordId={l.id} personName={p.name} remaining={l.remaining} />
                    </div>
                  </div>
                ))}
                {p.borrowings.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-muted-foreground">
                      You owe {formatMoney(b.remaining, currency)} · {dueLabel(b.date)}
                    </span>
                    <div className="flex gap-1.5">
                      <SettleDialog
                        kind="borrowing"
                        recordId={b.id}
                        personName={p.name}
                        remaining={b.remaining}
                        trigger={
                          <Button size="sm" variant="secondary">
                            Part paid
                          </Button>
                        }
                      />
                      <MarkPaidButton kind="borrowing" recordId={b.id} personName={p.name} remaining={b.remaining} />
                    </div>
                  </div>
                ))}
                {p.lendings.length === 0 && p.borrowings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All settled.</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
