import type { ReactNode } from "react";
import {
  ArrowLeftRight,
  Banknote,
  Bus,
  CreditCard,
  Film,
  GraduationCap,
  HandCoins,
  Heart,
  Home,
  Lightbulb,
  Receipt,
  Repeat,
  ShoppingBag,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TX_TYPE_LABELS, format, formatMoney, parseDate } from "@/lib/finance";
import type { Transaction } from "@/lib/types";

const CATEGORY_ICONS: { match: string[]; icon: LucideIcon }[] = [
  { match: ["food", "lunch", "dinner", "grocer", "restaurant", "snack"], icon: Utensils },
  { match: ["travel", "transport", "fuel", "cab", "bus", "train", "flight"], icon: Bus },
  { match: ["shop", "cloth", "amazon"], icon: ShoppingBag },
  { match: ["bill", "utilit", "electric", "water", "internet", "recharge"], icon: Lightbulb },
  { match: ["entertain", "movie", "game", "subscription", "netflix"], icon: Film },
  { match: ["educat", "course", "book", "school", "college"], icon: GraduationCap },
  { match: ["health", "medic", "doctor", "pharma", "gym"], icon: Heart },
  { match: ["rent", "home", "house", "maintenance"], icon: Home },
];

function iconFor(t: Transaction): LucideIcon {
  if (t.type === "transfer") return ArrowLeftRight;
  if (t.type === "income") return Banknote;
  if (t.type === "borrowed" || t.type === "lending") return HandCoins;
  if (t.type === "repayment") return Repeat;
  if (t.type === "debt_payment") return CreditCard;
  const label = `${t.category ?? ""} ${t.description ?? ""}`.toLowerCase();
  const hit = CATEGORY_ICONS.find((c) => c.match.some((m) => label.includes(m)));
  return hit?.icon ?? Receipt;
}

const isInflow = (t: Transaction) => t.type === "income" || t.type === "borrowed";

/** One clean, scannable transaction row. */
export function TxRow({
  tx: t,
  currency,
  actions,
  showType = true,
}: {
  tx: Transaction;
  currency: string;
  actions?: ReactNode;
  showType?: boolean;
}) {
  const Icon = iconFor(t);
  const inflow = isInflow(t);
  const title = t.description || t.category || TX_TYPE_LABELS[t.type] || "Entry";
  const meta = [
    format(parseDate(t.date), "dd MMM"),
    t.description && t.category ? t.category : null,
    showType && t.type !== "expense" && t.type !== "income" ? TX_TYPE_LABELS[t.type] : null,
    t.payment_method,
  ].filter(Boolean) as string[];

  return (
    <li className="flex items-center gap-3 px-3 py-3 sm:px-4">
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full",
          inflow ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta.join(" · ")}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            inflow ? "text-success" : "text-foreground",
          )}
        >
          {inflow ? "+" : "−"}
          {formatMoney(Number(t.amount), currency)}
        </span>
        {actions}
      </div>
    </li>
  );
}

export function TxList({ children }: { children: ReactNode }) {
  return <ul className="card-surface divide-y divide-border">{children}</ul>;
}
