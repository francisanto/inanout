import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PiggyBank, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { supabase } from "@/integrations/supabase/client";
import { useCurrency, useDeleteRow, useGoals, useInvalidateAll, useSaveRow } from "@/hooks/use-data";
import { dueLabel, formatMoney, pct, toISO } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/savings")({
  head: () => ({
    meta: [
      { title: "Savings — In&out" },
      { name: "description", content: "Set savings goals and track how close you are to each one." },
      { property: "og:title", content: "Savings — In&out" },
      { property: "og:description", content: "Savings goals with progress tracking." },
    ],
  }),
  component: SavingsPage,
});

function GoalForm() {
  const save = useSaveRow("savings_goals", "Goal saved");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", target_amount: "", target_date: "" });

  const submit = async () => {
    if (!(Number(form.target_amount) > 0)) {
      toast.error("Enter a target greater than zero.");
      return;
    }
    await save.mutateAsync({
      name: form.name.trim() || "Goal",
      target_amount: Number(form.target_amount),
      target_date: form.target_date || null,
    });
    setOpen(false);
    setForm({ name: "", target_amount: "", target_date: "" });
  };

  return (
    <FormDialog
      trigger={
        <Button size="sm">
          <Plus className="h-4 w-4" /> Add goal
        </Button>
      }
      open={open}
      onOpenChange={setOpen}
      title="New savings goal"
      onSubmit={submit}
      submitting={save.isPending}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="Target amount">
          <Input
            type="number"
            min="1"
            step="0.01"
            value={form.target_amount}
            onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
            required
          />
        </Field>
        <Field label="Target date" className="sm:col-span-2">
          <Input
            type="date"
            value={form.target_date}
            onChange={(e) => setForm({ ...form, target_date: e.target.value })}
          />
        </Field>
      </div>
    </FormDialog>
  );
}

function ContributeDialog({ goalId, goalName, saved }: { goalId: string; goalName: string; saved: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const invalidate = useInvalidateAll();

  const submit = async () => {
    const value = Number(amount);
    if (!(value > 0)) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You must be signed in.");
      const { error: cErr } = await supabase.from("savings_contributions").insert({
        user_id: auth.user.id,
        goal_id: goalId,
        amount: value,
        date: toISO(new Date()),
      } as never);
      if (cErr) throw cErr;
      const { error } = await supabase
        .from("savings_goals")
        .update({ saved_amount: saved + value } as never)
        .eq("id", goalId);
      if (error) throw error;
      invalidate();
      toast.success(`Added to ${goalName}`);
      setOpen(false);
      setAmount("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog
      trigger={
        <Button size="sm" variant="secondary">
          Add money
        </Button>
      }
      open={open}
      onOpenChange={setOpen}
      title={`Add to ${goalName}`}
      onSubmit={submit}
      submitting={busy}
      submitLabel="Add"
    >
      <Field label="Amount">
        <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </Field>
    </FormDialog>
  );
}

function SavingsPage() {
  const currency = useCurrency();
  const goals = useGoals();
  const del = useDeleteRow("savings_goals", "Goal deleted");
  const rows = goals.data ?? [];
  const saved = rows.reduce((t, g) => t + Number(g.saved_amount), 0);
  const target = rows.reduce((t, g) => t + Number(g.target_amount), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Savings" description="Goals and how close you are." actions={<GoalForm />} />

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Saved" value={saved} currency={currency} tone="positive" loading={goals.isLoading} />
        <StatCard label="Target" value={target} currency={currency} loading={goals.isLoading} />
      </section>

      {goals.isLoading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState title="No savings goals" description="Create a goal like Emergency fund or New phone." icon={PiggyBank} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((g) => (
            <article key={g.id} className="card-surface p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{g.name}</p>
                  <p className="text-xs text-muted-foreground">{dueLabel(g.target_date)}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {pct(Number(g.saved_amount), Number(g.target_amount))}%
                </span>
              </div>
              <p className="mt-2 text-sm tabular-nums text-muted-foreground">
                {formatMoney(Number(g.saved_amount), currency)} / {formatMoney(Number(g.target_amount), currency)}
              </p>
              <div className="mt-2">
                <ProgressBar percent={pct(Number(g.saved_amount), Number(g.target_amount))} tone="success" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <ContributeDialog goalId={g.id} goalName={g.name} saved={Number(g.saved_amount)} />
                <ConfirmDelete
                  onConfirm={() => del.mutate(g.id)}
                  trigger={
                    <Button size="icon" variant="ghost">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  }
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
