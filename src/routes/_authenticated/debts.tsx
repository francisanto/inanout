import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, HandCoins, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ConfirmDelete,
  EmptyState,
  Field,
  FormDialog,
  LoadingBlock,
  PageHeader,
  ProgressBar,
  StatCard,
} from "@/components/kit";
import { BorrowDialog, DebtPaymentDialog, SettleDialog } from "@/components/quick-actions";
import { MarkPaidButton } from "@/components/mark-paid";
import { useBorrowings, useCurrency, useDebts, useDeleteRow, useSaveRow } from "@/hooks/use-data";
import { DEBT_TYPES, dueLabel, formatMoney, pct, settlementStatus, toISO } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/debts")({
  head: () => ({
    meta: [
      { title: "Debts & borrowed — In&out" },
      { name: "description", content: "Loans, EMIs, credit cards and money you borrowed from people, in one place." },
      { property: "og:title", content: "Debts & borrowed — In&out" },
      { property: "og:description", content: "Everything you owe, with payments and due dates." },
    ],
  }),
  component: DebtsPage,
});

function DebtForm() {
  const save = useSaveRow("debts", "Debt saved");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    provider: "",
    type: "loan",
    total_amount: "",
    emi_amount: "",
    interest_rate: "",
    due_date: toISO(new Date()),
  });

  const submit = async () => {
    await save.mutateAsync({
      name: form.name.trim() || "Debt",
      provider: form.provider.trim() || null,
      type: form.type,
      total_amount: Number(form.total_amount) || 0,
      emi_amount: Number(form.emi_amount) || 0,
      interest_rate: Number(form.interest_rate) || 0,
      due_date: form.due_date || null,
    });
    setOpen(false);
    setForm({ ...form, name: "", total_amount: "", emi_amount: "" });
  };

  return (
    <FormDialog
      trigger={
        <Button size="sm">
          <Plus className="h-4 w-4" /> Add debt
        </Button>
      }
      open={open}
      onOpenChange={setOpen}
      title="Add a debt"
      description="Loan, credit card, EMI or BNPL."
      onSubmit={submit}
      submitting={save.isPending}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="Type">
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEBT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Lender / provider">
          <Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
        </Field>
        <Field label="Total amount">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.total_amount}
            onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
            required
          />
        </Field>
        <Field label="EMI amount">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.emi_amount}
            onChange={(e) => setForm({ ...form, emi_amount: e.target.value })}
          />
        </Field>
        <Field label="Interest %">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.interest_rate}
            onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
          />
        </Field>
        <Field label="Next due date" className="sm:col-span-2">
          <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        </Field>
      </div>
    </FormDialog>
  );
}

function DebtsPage() {
  const currency = useCurrency();
  const debts = useDebts();
  const borrowings = useBorrowings();
  const delDebt = useDeleteRow("debts", "Debt deleted");
  const delBorrow = useDeleteRow("borrowings", "Borrowing deleted");

  const debtRows = debts.data ?? [];
  const borrowRows = borrowings.data ?? [];
  const debtRemaining = debtRows.reduce((t, d) => t + Math.max(Number(d.total_amount) - Number(d.paid_amount), 0), 0);
  const borrowRemaining = borrowRows.reduce((t, b) => t + Math.max(Number(b.amount) - Number(b.amount_repaid), 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Debts & borrowed" description="Everything you owe — banks and people." />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total owed" value={debtRemaining + borrowRemaining} currency={currency} tone="negative" />
        <StatCard label="Loans / EMIs" value={debtRemaining} currency={currency} tone="warning" />
        <StatCard label="From people" value={borrowRemaining} currency={currency} tone="warning" />
        <StatCard
          label="Open items"
          value={0}
          raw={String(
            debtRows.filter((d) => Number(d.total_amount) - Number(d.paid_amount) > 0).length +
              borrowRows.filter((b) => Number(b.amount) - Number(b.amount_repaid) > 0).length,
          )}
        />
      </section>

      <Tabs defaultValue="debts">
        <TabsList className="w-full">
          <TabsTrigger value="debts" className="flex-1">
            Loans & EMIs
          </TabsTrigger>
          <TabsTrigger value="people" className="flex-1">
            Borrowed from people
          </TabsTrigger>
        </TabsList>

        <TabsContent value="debts" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <DebtForm />
          </div>
          {debts.isLoading ? (
            <LoadingBlock />
          ) : debtRows.length === 0 ? (
            <EmptyState title="No loans or EMIs" description="Add a loan, credit card or BNPL to track payments." icon={CreditCard} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {debtRows.map((d) => {
                const rem = Math.max(Number(d.total_amount) - Number(d.paid_amount), 0);
                const status = settlementStatus(Number(d.total_amount), Number(d.paid_amount), d.due_date);
                return (
                  <article key={d.id} className="card-surface p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{d.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {d.provider ? `${d.provider} · ` : ""}
                          {d.type.replace("_", " ")} · {dueLabel(d.due_date)}
                        </p>
                      </div>
                      <Badge variant={status === "Fully Paid" ? "secondary" : status === "Overdue" ? "destructive" : "outline"}>
                        {status}
                      </Badge>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">Total</dt>
                        <dd className="font-semibold tabular-nums">{formatMoney(Number(d.total_amount), currency)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Paid</dt>
                        <dd className="font-semibold tabular-nums text-success">{formatMoney(Number(d.paid_amount), currency)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Left</dt>
                        <dd className="font-semibold tabular-nums text-warning">{formatMoney(rem, currency)}</dd>
                      </div>
                    </dl>
                    <div className="mt-3">
                      <ProgressBar percent={pct(Number(d.paid_amount), Number(d.total_amount))} tone="success" />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {rem > 0 ? (
                        <DebtPaymentDialog
                          debtId={d.id}
                          trigger={
                            <Button size="sm" variant="secondary">
                              Record payment
                            </Button>
                          }
                        />
                      ) : null}
                      <ConfirmDelete
                        onConfirm={() => delDebt.mutate(d.id)}
                        trigger={
                          <Button size="icon" variant="ghost">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="people" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <BorrowDialog
              trigger={
                <Button size="sm">
                  <HandCoins className="h-4 w-4" /> Add borrowing
                </Button>
              }
            />
          </div>
          {borrowings.isLoading ? (
            <LoadingBlock />
          ) : borrowRows.length === 0 ? (
            <EmptyState title="Nothing borrowed" description="Record money you took from someone." icon={HandCoins} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {borrowRows.map((b) => {
                const rem = Math.max(Number(b.amount) - Number(b.amount_repaid), 0);
                const status = settlementStatus(Number(b.amount), Number(b.amount_repaid), b.due_date);
                return (
                  <article key={b.id} className="card-surface p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{b.person_name}</p>
                        <p className="text-xs text-muted-foreground">{dueLabel(b.due_date)}</p>
                      </div>
                      <Badge variant={status === "Fully Paid" ? "secondary" : status === "Overdue" ? "destructive" : "outline"}>
                        {status}
                      </Badge>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">Borrowed</dt>
                        <dd className="font-semibold tabular-nums">{formatMoney(Number(b.amount), currency)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Repaid</dt>
                        <dd className="font-semibold tabular-nums text-success">{formatMoney(Number(b.amount_repaid), currency)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Left</dt>
                        <dd className="font-semibold tabular-nums text-warning">{formatMoney(rem, currency)}</dd>
                      </div>
                    </dl>
                    <div className="mt-3">
                      <ProgressBar percent={pct(Number(b.amount_repaid), Number(b.amount))} tone="success" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {rem > 0 ? (
                        <>
                          <SettleDialog
                            kind="borrowing"
                            recordId={b.id}
                            personName={b.person_name}
                            remaining={rem}
                            trigger={
                              <Button size="sm" variant="secondary">
                                Record repayment
                              </Button>
                            }
                          />
                          <MarkPaidButton
                            kind="borrowing"
                            recordId={b.id}
                            personName={b.person_name}
                            remaining={rem}
                            label="Mark fully repaid"
                          />
                        </>
                      ) : null}
                      <ConfirmDelete
                        onConfirm={() => delBorrow.mutate(b.id)}
                        trigger={
                          <Button size="icon" variant="ghost">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
