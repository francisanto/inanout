import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type {
  Account,
  Borrowing,
  Budget,
  Category,
  Debt,
  DebtPayment,
  Lending,
  Person,
  Profile,
  RecurringPayment,
  Reminder,
  SavingsContribution,
  SavingsGoal,
  Transaction,
} from "@/lib/types";

type AnyRow = Record<string, unknown>;

/** Any table in the finance schema. */
export type TableName =
  | "profiles"
  | "accounts"
  | "categories"
  | "people"
  | "transactions"
  | "borrowings"
  | "lendings"
  | "debts"
  | "debt_payments"
  | "recurring_payments"
  | "budgets"
  | "savings_goals"
  | "savings_contributions"
  | "reminders";

async function fetchRows<T>(table: TableName, order?: { column: string; asc?: boolean }): Promise<T[]> {
  let q = supabase.from(table).select("*");
  if (order) q = q.order(order.column, { ascending: order.asc ?? false });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as T[];
}

function useRows<T>(table: TableName, order?: { column: string; asc?: boolean }) {
  return useQuery({
    queryKey: ["data", table],
    queryFn: () => fetchRows<T>(table, order),
    staleTime: 15_000,
  });
}

export const useAccounts = () => useRows<Account>("accounts", { column: "created_at", asc: true });
export const useCategories = () => useRows<Category>("categories", { column: "name", asc: true });
export const usePeople = () => useRows<Person>("people", { column: "name", asc: true });
export const useTransactions = () => useRows<Transaction>("transactions", { column: "date" });
export const useBorrowings = () => useRows<Borrowing>("borrowings", { column: "date" });
export const useLendings = () => useRows<Lending>("lendings", { column: "date" });
export const useDebts = () => useRows<Debt>("debts", { column: "created_at" });
export const useDebtPayments = () => useRows<DebtPayment>("debt_payments", { column: "date" });
export const useRecurring = () =>
  useRows<RecurringPayment>("recurring_payments", { column: "next_due_date", asc: true });
export const useBudgets = () => useRows<Budget>("budgets", { column: "month" });
export const useGoals = () => useRows<SavingsGoal>("savings_goals", { column: "created_at" });
export const useContributions = () =>
  useRows<SavingsContribution>("savings_contributions", { column: "date" });
export const useReminders = () => useRows<Reminder>("reminders", { column: "type", asc: true });

export function useProfile() {
  return useQuery({
    queryKey: ["data", "profiles"],
    queryFn: async (): Promise<Profile | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Profile) ?? null;
    },
  });
}

export function useCurrency() {
  const { data } = useProfile();
  return data?.currency ?? "INR";
}

/** The user's editable payment-method list, falling back to the defaults. */
export function usePaymentMethods(): string[] {
  const { data } = useProfile();
  const list = (data?.payment_methods ?? []).filter((m) => m && m.trim());
  return list.length ? list : [...PAYMENT_METHODS];
}


function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["data"] });
}

/** Insert or update a row; user_id is attached automatically on insert. */
export function useSaveRow(table: TableName, successMessage = "Saved") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: AnyRow & { id?: string }) => {
      const { id, ...rest } = values;
      if (id) {
        const { error } = await supabase.from(table).update(rest as never).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You must be signed in.");
      const { data, error } = await supabase
        .from(table)
        .insert({ ...rest, user_id: auth.user.id } as never)
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success(successMessage);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteRow(table: TableName, successMessage = "Deleted") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success(successMessage);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Ensures a person exists by name and returns its id. */
export async function ensurePerson(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: existing } = await supabase
    .from("people")
    .select("id")
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;
  const { data, error } = await supabase
    .from("people")
    .insert({ name: trimmed, user_id: auth.user.id } as never)
    .select("id")
    .single();
  if (error) return null;
  return (data as { id: string }).id;
}

/** Records a ledger transaction directly (used by settlement flows). */
export async function addTransaction(values: AnyRow) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("You must be signed in.");
  const { error } = await supabase
    .from("transactions")
    .insert({ ...values, user_id: auth.user.id } as never);
  if (error) throw error;
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => invalidateAll(qc);
}
