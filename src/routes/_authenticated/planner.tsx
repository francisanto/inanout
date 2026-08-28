import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { PiggyBank, Plus, Trash2, Pencil, Edit, Check, TrendingDown, Gauge } from "lucide-react";
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
  useTransactions,
} from "@/hooks/use-data";
import { useDailyPlan } from "@/hooks/use-daily-plan";
import { DailyPlanSettings } from "@/components/daily-plan";
import { dueLabel, formatMoney, pct, toISO } from "@/lib/finance";
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

function PlannerPage() {
  const currency = useCurrency();
  const goals = useGoals();
  const plan = useDailyPlan();
  const delGoal = useDeleteRow("savings_goals", "Savings goal deleted");
  const invalidate = useInvalidateAll();

  // Tab State
  const [activeTab, setActiveTab] = useState("daily-plan");

  // Edit Goal states
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  // Suggested limits per category mapping for customization
  const suggestedByCategory = useMemo(() => {
    return Object.fromEntries(plan.categories.map((c) => [c.category, c.perDay]));
  }, [plan.categories]);

  // Goals aggregates
  const goalRows = goals.data ?? [];
  const totalSaved = goalRows.reduce((t, g) => t + Number(g.saved_amount), 0);
  const totalTarget = goalRows.reduce((t, g) => t + Number(g.target_amount), 0);

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
            <DailyPlanSettings suggested={plan.suggestedLimit} suggestedByCategory={suggestedByCategory} />
          ) : (
            <NewGoalForm />
          )
        }
      />

      {/* Header aggregates */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {activeTab === "daily-plan" ? (
          <>
            <StatCard label="Daily Limit" value={plan.dailyLimit} currency={currency} loading={plan.loading} />
            <StatCard
              label="Spent Today"
              value={plan.todaySpent}
              currency={currency}
              tone={plan.percentUsed >= 100 ? "negative" : "default"}
              loading={plan.loading}
            />
            <StatCard
              label="Tracked Categories"
              value={plan.categories.filter((c) => c.isCustomPerDay || c.todaySpent > 0).length}
              raw={`${plan.categories.filter((c) => c.isCustomPerDay || c.todaySpent > 0).length} / ${plan.categories.length}`}
              loading={plan.loading}
            />
          </>
        ) : (
          <>
            <StatCard label="Total Saved" value={totalSaved} currency={currency} tone="positive" loading={goals.isLoading} />
            <StatCard label="Target Savings" value={totalTarget} currency={currency} loading={goals.isLoading} />
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
            Daily Plan
          </TabsTrigger>
          <TabsTrigger value="savings-goals" className="rounded-lg px-4 font-semibold text-xs py-2">
            Savings Goals
          </TabsTrigger>
        </TabsList>

        {/* TAB Content 1: Daily Plan */}
        <TabsContent value="daily-plan" className="space-y-4 focus-visible:outline-none">
          {plan.loading ? (
            <LoadingBlock />
          ) : !plan.hasData ? (
            <EmptyState
              title="Not enough history yet"
              description="Log a few expenses and I'll suggest a daily limit from your own spending pattern."
              icon={Gauge}
            />
          ) : (
            <div className="space-y-4">
              {/* Daily Spend Plan Progress Card */}
              <div className="card-surface p-4 bg-muted/30">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-base font-semibold">
                      <Gauge className="h-4.5 w-4.5 shrink-0 text-primary" /> Today's Spending Status
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {plan.isCustom
                        ? `Custom Limit · Suggested limit was ${formatMoney(plan.suggestedLimit, currency)}/day`
                        : `Derived from last ${plan.days} days · avg ${formatMoney(Math.round(plan.avgPerDay), currency)}/day`}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-card border border-border/50 p-4 shadow-sm">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Limit for today
                      </p>
                      <p className="font-display text-2xl font-bold tabular-nums">
                        {formatMoney(plan.dailyLimit, currency)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Spent today</p>
                      <p className="text-lg font-bold tabular-nums">
                        {formatMoney(plan.todaySpent, currency)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <ProgressBar
                      percent={plan.percentUsed}
                      tone={
                        plan.percentUsed >= 100
                          ? "destructive"
                          : plan.percentUsed >= 75
                            ? "warning"
                            : "success"
                      }
                    />
                    <p
                      className={`mt-2 text-xs font-semibold ${
                        plan.remainingToday < 0 ? "text-destructive" : "text-success"
                      }`}
                    >
                      {plan.remainingToday < 0
                        ? `Over today's limit by ${formatMoney(Math.abs(plan.remainingToday), currency)}`
                        : `${formatMoney(plan.remainingToday, currency)} left for today`}
                    </p>
                  </div>
                </div>

                {plan.topCategory && (
                  <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                    💡 You spend most on <span className="font-semibold text-foreground">{plan.topCategory.category}</span>{" "}
                    ({Math.round(plan.topCategory.share * 100)}% of your spending).
                  </p>
                )}
              </div>

              {/* Category-wise Daily Limits list */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80 px-1">
                  Category Daily Quotas
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {plan.categories.map((c) => {
                    const percent = c.perDay ? Math.round((c.todaySpent / c.perDay) * 100) : 0;
                    const isOver = c.perDay > 0 && c.todaySpent > c.perDay;
                    return (
                      <article key={c.category} className="card-surface p-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm truncate">{c.category}</p>
                            <span
                              className={`text-xs font-bold rounded-full px-2 py-0.5 uppercase tracking-wide shrink-0 ${
                                isOver
                                  ? "bg-destructive/10 text-destructive"
                                  : c.perDay > 0
                                    ? "bg-success/10 text-success"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {c.perDay === 0 ? "Untracked" : isOver ? "Over Limit" : "On Track"}
                            </span>
                          </div>

                          <div className="mt-2.5 flex items-baseline justify-between text-xs tabular-nums text-muted-foreground">
                            <span>
                              <strong className="text-foreground text-sm font-semibold">
                                {formatMoney(c.todaySpent, currency)}
                              </strong>
                              {c.perDay === 0 ? " spent today" : ` / ${formatMoney(c.perDay, currency)} daily`}
                            </span>
                            {c.perDay > 0 && (
                              <span className="font-medium text-foreground">
                                {percent}%
                              </span>
                            )}
                          </div>

                          <div className="mt-2">
                            <ProgressBar
                              percent={c.perDay === 0 ? 0 : percent}
                              tone={c.perDay === 0 ? "primary" : isOver ? "destructive" : "success"}
                            />
                          </div>
                        </div>

                        {c.perDay > 0 && (
                          <p className="mt-3 text-xs text-muted-foreground italic">
                            {c.perDay - c.todaySpent >= 0
                              ? `${formatMoney(c.perDay - c.todaySpent, currency)} left today`
                              : `${formatMoney(Math.abs(c.perDay - c.todaySpent), currency)} over quota`}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
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
