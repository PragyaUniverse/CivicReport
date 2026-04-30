import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Award, Trophy, Medal, Sparkles, ListChecks, MapPin, Bell, Megaphone, ArrowBigUp, Check, PlusCircle } from "lucide-react";
import { IssueCard, IssueRow } from "@/components/IssueCard";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

const BADGES = [
  { id: "first", labelKey: "dash.badges.first", descKey: "dash.badges.first.desc", icon: Sparkles, threshold: 1 },
  { id: "active", labelKey: "dash.badges.active", descKey: "dash.badges.active.desc", icon: Medal, threshold: 5 },
  { id: "champ", labelKey: "dash.badges.champ", descKey: "dash.badges.champ.desc", icon: Trophy, threshold: 20 },
];

type N = { id: string; kind: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };
type A = { id: string; title: string; title_hi: string | null; body: string; body_hi: string | null; category: string; created_at: string; expires_at: string | null };

function locationKey(text: string) {
  // Use the first comma-separated chunk as the "area" fingerprint (best-effort).
  return (text || "").split(",")[0].trim().toLowerCase();
}

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const { t, lang } = useI18n();
  const [mine, setMine] = useState<IssueRow[] | null>(null);
  const [nearby, setNearby] = useState<(IssueRow & { reporter_id: string })[] | null>(null);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [notifs, setNotifs] = useState<N[]>([]);
  const [announcements, setAnnouncements] = useState<A[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: m } = await supabase
        .from("issues")
        .select("id,title,description,category,status,location_text,image_url,upvote_count,created_at,reporter_id")
        .eq("reporter_id", user.id)
        .order("created_at", { ascending: false });
      setMine((m ?? []) as any);

      // Build "areas" from the user's reports
      const areas = Array.from(new Set((m ?? []).map((r: any) => locationKey(r.location_text)).filter(Boolean)));

      let nearbyData: any[] = [];
      if (areas.length > 0) {
        const { data: all } = await supabase
          .from("issues")
          .select("id,title,description,category,status,location_text,image_url,upvote_count,created_at,reporter_id")
          .neq("reporter_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200);
        nearbyData = (all ?? []).filter((r: any) => areas.includes(locationKey(r.location_text)));
      }
      setNearby(nearbyData as any);

      const { data: uv } = await supabase.from("upvotes").select("issue_id").eq("user_id", user.id);
      setUpvotedIds(new Set((uv ?? []).map((r: any) => r.issue_id)));

      const { data: n } = await supabase
        .from("notifications").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(50);
      setNotifs((n ?? []) as N[]);

      const { data: a } = await supabase
        .from("announcements").select("*")
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false }).limit(20);
      setAnnouncements((a ?? []) as A[]);
    })();
  }, [user?.id]);

  if (loading) return <Layout><p className="text-sm text-muted-foreground">{t("common.loading")}</p></Layout>;
  if (!user) return <Navigate to="/auth" replace />;

  const reportCount = mine?.length ?? 0;
  const earned = BADGES.filter((b) => reportCount >= b.threshold);
  const unread = notifs.filter((n) => !n.read_at).length;

  const toggleUpvote = async (issueId: string, reporterId: string) => {
    if (reporterId === user.id) {
      toast.error("You cannot upvote your own report");
      return;
    }
    const isUp = upvotedIds.has(issueId);
    if (isUp) {
      await supabase.from("upvotes").delete().eq("issue_id", issueId).eq("user_id", user.id);
      const next = new Set(upvotedIds); next.delete(issueId); setUpvotedIds(next);
      setNearby((prev) => prev?.map((i) => i.id === issueId ? { ...i, upvote_count: Math.max(0, i.upvote_count - 1) } : i) ?? prev);
    } else {
      const { error } = await supabase.from("upvotes").insert({ issue_id: issueId, user_id: user.id });
      if (error) { toast.error(error.message); return; }
      const next = new Set(upvotedIds); next.add(issueId); setUpvotedIds(next);
      setNearby((prev) => prev?.map((i) => i.id === issueId ? { ...i, upvote_count: i.upvote_count + 1 } : i) ?? prev);
      toast.success("Upvoted");
    }
  };

  const markAllRead = async () => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id).is("read_at", null);
    setNotifs((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  };

  return (
    <Layout>
      <Card className="mb-5 overflow-hidden">
        <div className="bg-gradient-hero p-6 text-primary-foreground">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-foreground/20 text-xl font-bold">
              {(profile?.full_name ?? user.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight truncate">{t("dash.welcome")}, {profile?.full_name ?? user.email}</h1>
              <p className="text-sm text-primary-foreground/85">{t("dash.subtitle")}</p>
            </div>
            <div className="ml-auto text-right">
              <div className="flex items-center gap-1.5 text-2xl font-bold"><Award className="h-5 w-5" />{profile?.points ?? 0}</div>
              <p className="text-[11px] uppercase tracking-wider text-primary-foreground/80">{t("dash.points")}</p>
            </div>
          </div>
        </div>
        <CardContent className="grid grid-cols-3 gap-3 p-4">
          {BADGES.map((b) => {
            const Icon = b.icon;
            const has = earned.some((e) => e.id === b.id);
            return (
              <div key={b.id} className={`rounded-lg border p-3 text-center transition-all ${has ? "border-accent bg-accent/10" : "border-border bg-muted/40 opacity-60"}`}>
                <Icon className={`mx-auto h-6 w-6 ${has ? "text-accent" : "text-muted-foreground"}`} />
                <p className="mt-1.5 text-xs font-semibold">{t(b.labelKey)}</p>
                <p className="text-[10px] text-muted-foreground">{t(b.descKey)}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="mb-4 flex items-center justify-end">
        <Button asChild size="sm"><Link to="/report"><PlusCircle className="h-4 w-4" />{t("dash.reportNew")}</Link></Button>
      </div>

      <Tabs defaultValue="mine">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="mine"><ListChecks className="h-3.5 w-3.5 mr-1" />{t("dash.tab.mine")} <Badge variant="secondary" className="ml-1.5">{reportCount}</Badge></TabsTrigger>
          <TabsTrigger value="nearby"><MapPin className="h-3.5 w-3.5 mr-1" />{t("dash.tab.nearby")} <Badge variant="secondary" className="ml-1.5">{nearby?.length ?? 0}</Badge></TabsTrigger>
          <TabsTrigger value="notif"><Bell className="h-3.5 w-3.5 mr-1" />{t("dash.tab.inbox")} {unread > 0 && <Badge className="ml-1.5 h-5 min-w-5 px-1.5 bg-destructive text-destructive-foreground">{unread}</Badge>}</TabsTrigger>
          <TabsTrigger value="ann"><Megaphone className="h-3.5 w-3.5 mr-1" />{t("dash.tab.ann")}</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-4">
          {mine === null ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : mine.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              {t("dash.mine.empty")} <Link className="text-primary underline" to="/report">{t("dash.mine.cta")}</Link>.
            </Card>
          ) : (
            <div className="space-y-3">{mine.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
          )}
        </TabsContent>

        <TabsContent value="nearby" className="mt-4">
          <p className="text-xs text-muted-foreground mb-3">{t("dash.nearby.hint")}</p>
          {nearby === null ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : nearby.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">{t("dash.nearby.empty")}</Card>
          ) : (
            <div className="space-y-3">
              {nearby.map((i) => (
                <div key={i.id} className="flex items-stretch gap-2">
                  <div className="flex-1"><IssueCard issue={i} /></div>
                  <Button
                    variant={upvotedIds.has(i.id) ? "default" : "outline"}
                    onClick={() => toggleUpvote(i.id, i.reporter_id)}
                    className="self-stretch flex-col gap-0 h-auto px-3"
                  >
                    <ArrowBigUp className="h-5 w-5" />
                    <span className="text-xs font-semibold">{i.upvote_count}</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notif" className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("dash.notifs")}</h2>
            {unread > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead}><Check className="h-3 w-3" />{t("dash.markAll")}</Button>
            )}
          </div>
          {notifs.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">{t("dash.notifs.empty")}</Card>
          ) : (
            <div className="space-y-2">
              {notifs.map((n) => (
                <Link key={n.id} to={n.link ?? "#"} className={`block rounded-lg border p-3 transition-colors hover:bg-secondary/60 ${!n.read_at ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                    </div>
                    {!n.read_at && <Badge className="h-1.5 w-1.5 rounded-full p-0 bg-primary border-0" />}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ann" className="mt-4">
          {announcements.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">{t("dash.ann.empty")}</Card>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => {
                const aTitle = lang === "hi" && a.title_hi ? a.title_hi : a.title;
                const aBody = lang === "hi" && a.body_hi ? a.body_hi : a.body;
                return (
                  <Card key={a.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Megaphone className="h-5 w-5 text-info mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold">{aTitle}</h3>
                          <Badge variant="outline" className="text-[10px] uppercase">{a.category}</Badge>
                        </div>
                        <p className="text-sm text-foreground/85 mt-1 whitespace-pre-wrap">{aBody}</p>
                        <p className="text-[10px] text-muted-foreground mt-2">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Layout>
  );
}