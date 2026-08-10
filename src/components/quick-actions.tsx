import { useState } from "react";
import { ArrowLeftRight, HandCoins, Minus, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormDialog } from "@/components/kit";
import {
  addTransaction,
  ensurePerson,
  useAccounts,
  useCategories,
  useDebts,
  useInvalidateAll,
  useSaveRow,
} from "@/hooks/use-data";
import { PAYMENT_METHODS, toISO } from "@/lib/finance";
import { supabase } from "@/integrations/supabase/client";
import type { Transaction } from "@/lib/types";

const today = () => toISO(new Date());

function positive(value: string) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

/** Expense / income create-and-edit dialog. */
export function EntryDialog({
  kind,
  trigger,
  existing,
  open,
  onOpenChange,
}: {
  kind: "expense" | "income";
  trigger?: React.ReactNode;
  existing?: Transaction;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const accounts = useAccounts();
  const categories = useCategories();
  const save = useSaveRow("transactions", kind === "expense" ? "Expense saved" : "Income saved");
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;

  const blank = () => ({
    amount: existing ? String(existing.amount) : "",
    category: existing?.category ?? "",
    source: existing?.source ?? (kind === "income" ? "Salary" : ""),
    date: existing?.date ?? today(),
    payment_method: existing?.payment_method ?? "Cash",
    account_id: existing?.account_id ?? "",
    description: existing?.description ?? "",
    notes: existing?.notes ?? "",
  });

  const [form, setForm] = useState(blank);

  const setOpen = (next: boolean) => {
    if (!next) setForm(blank());
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  };

  const catList = (categories.data ?? []).filter((c) => c.kind === kind);


  const submit = async () => {
    if (!positive(form.amount)) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    if (!form.date) {
      toast.error("Pick a date.");
      return;
    }
    if (form.date > toISO(new Date(Date.now() + 86400000 * 365))) {
      toast.error("Date is too far ahead.");
      return;
    }
    await save.mutateAsync({
      ...(existing ? { id: existing.id } : {}),
      type: kind,
      amount: Number(form.amount),
      date: form.date,
      category: kind === "expense" ? form.category || "Other" : form.source || "Other",
      source: kind === "income" ? form.source || "Other" : null,
      payment_method: form.payment_method || null,
      account_id: form.account_id || null,
      description: form.description || null,
      notes: form.notes || null,
      is_recurring: false,
    });
    setOpen(false);
  };

  return (
    <FormDialog
      trigger={trigger}
      open={isOpen}
      onOpenChange={setOpen}
      title={`${existing ? "Edit" : "Add"} ${kind}`}
      description={
        kind === "expense" ? "Record money going out." : "Record salary, freelance or other income."
      }
      onSubmit={submit}
      submitting={save.isPending}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </Field>
        <Field label="Date">
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </Field>
        {kind === "expense" ? (
          <Field label="Category">
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose category" />
              </SelectTrigger>
              <SelectContent>
                {catList.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : (
          <Field label="Source">
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose source" />
              </SelectTrigger>
              <SelectContent>
                {catList.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label="Payment method">
          <Select
            value={form.payment_method}
            onValueChange={(v) => setForm({ ...form, payment_method: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Account">
          <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Choose account" />
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
        <Field label="Description">
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional"
          />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
        />
      </Field>
    </FormDialog>
  );
}

/** Borrowed money (I owe someone) */
export function BorrowDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const invalidate = useInvalidateAll();
  const [form, setForm] = useState({
    person_name: "",
    amount: "",
    date: today(),
    due_date: "",
    notes: "",
  });

  const submit = async () => {
    if (!form.person_name.trim()) {
      toast.error("Who did you borrow from?");
      return;
    }
    if (!positive(form.amount)) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in first.");
      const personId = await ensurePerson(form.person_name);
      const { data, error } = await supabase
        .from("borrowings")
        .insert({
          user_id: auth.user.id,
          person_id: personId,
          person_name: form.person_name.trim(),
          amount: Number(form.amount),
          date: form.date,
          due_date: form.due_date || null,
          notes: form.notes || null,
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      await addTransaction({
        type: "borrowed",
        amount: Number(form.amount),
        date: form.date,
        category: "Borrowed",
        description: `Borrowed from ${form.person_name.trim()}`,
        person_id: personId,
        borrowing_id: (data as { id: string }).id,
      });
      invalidate();
      toast.success("Borrowing recorded");
      setOpen(false);
      setForm({ person_name: "", amount: "", date: today(), due_date: "", notes: "" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      trigger={trigger}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setForm({ person_name: "", amount: "", date: today(), due_date: "", notes: "" });
      }}
      title="Borrowed money"
      description="Money you took from someone and need to repay."
      onSubmit={submit}
      submitting={saving}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Person">
          <Input
            value={form.person_name}
            onChange={(e) => setForm({ ...form, person_name: e.target.value })}
            placeholder="Rahul"
            required
          />
        </Field>
        <Field label="Amount borrowed">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </Field>
        <Field label="Date borrowed">
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </Field>
        <Field label="Due date">
          <Input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
    </FormDialog>
  );
}

/** Lent money (someone owes me) */
export function LendDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const invalidate = useInvalidateAll();
  const [form, setForm] = useState({
    person_name: "",
    amount: "",
    date: today(),
    expected_return_date: "",
    notes: "",
  });

  const submit = async () => {
    if (!form.person_name.trim()) {
      toast.error("Who did you lend to?");
      return;
    }
    if (!positive(form.amount)) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in first.");
      const personId = await ensurePerson(form.person_name);
      const { data, error } = await supabase
        .from("lendings")
        .insert({
          user_id: auth.user.id,
          person_id: personId,
          person_name: form.person_name.trim(),
          amount: Number(form.amount),
          date: form.date,
          expected_return_date: form.expected_return_date || null,
          notes: form.notes || null,
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      await addTransaction({
        type: "lending",
        amount: Number(form.amount),
        date: form.date,
        category: "Lent",
        description: `Lent to ${form.person_name.trim()}`,
        person_id: personId,
        lending_id: (data as { id: string }).id,
      });
      invalidate();
      toast.success("Lending recorded");
      setOpen(false);
      setForm({ person_name: "", amount: "", date: today(), expected_return_date: "", notes: "" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      trigger={trigger}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next)
          setForm({ person_name: "", amount: "", date: today(), expected_return_date: "", notes: "" });
      }}
      title="Lent money"
      description="Money you gave someone and expect back."
      onSubmit={submit}
      submitting={saving}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Person">
          <Input
            value={form.person_name}
            onChange={(e) => setForm({ ...form, person_name: e.target.value })}
            placeholder="Akhil"
            required
          />
        </Field>
        <Field label="Amount lent">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </Field>
        <Field label="Date">
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </Field>
        <Field label="Expected return">
          <Input
            type="date"
            value={form.expected_return_date}
            onChange={(e) => setForm({ ...form, expected_return_date: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
    </FormDialog>
  );
}

/** Settle part of a borrowing or lending. */
export function SettleDialog({
  kind,
  recordId,
  personName,
  remaining,
  trigger,
}: {
  kind: "borrowing" | "lending";
  recordId: string;
  personName: string;
  remaining: number;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const invalidate = useInvalidateAll();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());

  const submit = async () => {
    const value = Number(amount);
    if (!positive(amount)) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    if (value > remaining + 0.001) {
      toast.error("Amount is more than what remains.");
      return;
    }
    setSaving(true);
    try {
      const table = kind === "borrowing" ? "borrowings" : "lendings";
      const column = kind === "borrowing" ? "amount_repaid" : "amount_received";
      const { data: current, error: readError } = await supabase
        .from(table)
        .select("*")
        .eq("id", recordId)
        .single();
      if (readError) throw readError;
      const settled = Number((current as unknown as Record<string, number>)[column] ?? 0) + value;
      const { error } = await supabase
        .from(table)
        .update({ [column]: settled } as never)
        .eq("id", recordId);
      if (error) throw error;
      await addTransaction({
        type: "repayment",
        amount: value,
        date,
        category: kind === "borrowing" ? "Borrowing repaid" : "Lending received",
        description:
          kind === "borrowing" ? `Repaid ${personName}` : `Received back from ${personName}`,
        ...(kind === "borrowing" ? { borrowing_id: recordId } : { lending_id: recordId }),
      });
      invalidate();
      toast.success("Payment recorded");
      setOpen(false);
      setAmount("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      trigger={trigger}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setAmount("");
          setDate(today());
        }
      }}
      title={kind === "borrowing" ? `Repay ${personName}` : `Collect from ${personName}`}
      description={`Remaining: ${remaining.toFixed(2)}`}
      onSubmit={submit}
      submitting={saving}
      submitLabel="Record payment"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
    </FormDialog>
  );
}

/** Payment toward a credit/debt. */
export function DebtPaymentDialog({
  trigger,
  debtId,
}: {
  trigger?: React.ReactNode;
  debtId?: string;
}) {
  const debts = useDebts();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const invalidate = useInvalidateAll();
  const [form, setForm] = useState({ debt_id: debtId ?? "", amount: "", date: today(), notes: "" });

  const submit = async () => {
    if (!form.debt_id) {
      toast.error("Choose a debt.");
      return;
    }
    if (!positive(form.amount)) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    const debt = (debts.data ?? []).find((d) => d.id === form.debt_id);
    if (!debt) {
      toast.error("Debt not found.");
      return;
    }
    const remaining = Number(debt.total_amount) - Number(debt.paid_amount);
    const value = Number(form.amount);
    if (value > remaining + 0.001) {
      toast.error("Amount is more than the remaining debt.");
      return;
    }
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in first.");
      const { error } = await supabase.from("debt_payments").insert({
        user_id: auth.user.id,
        debt_id: form.debt_id,
        amount: value,
        date: form.date,
        notes: form.notes || null,
      } as never);
      if (error) throw error;
      const { error: updateError } = await supabase
        .from("debts")
        .update({ paid_amount: Number(debt.paid_amount) + value } as never)
        .eq("id", form.debt_id);
      if (updateError) throw updateError;
      await addTransaction({
        type: "debt_payment",
        amount: value,
        date: form.date,
        category: "Debt payment",
        description: `Payment for ${debt.name}`,
        debt_id: form.debt_id,
      });
      invalidate();
      toast.success("Payment recorded");
      setOpen(false);
      setForm({ debt_id: debtId ?? "", amount: "", date: today(), notes: "" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      trigger={trigger}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setForm({ debt_id: debtId ?? "", amount: "", date: today(), notes: "" });
      }}

      title="Record payment"
      description="Pay an EMI, credit card bill or loan instalment."
      onSubmit={submit}
      submitting={saving}
      submitLabel="Record payment"
    >
      <Field label="Debt">
        <Select value={form.debt_id} onValueChange={(v) => setForm({ ...form, debt_id: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a debt" />
          </SelectTrigger>
          <SelectContent>
            {(debts.data ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </Field>
        <Field label="Date">
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
    </FormDialog>
  );
}


export function QuickActions() {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <EntryDialog
        kind="expense"
        trigger={
          <Button size="sm">
            <Minus className="h-4 w-4" /> Add expense
          </Button>
        }
      />
      <EntryDialog
        kind="income"
        trigger={
          <Button size="sm" variant="secondary">
            <Plus className="h-4 w-4" /> Add income
          </Button>
        }
      />
      <BorrowDialog
        trigger={
          <Button size="sm" variant="outline">
            <HandCoins className="h-4 w-4" /> Borrowed
          </Button>
        }
      />
      <LendDialog
        trigger={
          <Button size="sm" variant="outline">
            <ArrowLeftRight className="h-4 w-4" /> Lent
          </Button>
        }
      />
      <DebtPaymentDialog
        trigger={
          <Button size="sm" variant="outline">
            <Receipt className="h-4 w-4" /> Payment
          </Button>
        }
      />
    </div>
  );
}
