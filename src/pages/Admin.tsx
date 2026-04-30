import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES, STATUS_META, getCategory } from "@/lib/categories";
import { Shield, ListChecks, TrendingUp, CheckCircle2, AlertTriangle, Loader2, Clock, BarChart3, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { AnalyticsPanel } from "@/components/admin/AnalyticsPanel";
import { AnnouncementsPanel } from "@/components/admin/AnnouncementsPanel";

type Issue = {
  id: string; title: string; description: string; category: string; status: string;
  location_text: string; image_url: string | null; upvote_count: number; created_at: string; reporter_id: string;
  sla_due_at: string | null;
};

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const { t } = useI18n();

  if (loading) return <Layout><p className="text-sm text-muted-foreground">{t("common.loading")}</p></Layout>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <Layout>
        <Card className="p-8 text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <h2 className="text-lg font-semibold">Admin access required</h2>
          <p className="text-sm text-muted-foreground mt-1">Your account doesn't have the admin role yet.</p>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-5 flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{t("admin.title")}</h1>
      </div>

      <Tabs defaultValue="queue">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="queue"><ListChecks className="h-4 w-4 mr-1.5" />{t("admin.tab.queue")}</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1.5" />{t("admin.tab.analytics")}</TabsTrigger>
          <TabsTrigger value="ann"><Megaphone className="h-4 w-4 mr-1.5" />{t("admin.tab.ann")}</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-5"><QueuePanel userId={user.id} /></TabsContent>
        <TabsContent value="analytics" className="mt-5"><AnalyticsPanel /></TabsContent>
        <TabsContent value="ann" className="mt-5"><AnnouncementsPanel /></TabsContent>
      </Tabs>
    </Layout>
  );
}

function QueuePanel({ userId }: { userId: string }) {
  const { t } = useI18n();
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    supabase.from("issues").select("*").order("priority", { ascending: false }).limit(500).then(({ data }) => {
      setIssues((data ?? []) as Issue[]);
    });
  }, []);

  const totals = (issues ?? []).reduce(
    (a, i) => {
      a.total++;
      if (i.status === "reported") a.reported++;
      else if (i.status === "in_progress") a.in_progress++;
      else if (i.status === "resolved") a.resolved++;
      if ((i.status === "reported" || i.status === "in_progress") && i.sla_due_at && new Date(i.sla_due_at).getTime() < Date.now()) a.overdue++;
      return a;
    },
    { total: 0, reported: 0, in_progress: 0, resolved: 0, overdue: 0 }
  );

  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    count: (issues ?? []).filter((i) => i.category === c.value).length,
  }));

  const filtered = (issues ?? []).filter((i) => filter === "all" || i.status === filter);

  const update = async (issue: Issue, newStatus: string, note: string): Promise<void> => {
    const { error: e1 } = await supabase.from("issues").update({ status: newStatus as any }).eq("id", issue.id);
    if (e1) { toast.error(e1.message); return; }
    const { error: e2 } = await supabase.from("status_updates").insert({
      issue_id: issue.id, author_id: userId, new_status: newStatus as any, note,
    });
    if (e2) { toast.error(e2.message); return; }
    toast.success(t("admin.statusUpdated"));
    setIssues((prev) => (prev ? prev.map((p) => (p.id === issue.id ? { ...p, status: newStatus } : p)) : prev));
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <StatCard icon={ListChecks} label={t("admin.stat.total")} value={totals.total} />
        <StatCard icon={AlertTriangle} label={t("admin.stat.reported")} value={totals.reported} accent="text-info" />
        <StatCard icon={TrendingUp} label={t("admin.stat.in_progress")} value={totals.in_progress} accent="text-warning" />
        <StatCard icon={CheckCircle2} label={t("admin.stat.resolved")} value={totals.resolved} accent="text-success" />
        <StatCard icon={Clock} label={t("admin.stat.overdue")} value={totals.overdue} accent="text-destructive" />
      </div>

      <Card className="mb-5 shadow-soft">
        <CardHeader><h2 className="text-sm font-semibold">{t("admin.byCategory")}</h2></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {byCategory.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.value} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${c.color}`}><Icon className="h-4 w-4" /></span>
                <div>
                  <div className="text-lg font-semibold tabular-nums">{c.count}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t(c.labelKey)}</div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold mr-auto">{t("admin.queueTitle")}</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.allStatuses")}</SelectItem>
            <SelectItem value="reported">{t("status.reported")}</SelectItem>
            <SelectItem value="in_progress">{t("status.in_progress")}</SelectItem>
            <SelectItem value="resolved">{t("status.resolved")}</SelectItem>
            <SelectItem value="rejected">{t("status.rejected")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!issues ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">{t("admin.noMatch")}</Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((i) => <AdminIssueRow key={i.id} issue={i} onUpdate={update} />)}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent = "text-primary" }: { icon: any; label: string; value: number; accent?: string }) {
  return (
    <Card className="p-3 sm:p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${accent}`} />
        <div>
          <div className="text-xl font-bold tabular-nums">{value}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  );
}

function AdminIssueRow({ issue, onUpdate }: { issue: Issue; onUpdate: (i: Issue, status: string, note: string) => Promise<void> }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(issue.status);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const cat = getCategory(issue.category);
  const meta = STATUS_META[issue.status] ?? STATUS_META.reported;
  const Icon = cat.icon;
  const overdue = !!(issue.sla_due_at && (issue.status === "reported" || issue.status === "in_progress") && new Date(issue.sla_due_at).getTime() < Date.now());

  const submit = async () => {
    if (!note.trim()) return toast.error(t("admin.addNote"));
    setBusy(true);
    await onUpdate(issue, status, note.trim());
    setBusy(false);
    setOpen(false);
    setNote("");
  };

  return (
    <Card className="shadow-soft">
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        {issue.image_url ? (
          <img src={issue.image_url} alt="" className="h-24 w-24 sm:h-28 sm:w-28 object-cover rounded-md border border-border" />
        ) : (
          <div className={`h-24 w-24 sm:h-28 sm:w-28 rounded-md flex items-center justify-center ${cat.color}`}>
            <Icon className="h-7 w-7" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cat.color}`}>
              <Icon className="h-3 w-3" /> {t(cat.labelKey)}
            </span>
            <Badge variant="outline" className={meta.className}>{t(meta.labelKey)}</Badge>
            <Badge variant="secondary">▲ {issue.upvote_count}</Badge>
            {overdue && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30"><AlertTriangle className="h-3 w-3" />{t("admin.overdue")}</Badge>}
          </div>
          <h3 className="mt-1.5 text-base font-semibold line-clamp-1">{issue.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{issue.description}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">📍 {issue.location_text}</p>
        </div>
        <div className="flex sm:flex-col gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>{open ? t("admin.cancel") : t("admin.update")}</Button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="reported">{t("status.reported")}</SelectItem>
                <SelectItem value="in_progress">{t("status.in_progress")}</SelectItem>
                <SelectItem value="resolved">{t("status.resolved")}</SelectItem>
                <SelectItem value="rejected">{t("status.rejected")}</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("admin.notePh")}
              maxLength={500}
              rows={2}
              className="flex-1"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t("admin.save")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
