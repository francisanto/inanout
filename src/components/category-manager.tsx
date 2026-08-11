import { useState } from "react";
import { Check, Pencil, Tags, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/kit";
import { useCategories, useDeleteRow, useSaveRow } from "@/hooks/use-data";

/** Add, rename and remove categories in one place. */
export function CategoryManager({
  kind,
  trigger,
}: {
  kind: "expense" | "income";
  trigger?: React.ReactNode;
}) {
  const categories = useCategories();
  const save = useSaveRow("categories", "Category saved");
  const del = useDeleteRow("categories", "Category removed");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const list = (categories.data ?? []).filter((c) => c.kind === kind);
  const label = kind === "expense" ? "Categories" : "Sources";

  const add = async () => {
    const value = name.trim();
    if (!value) return;
    await save.mutateAsync({ name: value, kind });
    setName("");
  };

  const rename = async (id: string) => {
    const value = editingName.trim();
    if (!value) return;
    await save.mutateAsync({ id, name: value });
    setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Tags className="h-4 w-4" /> {label}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>Add new ones, rename or remove what you don't use.</DialogDescription>
        </DialogHeader>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === "expense" ? "New category" : "New source"}
          />
          <Button type="submit" size="sm" disabled={save.isPending}>
            Add
          </Button>
        </form>

        <ul className="divide-y divide-border rounded-xl border border-border">
          {list.length === 0 ? (
            <li className="p-3 text-sm text-muted-foreground">Nothing yet.</li>
          ) : (
            list.map((c) => (
              <li key={c.id} className="flex items-center gap-2 px-3 py-2">
                {editingId === c.id ? (
                  <>
                    <Input
                      className="h-8 flex-1"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => void rename(c.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditingName(c.name);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <ConfirmDelete
                      description="Existing transactions keep their category name."
                      onConfirm={() => del.mutate(c.id)}
                      trigger={
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                  </>
                )}
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
