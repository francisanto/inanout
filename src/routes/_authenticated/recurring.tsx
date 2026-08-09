import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";
import {
  ConfirmDelete,
  EmptyState,
  Field,
  FormDialog,
  LoadingBlock,
  PageHeader,
  StatCard,
} from "@/components/kit";
import {
  addTransaction,
  useCurrency,
  useDeleteRow,
  useInvalidateAll,
  useRecurring,
  useSaveRow,
} from "@/hooks/use-data";
import { FREQUENCIES, dueLabel, formatMoney, nextDueFrom, toISO } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/recurring")({
  head: () => ({
    meta: [
      { title: "Recurring — In&out" },
      { name: "description", content: "Subscriptions, rent and bills that repeat, with next due dates." },
      { property: "og:title", content: "Recurring — In&out" },
      { property: "og:description", content: "Repeating payments and their next due dates." },
    ],
  }),
  component: RecurringPage,
});

function RecurringForm() {
  const save = useSaveRow("recurring_payments", "Recurring payment saved");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    category: "",
    frequency: "monthly",
    next_due_date: toISO(new Date()),
  });

  const submit = async () => {
    if (!(Number(form.amount) > 0)) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    await save.mutateAsync({
      name: form.name.trim() || "Payment",
      amount: Number(form.amount),
      category: form.category.trim() || null,
      frequency: form.frequency,
      start_date: form.next_due_date,
      next_due_date: form.next_due_date,
      active: true,
    });
    setOpen(false);
    setForm({ ...form, name: "", amount: "" });
  };

  return (
    <FormDialog
      trigger={
        <Button size="sm">
          <Plus className="h-4 w-4" /> Add recurring
        </Button>
      }
      open={open}
      onOpenChange={setOpen}
      title="Add recurring payment"
      onSubmit={submit}
      submitting={save.isPending}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="Amount">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </Field>
        <Field label="Category">
          <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </Field>
        <Field label="Frequency">
          <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Next due date" className="sm:col-span-2">
          <Input
            type="date"
            value={form.next_due_date}
            onChange={(e) => setForm({ ...form, next_due_date: e.target.value })}
          />
        </Field>
      </div>
    </FormDialog>
  );
}

function RecurringPage() {
  const currency = useCurrency();
  const recurring = useRecurring();
  const save = useSaveRow("recurring_payments", "Updated");
  const del = useDeleteRow("recurring_payments", "Recurring payment deleted");
  const invalidate = useInvalidateAll();
  const rows = recurring.data ?? [];
  const monthly = rows
    .filter((r) => r.active && r.frequency === "monthly")
    .reduce((t, r) => t + Number(r.amount), 0);

  const markPaid = async (id: string, name: string, amount: number, frequency: string, due: string) => {
    try {
      await addTransaction({
        type: "expense",
        amount,
        date: toISO(new Date()),
        category: "Subscriptions",
        description: name,
        is_recurring: true,
      });
      await save.mutateAsync({ id, next_due_date: nextDueFrom(due, frequency) });
      invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Recurring" description="Bills and subscriptions that repeat." actions={<RecurringForm />} />

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Monthly commitment" value={monthly} currency={currency} loading={recurring.isLoading} />
        <StatCard
          label="Active"
          value={0}
          raw={String(rows.filter((r) => r.active).length)}
          loading={recurring.isLoading}
        />
      </section>

      {recurring.isLoading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState title="No recurring payments" description="Add rent, EMIs or subscriptions." icon={Repeat} />
      ) : (
        <ul className="card-surface divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">
                    {r.frequency}
                  </Badge>
                  {dueLabel(r.next_due_date)}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums">{formatMoney(Number(r.amount), currency)}</span>
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={r.active}
                  onCheckedChange={(v) => save.mutate({ id: r.id, active: v })}
                  aria-label="Active"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void markPaid(r.id, r.name, Number(r.amount), r.frequency, r.next_due_date)}
                >
                  Mark paid
                </Button>
                <ConfirmDelete
                  onConfirm={() => del.mutate(r.id)}
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
    </div>
  );
}
