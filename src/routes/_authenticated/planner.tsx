import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { PiggyBank, Plus, Trash2, CalendarClock, Pencil, Edit, Check, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { supabase } from "@/integrations/supabase/client";
import {
  useCategories,
  useCurrency,
  useDeleteRow,
  useGoals,
  useInvalidateAll,
  useSaveRow,
  useBudgets,
  useTransactions,
} from "@/hooks/use-data";
import { useBudgetProgress } from "@/hooks/use-summary";
import { dueLabel, formatMoney, pct, toISO, MONTH_KEY } from "@/lib/finance";
import type { SavingsGoal } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "Planner — In&out" },
      { name: "description", content: "Plan your monthly budget limits and track your savings goals." },
      { property: "og:title", content: "Planner — In&out" },
      { property: "og:description", content: "Combined budgeting planner and savings goals." },
    ],
  }),
  component: PlannerPage,
});

// Edit Savings Goal Dialog Component
function EditGoalDialog({
  goal,
  open,
  onOpenChange,
}: {
  goal: SavingsGoal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    target_amount: "",
    target_date: "",
    saved_amount: "",
  });
  const save = useSaveRow("savings_goals", "Savings goal updated");

  useEffect(() => {
    if (goal) {
      setForm({
        name: goal.name,
        target_amount: String(goal.target_amount),
        target_date: goal.target_date || "",
        saved_amount: String(goal.saved_amount || 0),
      });
    }
  }, [goal]);

  const submit = async () => {
    if (!(Number(form.target_amount) > 0)) {
      toast.error("Enter a target amount greater than zero.");
      return;
    }
    await save.mutateAsync({
      id: goal.id,
      name: form.name.trim() || "Goal",
      target_amount: Number(form.target_amount),
      saved_amount: Number(form.saved_amount || 0),
      target_date: form.target_date || null,
    });
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit savings goal`}
      onSubmit={submit}
      submitting={save.isPending}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Goal Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="Target Amount">
          <Input
            type="number"
            min="1"
            step="0.01"
            value={form.target_amount}
            onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
            required
          />
        </Field>
        <Field label="Saved Amount">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.saved_amount}
            onChange={(e) => setForm({ ...form, saved_amount: e.target.value })}
          />
        </Field>
        <Field label="Target Date" className="sm:col-span-2">
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

// Add New Savings Goal Dialog Component
function NewGoalForm() {
  const save = useSaveRow("savings_goals", "Savings goal added");
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

// Add Contributions / Money to Goals Dialog
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

// Edit Category Budgets Form Dialog (Daily Plan)
function EditBudgetsDialog({
  expenseCategories,
  budgets,
  open,
  onOpenChange,
}: {
  expenseCategories: { id: string; name: string }[];
  budgets: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const invalidate = useInvalidateAll();
  const currentMonth = MONTH_KEY();

  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      expenseCategories.forEach((cat) => {
        const existing = budgets.find(
          (b) => b.category.toLowerCase() === cat.name.toLowerCase() && b.month === currentMonth
        );
        initial[cat.name] = existing ? String(existing.amount) : "0";
      });
      setFormValues(initial);
    }
  }, [open, expenseCategories, budgets, currentMonth]);

  const submit = async () => {
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You must be signed in.");

      const upserts = expenseCategories.map((cat) => {
        const amt = Number(formValues[cat.name] || 0);
        const existing = budgets.find(
          (b) => b.category.toLowerCase() === cat.name.toLowerCase() && b.month === currentMonth
        );
        return {
          ...(existing?.id ? { id: existing.id } : {}),
          user_id: auth.user.id,
          category: cat.name,
          amount: amt,
          month: currentMonth,
        };
      });

      const { error } = await supabase.from("budgets").upsert(upserts as never);
      if (error) throw error;

      invalidate();
      toast.success("Budgets updated successfully");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit spending plan (Budgets)"
      description="Set limit amounts for your expense categories. Alter any category, or keep them at 0 for unlimited/untracked."
      onSubmit={submit}
      submitting={busy}
      submitLabel="Save limits"
    >
      <div className="grid gap-3 sm:grid-cols-2 max-h-[60vh] overflow-y-auto pr-1">
        {expenseCategories.map((cat) => (
          <Field key={cat.id} label={cat.name}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formValues[cat.name] ?? ""}
              onChange={(e) => setFormValues({ ...formValues, [cat.name]: e.target.value })}
              placeholder="0 (Unlimited)"
            />
          </Field>
        ))}
        {expenseCategories.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-2">
            No expense categories found. Create categories first in the Expenses tab.
          </p>
        )}
      </div>
    </FormDialog>
  );
}

function PlannerPage() {
  const currency = useCurrency();
  const goals = useGoals();
  const rawBudgets = useBudgets();
  const categories = useCategories();
  const tx = useTransactions();
  const delGoal = useDeleteRow("savings_goals", "Savings goal deleted");
  const invalidate = useInvalidateAll();

  // Tab State
  const [activeTab, setActiveTab] = useState("daily-plan");

  // Budget states
  const currentMonth = MONTH_KEY();
  const progress = useBudgetProgress(currentMonth);
  const [budgetsOpen, setBudgetsOpen] = useState(false);

  // Edit Goal states
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  // Categorize expense categories
  const expenseCategories = useMemo(() => {
    return (categories.data ?? []).filter((c) => c.kind === "expense");
  }, [categories.data]);

  // Combined Daily Plan details (Categories & Actual Spent & Budget Limit)
  const mergedBudgets = useMemo(() => {
    if (categories.isLoading || progress.loading) return [];

    const monthEnd = currentMonth.slice(0, 8) + "31";
    return expenseCategories.map((cat) => {
      // Find if we have progress calculated
      const progRow = progress.rows.find((r) => r.category.toLowerCase() === cat.name.toLowerCase());

      // If not, calculate spent directly from transactions
      let spent = 0;
      if (!progRow) {
        const txList = tx.data ?? [];
        for (const t of txList) {
          if (t.type === "expense" && t.category && t.category.toLowerCase() === cat.name.toLowerCase()) {
            if (t.date >= currentMonth && t.date <= monthEnd) {
              spent += Number(t.amount);
            }
          }
        }
      }

      const budgetAmt = progRow ? Number(progRow.amount) : 0;
      const actualSpent = progRow ? Number(progRow.spent) : spent;

      return {
        id: progRow?.id,
        category: cat.name,
        amount: budgetAmt,
        spent: actualSpent,
        remaining: budgetAmt ? budgetAmt - actualSpent : -actualSpent,
        percent: budgetAmt ? pct(actualSpent, budgetAmt) : 0,
      };
    });
  }, [categories.data, progress.rows, progress.loading, tx.data, currentMonth, expenseCategories]);

  // Goals aggregates
  const goalRows = goals.data ?? [];
  const totalSaved = goalRows.reduce((t, g) => t + Number(g.saved_amount), 0);
  const totalTarget = goalRows.reduce((t, g) => t + Number(g.target_amount), 0);

  // Budgets aggregates
  const totalBudgeted = mergedBudgets.reduce((t, b) => t + b.amount, 0);
  const totalSpent = mergedBudgets.reduce((t, b) => t + b.spent, 0);

  // Mark Savings Goal fully funded / paid off
  const handleMarkPaid = async (goal: SavingsGoal) => {
    const remaining = Number(goal.target_amount) - Number(goal.saved_amount);
    if (remaining <= 0) {
      toast.info(`Goal '${goal.name}' is already fully complete!`);
      return;
    }

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You must be signed in.");

      // Add contribution transaction
      const { error: cErr } = await supabase.from("savings_contributions").insert({
        user_id: auth.user.id,
        goal_id: goal.id,
        amount: remaining,
        date: toISO(new Date()),
      } as never);
      if (cErr) throw cErr;

      // Update goal
      const { error } = await supabase
        .from("savings_goals")
        .update({ saved_amount: goal.target_amount } as never)
        .eq("id", goal.id);
      if (error) throw error;

      invalidate();
      toast.success(`Marked goal '${goal.name}' as fully funded!`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Planner"
        description="Unified financial budget limits and savings goals"
        actions={
          activeTab === "daily-plan" ? (
            <Button size="sm" onClick={() => setBudgetsOpen(true)}>
              <Edit className="h-4 w-4" /> Edit limits
            </Button>
          ) : (
            <NewGoalForm />
          )
        }
      />

      {/* Header aggregates */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {activeTab === "daily-plan" ? (
          <>
            <StatCard label="Total Budgeted" value={totalBudgeted} currency={currency} loading={rawBudgets.isLoading} />
            <StatCard
              label="Spent This Month"
              value={totalSpent}
              currency={currency}
              tone={totalSpent > totalBudgeted && totalBudgeted > 0 ? "negative" : "default"}
              loading={tx.isLoading}
            />
            <StatCard
              label="Budget Status"
              value={totalBudgeted > 0 ? Math.max(totalBudgeted - totalSpent, 0) : 0}
              currency={currency}
              raw={
                totalBudgeted > 0
                  ? `${pct(totalSpent, totalBudgeted)}% Used`
                  : totalSpent > 0
                    ? "Overspent"
                    : "No Limits"
              }
              tone={totalSpent > totalBudgeted && totalBudgeted > 0 ? "negative" : "positive"}
              loading={rawBudgets.isLoading || tx.isLoading}
            />
            <StatCard
              label="Tracked Categories"
              value={mergedBudgets.filter((b) => b.amount > 0).length}
              raw={`${mergedBudgets.filter((b) => b.amount > 0).length} / ${mergedBudgets.length}`}
              loading={categories.isLoading}
            />
          </>
        ) : (
          <>
            <StatCard label="Total Saved" value={totalSaved} currency={currency} tone="positive" loading={goals.isLoading} />
            <StatCard label="Target Savings" value={totalTarget} currency={currency} loading={goals.isLoading} />
            <StatCard
              label="Completion Rate"
              value={0}
              raw={`${pct(totalSaved, totalTarget)}%`}
              tone="info"
              loading={goals.isLoading}
            />
            <StatCard
              label="Active Goals"
              value={goalRows.length}
              raw={String(goalRows.length)}
              loading={goals.isLoading}
            />
          </>
        )}
      </section>

      {/* Main Tabs structure */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/80 p-1 rounded-xl">
          <TabsTrigger value="daily-plan" className="rounded-lg px-4 font-semibold text-xs py-2">
            Daily Plan (Budgets)
          </TabsTrigger>
          <TabsTrigger value="savings-goals" className="rounded-lg px-4 font-semibold text-xs py-2">
            Savings Goals
          </TabsTrigger>
        </TabsList>

        {/* TAB Content 1: Daily Plan (Budgets) */}
        <TabsContent value="daily-plan" className="space-y-4 focus-visible:outline-none">
          {rawBudgets.isLoading || categories.isLoading ? (
            <LoadingBlock />
          ) : mergedBudgets.length === 0 ? (
            <EmptyState
              title="No categories found"
              description="Define some categories in the Expenses section to start budgeting."
              icon={TrendingDown}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {mergedBudgets.map((b) => {
                const isOver = b.amount > 0 && b.spent > b.amount;
                const isZero = b.amount === 0;

                return (
                  <article key={b.category} className="card-surface p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{b.category}</p>
                        <span
                          className={`text-xs font-bold rounded-full px-2 py-0.5 uppercase tracking-wide shrink-0 ${
                            isZero
                              ? "bg-muted text-muted-foreground"
                              : isOver
                                ? "bg-destructive/10 text-destructive"
                                : "bg-success/10 text-success"
                          }`}
                        >
                          {isZero ? "Unlimited" : isOver ? "Over Limit" : "On Track"}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-baseline justify-between text-xs tabular-nums text-muted-foreground">
                        <span>
                          <strong className="text-foreground text-sm font-semibold">
                            {formatMoney(b.spent, currency)}
                          </strong>
                          {isZero ? " spent" : ` / ${formatMoney(b.amount, currency)}`}
                        </span>
                        {!isZero && (
                          <span className="font-medium text-foreground">
                            {b.percent}%
                          </span>
                        )}
                      </div>

                      <div className="mt-2">
                        <ProgressBar
                          percent={isZero ? 0 : b.percent}
                          tone={isZero ? "primary" : isOver ? "destructive" : "success"}
                        />
                      </div>
                    </div>

                    {!isZero && (
                      <p className="mt-3 text-xs text-muted-foreground italic">
                        {b.remaining >= 0
                          ? `${formatMoney(b.remaining, currency)} remaining this month`
                          : `${formatMoney(Math.abs(b.remaining), currency)} over budget`}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB Content 2: Savings Goals */}
        <TabsContent value="savings-goals" className="space-y-4 focus-visible:outline-none">
          {goals.isLoading ? (
            <LoadingBlock />
          ) : goalRows.length === 0 ? (
            <EmptyState
              title="No savings goals"
              description="Define savings targets like Emergency Fund, Travel, or New Laptop."
              icon={PiggyBank}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {goalRows.map((g) => {
                const percentVal = pct(Number(g.saved_amount), Number(g.target_amount));
                const isPaid = percentVal >= 100;

                return (
                  <article key={g.id} className="card-surface p-4 flex flex-col justify-between">
                    <div>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-sm">{g.name}</p>
                          <p className="text-xs text-muted-foreground">{dueLabel(g.target_date)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                              <Check className="h-3 w-3" /> Paid
                            </span>
                          ) : (
                            <span className="text-xs font-semibold tabular-nums">
                              {percentVal}%
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                        <strong className="text-foreground text-sm font-semibold">
                          {formatMoney(Number(g.saved_amount), currency)}
                        </strong>{" "}
                        / {formatMoney(Number(g.target_amount), currency)}
                      </p>
                      <div className="mt-2">
                        <ProgressBar percent={percentVal} tone="success" />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                      <div className="flex items-center gap-2">
                        {!isPaid ? (
                          <>
                            <ContributeDialog goalId={g.id} goalName={g.name} saved={Number(g.saved_amount)} />
                            <Button size="sm" variant="outline" className="h-8 py-1 cursor-pointer" onClick={() => void handleMarkPaid(g)}>
                              Mark paid
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-success font-medium italic">Goal fully funded!</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 cursor-pointer" onClick={() => setEditingGoal(g)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <ConfirmDelete
                          onConfirm={() => delGoal.mutate(g.id)}
                          trigger={
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive cursor-pointer hover:bg-destructive/5 hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog for editing Category Limits */}
      <EditBudgetsDialog
        expenseCategories={expenseCategories}
        budgets={rawBudgets.data ?? []}
        open={budgetsOpen}
        onOpenChange={setBudgetsOpen}
      />

      {/* Dialog for editing specific Savings Goal */}
      {editingGoal && (
        <EditGoalDialog
          goal={editingGoal}
          open={!!editingGoal}
          onOpenChange={(open) => {
            if (!open) setEditingGoal(null);
          }}
        />
      )}
    </div>
  );
}
