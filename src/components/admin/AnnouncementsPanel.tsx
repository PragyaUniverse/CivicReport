import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useI18n } from "@/lib/i18n";

const schema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(5).max(1000),
});

type A = { id: string; title: string; title_hi: string | null; body: string; body_hi: string | null; expires_at: string | null; created_at: string };

export function AnnouncementsPanel() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [items, setItems] = useState<A[]>([]);
  const [title, setTitle] = useState("");
  const [titleHi, setTitleHi] = useState("");
  const [body, setBody] = useState("");
  const [bodyHi, setBodyHi] = useState("");
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as A[]);
  };
  useEffect(() => { load(); }, []);

  const post = async () => {
    if (!user) return;
    const parsed = schema.safeParse({ title, body });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.from("announcements").insert({
      author_id: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      title_hi: titleHi.trim() || null,
      body_hi: bodyHi.trim() || null,
      expires_at: expires ? new Date(expires).toISOString() : null,
    } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    setTitle(""); setTitleHi(""); setBody(""); setBodyHi(""); setExpires("");
    toast.success(t("ann.success"));
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <Card className="mb-6 shadow-soft">
        <CardHeader><h2 className="text-sm font-semibold">{t("ann.new")}</h2></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="t">{t("ann.fieldTitle")}</Label>
              <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder={t("ann.titlePh")} />
            </div>
            <div>
              <Label htmlFor="thi">{t("ann.fieldTitleHi")}</Label>
              <Input id="thi" value={titleHi} onChange={(e) => setTitleHi(e.target.value)} maxLength={160} placeholder={t("ann.titlePhHi")} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="b">{t("ann.fieldBody")}</Label>
              <Textarea id="b" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3} />
            </div>
            <div>
              <Label htmlFor="bhi">{t("ann.fieldBodyHi")}</Label>
              <Textarea id="bhi" value={bodyHi} onChange={(e) => setBodyHi(e.target.value)} maxLength={1000} rows={3} />
            </div>
          </div>
          <div>
            <Label htmlFor="e">{t("ann.expires")}</Label>
            <Input id="e" type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={post} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{t("ann.post")}</Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-sm font-semibold mb-2">{t("ann.posted")}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("ann.empty")}</p>
      ) : (
        <div className="space-y-2">
          {items.map((a) => {
            const showTitle = lang === "hi" && a.title_hi ? a.title_hi : a.title;
            const showBody = lang === "hi" && a.body_hi ? a.body_hi : a.body;
            return (
              <Card key={a.id} className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{showTitle}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{showBody}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(a.created_at).toLocaleString()}
                    {a.expires_at && ` · ${new Date(a.expires_at).toLocaleString()}`}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
