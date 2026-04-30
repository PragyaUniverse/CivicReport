import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowBigUp, MapPin, Clock, ArrowLeft, MessageSquare, AlertTriangle, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getCategory, STATUS_META } from "@/lib/categories";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { FeedbackForm } from "@/components/FeedbackForm";
import { useI18n } from "@/lib/i18n";

type Issue = {
  id: string; title: string; description: string; category: string; status: string;
  location_text: string; image_url: string | null; resolved_image_url: string | null;
  upvote_count: number; created_at: string; reporter_id: string;
  sla_due_at: string | null; escalated: boolean;
};
type Update = { id: string; note: string; new_status: string | null; created_at: string };
type Fb = { id: string; rating: number; comment: string | null; created_at: string; user_id: string };

export default function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Fb[]>([]);

  const load = async () => {
    if (!id) return;
    const { data: i } = await supabase.from("issues").select("*").eq("id", id).maybeSingle();
    setIssue(i as Issue | null);
    const { data: u } = await supabase.from("status_updates").select("*").eq("issue_id", id).order("created_at", { ascending: true });
    setUpdates((u ?? []) as Update[]);
    const { data: f } = await supabase.from("feedback").select("*").eq("issue_id", id);
    setFeedback((f ?? []) as Fb[]);
    if (user) {
      const { data: v } = await supabase.from("upvotes").select("id").eq("issue_id", id).eq("user_id", user.id).maybeSingle();
      setHasUpvoted(!!v);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, user?.id]);

  const toggleUpvote = async () => {
    if (!user) return navigate("/auth");
    if (!issue) return;
    setBusy(true);
    if (hasUpvoted) {
      await supabase.from("upvotes").delete().eq("issue_id", issue.id).eq("user_id", user.id);
      setHasUpvoted(false);
    } else {
      const { error } = await supabase.from("upvotes").insert({ issue_id: issue.id, user_id: user.id });
      if (error) toast.error(error.message);
      else setHasUpvoted(true);
    }
    await load();
    setBusy(false);
  };

  if (!issue) {
    return <Layout><p className="text-sm text-muted-foreground">Loading…</p></Layout>;
  }

  const cat = getCategory(issue.category);
  const status = STATUS_META[issue.status] ?? STATUS_META.reported;
  const Icon = cat.icon;
  const overdue = !!(issue.sla_due_at && (issue.status === "reported" || issue.status === "in_progress") && new Date(issue.sla_due_at).getTime() < Date.now());
  const isReporter = user?.id === issue.reporter_id;
  const myFeedback = feedback.find((f) => f.user_id === user?.id);

  return (
    <Layout>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-3"><ArrowLeft className="h-4 w-4" />Back</Button>

      <Card className="overflow-hidden shadow-soft">
        {issue.image_url && (
          <img src={issue.image_url} alt={issue.title} className="w-full max-h-80 object-cover" />
        )}
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cat.color}`}>
              <Icon className="h-3.5 w-3.5" /> {t(cat.labelKey)}
            </span>
            <Badge variant="outline" className={status.className}>{t(status.labelKey)}</Badge>
            {overdue && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                <AlertTriangle className="h-3 w-3" /> SLA overdue
              </Badge>
            )}
            {issue.sla_due_at && !overdue && issue.status !== "resolved" && issue.status !== "rejected" && (
              <span className="text-[11px] text-muted-foreground">SLA due {formatDistanceToNow(new Date(issue.sla_due_at), { addSuffix: true })}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{issue.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{issue.location_text}</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</span>
            </p>
          </div>
          <p className="whitespace-pre-wrap text-foreground/90">{issue.description}</p>

          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <Button
              onClick={toggleUpvote}
              disabled={busy || isReporter}
              variant={hasUpvoted ? "default" : "outline"}
              title={isReporter ? "You can't upvote your own report" : undefined}
            >
              <ArrowBigUp className="h-4 w-4" />
              {hasUpvoted ? "Upvoted" : "Upvote"} · {issue.upvote_count}
            </Button>
            <span className="text-xs text-muted-foreground">
              {isReporter ? "You can't upvote your own report." : "Higher upvotes raise priority for the city."}
            </span>
          </div>

          {issue.resolved_image_url && (
            <div className="pt-2">
              <h3 className="text-sm font-semibold mb-2">Before / after</h3>
              <div className="grid grid-cols-2 gap-2">
                <figure>
                  <img src={issue.image_url ?? ""} alt="Before" className="w-full h-40 object-cover rounded-md border border-border" />
                  <figcaption className="mt-1 text-[11px] text-center text-muted-foreground">Before</figcaption>
                </figure>
                <figure>
                  <img src={issue.resolved_image_url} alt="After" className="w-full h-40 object-cover rounded-md border border-border" />
                  <figcaption className="mt-1 text-[11px] text-center text-muted-foreground">After</figcaption>
                </figure>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {issue.status === "resolved" && isReporter && !myFeedback && user && (
        <div className="mt-5">
          <FeedbackForm issueId={issue.id} userId={user.id} onDone={load} />
        </div>
      )}

      {feedback.length > 0 && (
        <section className="mt-5">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2"><Star className="h-4 w-4 text-warning" /> Citizen feedback</h2>
          <div className="space-y-2">
            {feedback.map((f) => (
              <Card key={f.id} className="p-3">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((n) => (
                    <Star key={n} className={`h-4 w-4 ${n <= f.rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                  ))}
                  <span className="text-[11px] text-muted-foreground ml-2">{new Date(f.created_at).toLocaleDateString()}</span>
                </div>
                {f.comment && <p className="mt-1.5 text-sm">{f.comment}</p>}
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Timeline</h2>
        <ol className="relative border-l border-border pl-5 space-y-4">
          <li className="relative">
            <span className="absolute -left-[26px] flex h-4 w-4 items-center justify-center rounded-full bg-info" />
            <p className="text-sm font-medium">Reported</p>
            <p className="text-xs text-muted-foreground">{new Date(issue.created_at).toLocaleString()}</p>
          </li>
          {updates.map((u) => {
            const meta = u.new_status ? STATUS_META[u.new_status] : null;
            return (
              <li key={u.id} className="relative">
                <span className="absolute -left-[26px] flex h-4 w-4 items-center justify-center rounded-full bg-primary" />
                <div className="flex items-center gap-2">
                  {meta && <Badge variant="outline" className={meta.className}>{t(meta.labelKey)}</Badge>}
                  <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString()}</p>
                </div>
                <p className="text-sm mt-1">{u.note}</p>
              </li>
            );
          })}
        </ol>
      </section>
    </Layout>
  );
}