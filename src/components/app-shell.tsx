import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  CreditCard,
  Gauge,
  LayoutDashboard,

  ListOrdered,
  LogOut,
  Menu,
  PiggyBank,
  Settings,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSalaryAutoPost } from "@/hooks/use-salary";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/expenses", label: "Expenses", icon: TrendingDown },
  { to: "/income", label: "Income", icon: TrendingUp },
  { to: "/daily-plan", label: "Daily plan", icon: Gauge },
  { to: "/debts", label: "Debts", icon: CreditCard },
  { to: "/lending", label: "Lending", icon: ArrowLeftRight },
  { to: "/savings", label: "Savings", icon: PiggyBank },
  { to: "/transactions", label: "Transactions", icon: ListOrdered },
  { to: "/people", label: "People", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const MOBILE_TAB_PATHS = new Set(["/dashboard", "/expenses", "/transactions", "/debts", "/settings"]);

/** Pages reachable from the mobile “More” screen (not in the bottom tab bar). */
export const MOBILE_MORE_ITEMS = NAV_ITEMS.filter(
  (item) => !MOBILE_TAB_PATHS.has(item.to),
);

/** Sidebar items for the mobile drawer: hides pages already in the bottom bar. */
const MOBILE_SHEET_ITEMS = NAV_ITEMS.filter((item) => item.to !== "/settings");


const MOBILE_ITEMS = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/expenses", label: "Expenses", icon: TrendingDown },
  { to: "/transactions", label: "Activity", icon: ListOrdered },
  { to: "/debts", label: "Debts", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-lg font-bold tracking-tight", className)}>
      In<span className="text-primary">&amp;</span>out
    </span>
  );
}

function useSignOut() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const signOut = useSignOut();
  useSalaryAutoPost();

  return (
    <div className="min-h-screen w-full bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Wallet className="h-4.5 w-4.5" />
          </span>
          <BrandMark className="text-sidebar-foreground" />
        </div>
        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-1 pb-6">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
        <div className="border-t border-sidebar-border p-3">
          <Button variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground/80" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-72 flex-col p-0">
                <div className="flex h-16 items-center gap-2 border-b border-border px-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <Wallet className="h-4.5 w-4.5" />
                  </span>
                  <BrandMark />
                </div>
                <ScrollArea className="flex-1 px-3 py-4">
                  <nav className="space-y-1">
                    {NAV_ITEMS.map((item) => {
                      const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                      return (
                        <SheetClose asChild key={item.to}>
                          <Link
                            to={item.to}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                              active
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                            )}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        </SheetClose>
                      );
                    })}
                  </nav>
                </ScrollArea>
                <div className="border-t border-border p-3">
                  <Button variant="ghost" className="w-full justify-start gap-3" onClick={signOut}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <BrandMark />
          </div>
          <Button size="sm" variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:pb-12">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        {MOBILE_ITEMS.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
