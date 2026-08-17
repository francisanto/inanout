import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateAll, useProfile } from "@/hooks/use-data";
import { toISO } from "@/lib/finance";

function lastSalaryDate(day: number, now = new Date()): string {
  const clamp = (y: number, m: number) => {
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(day, daysInMonth));
  };
  const thisMonth = clamp(now.getFullYear(), now.getMonth());
  if (now >= thisMonth) return toISO(thisMonth);
  return toISO(clamp(now.getFullYear(), now.getMonth() - 1));
}

/**
 * Posts the monthly salary as an income entry once its day of month arrives.
 * Runs once per session and is idempotent via profiles.salary_last_posted.
 */
export function useSalaryAutoPost() {
  const { data: profile } = useProfile();
  const invalidate = useInvalidateAll();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !profile) return;
    const amount = Number(profile.salary_amount ?? 0);
    const day = profile.salary_day ?? null;
    if (!amount || !day) return;
    const due = lastSalaryDate(day);
    if (profile.salary_last_posted === due) return;
    done.current = true;
    void (async () => {
      const { error } = await supabase.from("transactions").insert({
        user_id: profile.id,
        type: "income",
        amount,
        date: due,
        category: "Salary",
        source: "Salary",
        account_id: profile.salary_account_id ?? null,
        description: "Monthly salary",
        is_recurring: true,
      } as never);

      if (error) return;
      await supabase
        .from("profiles")
        .update({ salary_last_posted: due } as never)
        .eq("id", profile.id);
      invalidate();
    })();
  }, [profile, invalidate]);
}

export { lastSalaryDate };
