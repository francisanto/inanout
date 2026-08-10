import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Plus, Share, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
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
} from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import {
  useAccounts,
  useCurrency,
  useDeleteRow,
  useInvalidateAll,
  useProfile,
  useReminders,
  useSaveRow,
} from "@/hooks/use-data";
import { useAccountBalances } from "@/hooks/use-summary";
import { ACCOUNT_TYPES, CURRENCIES, formatMoney } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — In&out" },
      { name: "description", content: "Manage your profile, salary schedule, accounts and reminders." },
      { property: "og:title", content: "Settings — In&out" },
      { property: "og:description", content: "Profile, salary automation, accounts and reminders." },
    ],
  }),
  component: SettingsPage,
});

const REMINDER_LABELS: Record<string, string> = {
  emi: "EMI due",
  loan_payment: "Loan payment",
  borrowed_repayment: "Money I borrowed",
  lending_collection: "Money lent out",
  salary_date: "Salary credited",
  budget_warnings: "Spending warnings",
  savings_goals: "Savings goals",
};

const HIDDEN_REMINDERS = new Set(["recurring_bills"]);

function ProfileCard() {
  const { data: profile, isLoading } = useProfile();
  const invalidate = useInvalidateAll();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    currency: "INR",
    salary_amount: "",
    salary_day: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      currency: profile.currency ?? "INR",
      salary_amount: profile.salary_amount ? String(profile.salary_amount) : "",
      salary_day: profile.salary_day ? String(profile.salary_day) : "",
    });
  }, [profile]);

  const save = async () => {
    if (!profile) return;
    const day = form.salary_day ? Number(form.salary_day) : null;
    if (day !== null && (day < 1 || day > 31)) {
      toast.error("Salary day must be between 1 and 31.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim() || null,
          currency: form.currency,
          salary_amount: form.salary_amount ? Number(form.salary_amount) : 0,
          salary_day: day,
        } as never)
        .eq("id", profile.id);
      if (error) throw error;
      invalidate();
      toast.success("Profile updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <LoadingBlock rows={3} />;

  return (
    <section className="card-surface space-y-4 p-4 sm:p-5">
      <h2 className="text-base font-semibold">Profile &amp; salary</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input value={profile?.email ?? ""} readOnly disabled />
        </Field>
        <Field label="Currency">
          <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CURRENCIES).map(([code, c]) => (
                <SelectItem key={code} value={code}>
                  {code} {c.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Monthly salary">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.salary_amount}
            onChange={(e) => setForm({ ...form, salary_amount: e.target.value })}
          />
        </Field>
        <Field
          label="Salary day of month"
          hint="Income is added automatically each month on this day."
          className="sm:col-span-2"
        >
          <Input
            type="number"
            min="1"
            max="31"
            value={form.salary_day}
            onChange={(e) => setForm({ ...form, salary_day: e.target.value })}
          />
        </Field>
      </div>
      <Button onClick={() => void save()} disabled={busy}>
        Save changes
      </Button>
    </section>
  );
}

function AccountForm() {
  const save = useSaveRow("accounts", "Account added");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "bank", opening_balance: "" });

  const submit = async () => {
    await save.mutateAsync({
      name: form.name.trim() || "Account",
      type: form.type,
      opening_balance: Number(form.opening_balance || 0),
    });
    setOpen(false);
    setForm({ name: "", type: "bank", opening_balance: "" });
  };

  return (
    <FormDialog
      trigger={
        <Button size="sm" variant="secondary">
          <Plus className="h-4 w-4" /> Add account
        </Button>
      }
      open={open}
      onOpenChange={setOpen}
      title="Add account"
      onSubmit={submit}
      submitting={save.isPending}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="Type">
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Opening balance" className="sm:col-span-2">
          <Input
            type="number"
            step="0.01"
            value={form.opening_balance}
            onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
          />
        </Field>
      </div>
    </FormDialog>
  );
}

function AccountsCard() {
  const currency = useCurrency();
  const accounts = useAccounts();
  const balances = useAccountBalances();
  const del = useDeleteRow("accounts", "Account deleted");
  const rows = accounts.data ?? [];

  return (
    <section className="card-surface p-4 sm:p-5">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="truncate text-base font-semibold">Accounts</h2>
        <AccountForm />
      </div>
      {accounts.isLoading ? (
        <LoadingBlock rows={2} />
      ) : rows.length === 0 ? (
        <EmptyState title="No accounts" description="Add cash, bank or UPI accounts." icon={Wallet} />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.name}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {a.type.replace("_", " ")} · opening {formatMoney(Number(a.opening_balance), currency)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-sm font-semibold tabular-nums">
                  {formatMoney(balances.get(a.id) ?? Number(a.opening_balance), currency)}
                </span>
                <ConfirmDelete
                  onConfirm={() => del.mutate(a.id)}
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
    </section>
  );
}

function RemindersCard() {
  const reminders = useReminders();
  const save = useSaveRow("reminders", "Reminder updated");
  const rows = (reminders.data ?? []).filter((r) => !HIDDEN_REMINDERS.has(r.type));

  return (
    <section className="card-surface p-4 sm:p-5">
      <h2 className="mb-4 text-base font-semibold">Reminders</h2>
      {reminders.isLoading ? (
        <LoadingBlock rows={2} />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0 truncate text-sm">{REMINDER_LABELS[r.type] ?? r.type}</span>
              <Switch
                checked={r.enabled}
                onCheckedChange={(v) => save.mutate({ id: r.id, enabled: v })}
                aria-label={r.type}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}


interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function InstallAppCard() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") toast.success("In&out added to your home screen");
    setDeferred(null);
  };

  return (
    <section className="card-surface p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Share className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Add to home screen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {installed
              ? "You're using In&out like an app. Open it from your home screen anytime."
              : "Install In&out on your phone for quick access — works offline after the first load."}
          </p>
          {!installed && deferred ? (
            <Button className="mt-3" size="sm" onClick={() => void install()}>
              Install app
            </Button>
          ) : null}
          {!installed && !deferred ? (
            <p className={cn("mt-3 text-xs text-muted-foreground")}>
              On iPhone: tap Share in Safari, then “Add to Home Screen”. On Android: use the browser menu or the Install button when it appears.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Profile, accounts and reminders." />
      <InstallAppCard />
      <ProfileCard />
      <AccountsCard />
      <RemindersCard />
      <Button variant="outline" className="w-full" onClick={() => void signOut()}>
        <LogOut className="h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}
