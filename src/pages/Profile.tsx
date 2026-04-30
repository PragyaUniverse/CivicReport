import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Award, Trophy, Medal, Sparkles, ListChecks } from "lucide-react";
import { IssueCard, IssueRow } from "@/components/IssueCard";

const BADGES = [
  { id: "first", label: "First Reporter", icon: Sparkles, threshold: 1, desc: "Submit your first report" },
  { id: "active", label: "Active Citizen", icon: Medal, threshold: 5, desc: "Submit 5 reports" },
  { id: "champ", label: "Civic Champion", icon: Trophy, threshold: 20, desc: "Submit 20 reports" },
];

export default function Profile() {
  const { user, profile, loading } = useAuth();
  const [mine, setMine] = useState<IssueRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("issues")
      .select("id,title,description,category,status,location_text,image_url,upvote_count,created_at")
      .eq("reporter_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMine((data ?? []) as IssueRow[]));
  }, [user?.id]);

  if (loading) return <Layout><p className="text-sm text-muted-foreground">Loading…</p></Layout>;
  if (!user) return <Navigate to="/auth" replace />;

  const reportCount = mine?.length ?? 0;
  const earned = BADGES.filter((b) => reportCount >= b.threshold);

  return (
    <Layout>
      <Card className="mb-5 overflow-hidden">
        <div className="bg-gradient-hero p-6 text-primary-foreground">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-foreground/20 text-xl font-bold">
              {(profile?.full_name ?? user.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight truncate">{profile?.full_name ?? user.email}</h1>
              <p className="text-sm text-primary-foreground/85">{user.email}</p>
            </div>
            <div className="ml-auto text-right">
              <div className="flex items-center gap-1.5 text-2xl font-bold"><Award className="h-5 w-5" />{profile?.points ?? 0}</div>
              <p className="text-[11px] uppercase tracking-wider text-primary-foreground/80">Points</p>
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
                <p className="mt-1.5 text-xs font-semibold">{b.label}</p>
                <p className="text-[10px] text-muted-foreground">{b.desc}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><ListChecks className="h-4 w-4" />Your reports <Badge variant="secondary">{reportCount}</Badge></h2>
      {mine === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : mine.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          You haven't reported anything yet. <Link className="text-primary underline" to="/report">Report your first issue</Link>.
        </Card>
      ) : (
        <div className="space-y-3">{mine.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
      )}
    </Layout>
  );
}