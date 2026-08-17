import { useEffect, useState } from "react";
import { Gauge, Settings2, Sparkles } from "lucide-react";
import { EmptyState, Field, FormDialog, LoadingBlock, ProgressBar } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryManager } from "@/components/category-manager";
import { useDailyPlan } from "@/hooks/use-daily-plan";
import { useCategories, useProfile, useSaveRow } from "@/hooks/use-data";
import { formatMoney } from "@/lib/finance";

const LOOKBACK_OPTIONS = [
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 180 days" },
  { value: "365", label: "Last 365 days" },
];

/** Lets the user override the suggested daily limit, categories and history window. */
export function DailyPlanSettings({
  suggested,
  suggestedByCategory = {},
}: {
  suggested: number;
  suggestedByCategory?: Record<string, number>;
}) {
  const { data: profile } = useProfile();
  const categories = useCategories();
  const save = useSaveRow("profiles", "Daily plan updated");
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState("");
  const [lookback, setLookback] = useState("90");
  const [catLimits, setCatLimits] = useState<Record<string, string>>({});

  const expenseCats = (categories.data ?? []).filter((c) => c.kind === "expense");

  useEffect(() => {
    if (!open) return;
    setLimit(profile?.daily_limit ? String(profile.daily_limit) : "");
    setLookback(String(profile?.daily_plan_lookback ?? 90));
    const saved = profile?.category_limits ?? {};
    setCatLimits(
      Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, v ? String(v) : ""])),
    );
  }, [open, profile?.daily_limit, profile?.daily_plan_lookback, profile?.category_limits]);

  const submit = async () => {
    if (!profile?.id) return;
    const cleaned: Record<string, number> = {};
    for (const [name, value] of Object.entries(catLimits)) {
      const n = Number(value);
      if (value.trim() && Number.isFinite(n) && n > 0) cleaned[name] = n;
    }
    await save.mutateAsync({
      id: profile.id,
      daily_limit: limit.trim() ? Number(limit) : null,
      daily_plan_lookback: Number(lookback),
      category_limits: cleaned,
    });
    setOpen(false);
  };

  return (
    <FormDialog
      compact
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button size="sm" variant="outline" className="gap-1.5">
          <Settings2 className="h-4 w-4" /> Customise
        </Button>
      }
      title="Customise daily plan"
      description="Set your daily limit, per-category limits and how much history is analysed."
      onSubmit={submit}
      submitting={save.isPending}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="My daily limit" hint={`Empty = suggested (${suggested})`}>
          <Input
            className="h-10"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            placeholder={String(suggested)}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
        </Field>
        <Field label="Analyse history">
          <Select value={lookback} onValueChange={setLookback}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOOKBACK_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Per-category limit / day
          </p>
          <CategoryManager
            kind="expense"
            trigger={
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs">
                + Add category
              </Button>
            }
          />
        </div>
        {expenseCats.length === 0 ? (
          <p className="text-xs text-muted-foreground">Add a category first.</p>
        ) : (
          <ul className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-border p-2">
            {expenseCats.map((c) => (
              <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-2">
                <span className="min-w-0 truncate text-sm">{c.name}</span>
                <Input
                  className="h-9 px-2 text-sm"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  placeholder={String(suggestedByCategory[c.name] ?? 0)}
                  value={catLimits[c.name] ?? ""}
                  onChange={(e) => setCatLimits({ ...catLimits, [c.name]: e.target.value })}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </FormDialog>
  );
}


/** Spend analysis + a recommended daily limit derived from past categories. */
export function DailyPlanCard({ currency }: { currency: string }) {
  const plan = useDailyPlan();
  const suggestedByCategory = Object.fromEntries(
    plan.categories.map((c) => [c.category, c.perDay]),
  );

  if (plan.loading) {
    return (
      <section className="card-surface p-4">
        <h2 className="mb-4 text-base font-semibold">Daily spend plan</h2>
        <LoadingBlock rows={2} />
      </section>
    );
  }

  if (!plan.hasData) {
    return (
      <section className="card-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Daily spend plan</h2>
          <DailyPlanSettings suggested={plan.suggestedLimit} suggestedByCategory={suggestedByCategory} />
        </div>
        <EmptyState
          title="Not enough history yet"
          description="Log a few expenses and I'll suggest a daily limit from your own spending pattern."
          icon={Sparkles}
        />
      </section>
    );
  }

  const over = plan.remainingToday < 0;
  const tone = plan.percentUsed >= 100 ? "destructive" : plan.percentUsed >= 75 ? "warning" : "success";

  return (
    <section className="card-surface p-4">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Gauge className="h-4 w-4 shrink-0 text-primary" /> Daily spend plan
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {plan.isCustom
              ? `Your own limit · suggestion ${formatMoney(plan.suggestedLimit, currency)}/day`
              : `From the last ${plan.days} days · avg ${formatMoney(Math.round(plan.avgPerDay), currency)}/day`}
          </p>
        </div>
        <DailyPlanSettings suggested={plan.suggestedLimit} suggestedByCategory={suggestedByCategory} />
      </div>

      <div className="rounded-xl bg-muted/50 p-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Limit for today
            </p>
            <p className="font-display text-2xl font-bold tabular-nums">
              {formatMoney(plan.dailyLimit, currency)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground">Spent today</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatMoney(plan.todaySpent, currency)}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar percent={plan.percentUsed} tone={tone} />
          <p className={`mt-1.5 text-xs font-medium ${over ? "text-destructive" : "text-muted-foreground"}`}>
            {over
              ? `Over by ${formatMoney(Math.abs(plan.remainingToday), currency)}`
              : `${formatMoney(plan.remainingToday, currency)} left today`}
          </p>
        </div>
      </div>

      {plan.topCategory ? (
        <p className="mt-3 text-xs text-muted-foreground">
          You spend most on <span className="font-semibold text-foreground">{plan.topCategory.category}</span>{" "}
          ({Math.round(plan.topCategory.share * 100)}% of your spending).
        </p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {plan.categories.slice(0, 8).map((c) => {
          const percent = c.perDay ? Math.round((c.todaySpent / c.perDay) * 100) : 0;
          return (
            <li key={c.category} className="rounded-xl bg-muted/40 px-3 py-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium">{c.category}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatMoney(c.todaySpent, currency)} / {formatMoney(c.perDay, currency)}
                </span>
              </div>
              <div className="mt-1.5">
                <ProgressBar percent={percent} tone={percent >= 100 ? "destructive" : "primary"} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
