import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CATEGORIES } from "@/lib/categories";
import { TrendingUp, AlertTriangle, Star } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@/lib/i18n";

type Issue = { id: string; category: string; status: string; created_at: string; sla_due_at: string | null; location_text: string };
type Fb = { rating: number };

export function AnalyticsPanel() {
  const { t } = useI18n();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [feedback, setFeedback] = useState<Fb[]>([]);

  useEffect(() => {
    supabase.from("issues").select("id,category,status,created_at,sla_due_at,location_text").limit(1000)
      .then(({ data }) => setIssues((data ?? []) as Issue[]));
    supabase.from("feedback").select("rating").limit(1000).then(({ data }) => setFeedback((data ?? []) as Fb[]));
  }, []);

  const overTime = useMemo(() => {
    const map = new Map<string, number>();
    issues.forEach((i) => {
      const d = new Date(i.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-30).map(([d, c]) => ({ date: d.slice(5), count: c }));
  }, [issues]);

  const byCat = useMemo(() => CATEGORIES.map((c) => ({
    name: t(c.labelKey),
    value: issues.filter((i) => i.category === c.value).length,
  })).filter((x) => x.value > 0), [issues, t]);

  const byArea = useMemo(() => {
    const map = new Map<string, number>();
    issues.forEach((i) => {
      const area = (i.location_text || "Unknown").split(",")[0].trim().slice(0, 30) || "Unknown";
      map.set(area, (map.get(area) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([area, count]) => ({ area, count }));
  }, [issues]);

  const overdue = useMemo(() => {
    const now = Date.now();
    return issues.filter((i) => (i.status === "reported" || i.status === "in_progress") && i.sla_due_at && new Date(i.sla_due_at).getTime() < now).length;
  }, [issues]);

  const avgRating = feedback.length > 0 ? (feedback.reduce((a, f) => a + f.rating, 0) / feedback.length).toFixed(1) : "—";

  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KPI label={t("admin.stat.total")} value={issues.length} icon={TrendingUp} />
        <KPI label={t("admin.stat.overdue")} value={overdue} icon={AlertTriangle} accent="text-destructive" />
        <KPI label={t("admin.stat.resolved")} value={issues.filter((i) => i.status === "resolved").length} accent="text-success" />
        <KPI label="Avg. rating" value={avgRating} icon={Star} accent="text-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="shadow-soft">
          <CardHeader><h2 className="text-sm font-semibold">Reports over time (last 30 days)</h2></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader><h2 className="text-sm font-semibold">{t("admin.byCategory")}</h2></CardHeader>
          <CardContent className="h-64">
            {byCat.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCat} dataKey="value" nameKey="name" outerRadius={80} label={(e) => e.name}>
                    {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft lg:col-span-2">
          <CardHeader><h2 className="text-sm font-semibold">Most problematic areas</h2></CardHeader>
          <CardContent className="h-64">
            {byArea.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byArea}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="area" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon, accent = "text-primary" }: { label: string; value: number | string; icon?: any; accent?: string }) {
  return (
    <Card className="p-4 shadow-soft">
      <div className="flex items-center gap-3">
        {Icon && <Icon className={`h-5 w-5 ${accent}`} />}
        <div>
          <div className="text-xl font-bold tabular-nums">{value}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  );
}
