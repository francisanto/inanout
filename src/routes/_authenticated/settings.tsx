import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, CreditCard, LogOut, Pencil, Plus, Share, Trash2, User, Wallet, X } from "lucide-react";
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
  usePaymentMethods,
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

/** A settings row that opens a dialog. */
function SettingRow({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: typeof User;
  title: string;
  subtitle: string;
  action: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function ProfileDialog() {
  const { data: profile } = useProfile();
  const accounts = useAccounts();
  const invalidate = useInvalidateAll();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    currency: "INR",
    salary_amount: "",
    salary_day: "",
    salary_account_id: "",
  });

  useEffect(() => {
    if (!open || !profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      currency: profile.currency ?? "INR",
      salary_amount: profile.salary_amount ? String(profile.salary_amount) : "",
      salary_day: profile.salary_day ? String(profile.salary_day) : "",
      salary_account_id: profile.salary_account_id ?? "",
    });
  }, [open, profile]);

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
          salary_account_id: form.salary_account_id || null,
        } as never)
        .eq("id", profile.id);
      if (error) throw error;
      invalidate();
      toast.success("Profile updated");
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog
      compact
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button size="sm" variant="outline">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      }
      title="Edit profile"
      onSubmit={save}
      submitting={busy}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" className="col-span-2">
          <Input
            className="h-10"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </Field>
        <Field label="Email" className="col-span-2">
          <Input className="h-10" value={profile?.email ?? ""} readOnly disabled />
        </Field>
        <Field label="Currency">
          <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
            <SelectTrigger className="h-10">
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
            className="h-10"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={form.salary_amount}
            onChange={(e) => setForm({ ...form, salary_amount: e.target.value })}
          />
        </Field>
        <Field label="Salary day">
          <Input
            className="h-10"
            type="number"
            min="1"
            max="31"
            value={form.salary_day}
            onChange={(e) => setForm({ ...form, salary_day: e.target.value })}
          />
        </Field>
        <Field label="Credit to account">
          <Select
            value={form.salary_account_id}
            onValueChange={(v) => setForm({ ...form, salary_account_id: v })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Choose" />
            </SelectTrigger>
            <SelectContent>
              {(accounts.data ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        Income is added automatically each month on the salary day, into the account you pick.
      </p>
    </FormDialog>
  );
}

function RemindersDialog() {
  const reminders = useReminders();
  const save = useSaveRow("reminders", "Reminder updated");
  const [open, setOpen] = useState(false);
  const rows = (reminders.data ?? []).filter((r) => !HIDDEN_REMINDERS.has(r.type));

  return (
    <FormDialog
      compact
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button size="sm" variant="outline">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      }
      title="Reminders"
      description="Choose what you want to be reminded about."
      submitLabel="Done"
      onSubmit={() => setOpen(false)}
    >
      {reminders.isLoading ? (
        <LoadingBlock rows={2} />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border px-3">
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
    </FormDialog>
  );
}

function PaymentMethodsDialog() {
  const { data: profile } = useProfile();
  const current = usePaymentMethods();
  const save = useSaveRow("profiles", "Payment methods updated");
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!open) return;
    setList(current);
    setDraft("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (list.some((m) => m.toLowerCase() === value.toLowerCase())) {
      toast.error("That method already exists.");
      return;
    }
    setList([...list, value]);
    setDraft("");
  };

  const submit = async () => {
    if (!profile?.id) return;
    if (list.length === 0) {
      toast.error("Keep at least one payment method.");
      return;
    }
    await save.mutateAsync({ id: profile.id, payment_methods: list });
    setOpen(false);
  };

  return (
    <FormDialog
      compact
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button size="sm" variant="outline">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      }
      title="Payment methods"
      description="These appear when you add an expense or income."
      onSubmit={submit}
      submitting={save.isPending}
    >
      <div className="flex gap-2">
        <Input
          className="h-10"
          value={draft}
          placeholder="e.g. Net banking"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" size="sm" variant="secondary" onClick={add}>
          Add
        </Button>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {list.map((m, i) => (
          <li key={`${m}-${i}`} className="flex items-center gap-2 px-3 py-2">
            <Input
              className="h-9 flex-1"
              value={m}
              onChange={(e) => {
                const next = [...list];
                next[i] = e.target.value;
                setList(next);
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setList(list.filter((_, idx) => idx !== i))}
            >
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </FormDialog>
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
      compact
      trigger={
        <Button size="sm" variant="secondary">
          <Plus className="h-4 w-4" /> Add
        </Button>
      }
      open={open}
      onOpenChange={setOpen}
      title="Add account"
      onSubmit={submit}
      submitting={save.isPending}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" className="col-span-2">
          <Input
            className="h-10"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Type">
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
            <SelectTrigger className="h-10">
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
        <Field label="Opening balance">
          <Input
            className="h-10"
            type="number"
            step="0.01"
            inputMode="decimal"
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
  const { data: profile, isLoading } = useProfile();
  const methods = usePaymentMethods();
  const reminders = useReminders();
  const enabledCount = (reminders.data ?? []).filter(
    (r) => r.enabled && !HIDDEN_REMINDERS.has(r.type),
  ).length;

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Profile, payments, accounts and reminders." />
      <InstallAppCard />

      <section className="card-surface divide-y divide-border p-4 sm:p-5">
        {isLoading ? (
          <LoadingBlock rows={2} />
        ) : (
          <>
            <SettingRow
              icon={User}
              title={profile?.full_name || "Your profile"}
              subtitle={`${profile?.currency ?? "INR"} · salary ${
                profile?.salary_amount ? formatMoney(Number(profile.salary_amount), profile.currency) : "not set"
              }${profile?.salary_day ? ` on day ${profile.salary_day}` : ""}`}
              action={<ProfileDialog />}
            />
            <SettingRow
              icon={CreditCard}
              title="Payment methods"
              subtitle={methods.join(", ")}
              action={<PaymentMethodsDialog />}
            />
            <SettingRow
              icon={Bell}
              title="Reminders"
              subtitle={`${enabledCount} reminder${enabledCount === 1 ? "" : "s"} on`}
              action={<RemindersDialog />}
            />
          </>
        )}
      </section>

      <AccountsCard />

      <Button variant="outline" className="w-full" onClick={() => void signOut()}>
        <LogOut className="h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}
