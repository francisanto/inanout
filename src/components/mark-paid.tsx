import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { addTransaction, useInvalidateAll } from "@/hooks/use-data";
import { toISO } from "@/lib/finance";

/** Marks a borrowing/lending fully settled in one tap. */
export function MarkPaidButton({
  kind,
  recordId,
  personName,
  remaining,
  label = "Mark paid",
}: {
  kind: "borrowing" | "lending";
  recordId: string;
  personName: string;
  remaining: number;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const invalidate = useInvalidateAll();

  const run = async () => {
    setBusy(true);
    try {
      const table = kind === "borrowing" ? "borrowings" : "lendings";
      const column = kind === "borrowing" ? "amount_repaid" : "amount_received";
      const { data: current, error: readError } = await supabase
        .from(table)
        .select("*")
        .eq("id", recordId)
        .single();
      if (readError) throw readError;
      const row = current as unknown as Record<string, number>;
      const { error } = await supabase
        .from(table)
        .update({ [column]: Number(row["amount"] ?? 0) } as never)
        .eq("id", recordId);
      if (error) throw error;
      await addTransaction({
        type: "repayment",
        amount: remaining,
        date: toISO(new Date()),
        category: kind === "borrowing" ? "Borrowing repaid" : "Lending received",
        description:
          kind === "borrowing" ? `Repaid ${personName} in full` : `${personName} paid back in full`,
        ...(kind === "borrowing" ? { borrowing_id: recordId } : { lending_id: recordId }),
      });
      invalidate();
      toast.success(kind === "borrowing" ? "Marked as repaid" : "Marked as paid back");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={() => void run()}>
      <Check className="h-4 w-4" /> {label}
    </Button>
  );
}
