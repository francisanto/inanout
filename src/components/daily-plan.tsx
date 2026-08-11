import { Gauge, Sparkles } from "lucide-react";
import { EmptyState, LoadingBlock, ProgressBar } from "@/components/kit";
import { useDailyPlan } from "@/hooks/use-daily-plan";
import { formatMoney } from "@/lib/finance";

/** Spend analysis + a recommended daily limit derived from past categories. */
export function DailyPlanCard({ currency }: { currency: string }) {
  const plan = useDailyPlan();

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
        <h2 className="mb-4 text-base font-semibold">Daily spend plan</h2>
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
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Daily spend plan</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            From the last {plan.days} days · avg {formatMoney(Math.round(plan.avgPerDay), currency)}/day
          </p>
        </div>
        <Gauge className="h-4 w-4 shrink-0 text-primary" />
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
        {plan.categories.slice(0, 5).map((c) => {
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
