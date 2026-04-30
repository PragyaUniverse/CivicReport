import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type A = { id: string; title: string; title_hi: string | null; body: string; body_hi: string | null; category: string; created_at: string; expires_at: string | null };

export function AnnouncementBanner() {
  const { lang } = useI18n();
  const [items, setItems] = useState<A[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => JSON.parse(localStorage.getItem("dismissed_ann") || "[]"));

  useEffect(() => {
    supabase
      .from("announcements")
      .select("*")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setItems((data ?? []) as A[]));
  }, []);

  const visible = items.filter((i) => !dismissed.includes(i.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem("dismissed_ann", JSON.stringify(next));
  };

  return (
    <div className="mb-4 space-y-2">
      {visible.map((a) => {
        const title = lang === "hi" && a.title_hi ? a.title_hi : a.title;
        const body = lang === "hi" && a.body_hi ? a.body_hi : a.body;
        return (
          <div key={a.id} className="flex items-start gap-3 rounded-xl border border-info/30 bg-info/10 p-3">
            <Megaphone className="h-5 w-5 flex-shrink-0 text-info mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-foreground/80 mt-0.5">{body}</p>
            </div>
            <button onClick={() => dismiss(a.id)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
