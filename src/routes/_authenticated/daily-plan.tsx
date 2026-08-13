import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/kit";
import { DailyPlanCard } from "@/components/daily-plan";
import { useCurrency } from "@/hooks/use-data";

export const Route = createFileRoute("/_authenticated/daily-plan")({
  head: () => ({
    meta: [
      { title: "Daily plan — In&out" },
      {
        name: "description",
        content: "A daily spending limit built from your own history, with per-category quotas you can customise.",
      },
      { property: "og:title", content: "Daily plan — In&out" },
      { property: "og:description", content: "Your recommended daily spending limit and category quotas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DailyPlanPage;
});

function DailyPlanPage() {
  const currency = useCurrency();
  return (
    <div className="space-y-5">
      <PageHeader
        title="Daily plan"
        description="How much you can spend today, based on your own spending pattern."
      />
      <DailyPlanCard currency={currency} />
    </div>
  );
}
