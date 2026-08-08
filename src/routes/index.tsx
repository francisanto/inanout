import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  HandCoins,
  PiggyBank,
  Repeat,
  Target,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "In&out — Track income, expenses, debts and savings" },
      {
        name: "description",
        content:
          "In&out is a private personal finance dashboard for income, expenses, budgets, borrowings, lending, EMIs, recurring bills and savings goals in ₹.",
      },
      { property: "og:title", content: "In&out — Personal finance, all in one place" },
      {
        property: "og:description",
        content: "Budgets, borrowings, lending, debts and savings goals calculated from your real data.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Wallet, title: "Live balance", body: "Balance, net worth and cash flow calculated from every transaction." },
  { icon: Target, title: "Budgets that warn you", body: "Category budgets with progress bars and overspend alerts." },
  { icon: HandCoins, title: "Borrow & lend tracking", body: "Partial repayments, due dates and per-person history." },
  { icon: CreditCard, title: "Debts & EMIs", body: "Loans, cards and BNPL with repayment progress." },
  { icon: Repeat, title: "Recurring bills", body: "Rent, subscriptions and EMIs with auto next-due dates." },
  { icon: PiggyBank, title: "Savings goals", body: "Fund goals and watch the percentage climb." },
];

function Landing() {
  const { session, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <BrandMark className="text-xl" />
        {loading ? null : session ? (
          <Button asChild size="sm">
            <Link to="/dashboard">Open dashboard</Link>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <section className="py-14 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Personal finance manager
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight sm:text-5xl">
            Money <span className="text-gradient-brand">in</span> and money{" "}
            <span className="text-gradient-brand">out</span>, finally in one place.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground">
            Track salary and expenses, split budgets by category, follow who owes you, clear EMIs and
            fund savings goals — every number calculated from your own records.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={session ? "/dashboard" : "/auth"}>
                {session ? "Open dashboard" : "Get started free"} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="card-surface p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </section>

        <section className="card-surface mt-12 flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Start with today's spending</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add one expense and In&amp;out builds your dashboard around it.
            </p>
          </div>
          <Button asChild>
            <Link to={session ? "/dashboard" : "/auth"}>
              <BarChart3 className="h-4 w-4" /> Continue
            </Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
