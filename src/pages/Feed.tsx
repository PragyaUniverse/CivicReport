import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { IssueCard, IssueRow } from "@/components/IssueCard";
import { CATEGORIES } from "@/lib/categories";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Search, PlusCircle, TrendingUp, ListChecks, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { useI18n } from "@/lib/i18n";

type SortMode = "recent" | "top";
type StatusFilter = "all" | "open" | "resolved";

export default function Feed() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [issues, setIssues] = useState<IssueRow[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<SortMode>("recent");
  const [status, setStatus] = useState<StatusFilter>("all");

  useEffect(() => {
    supabase
      .from("issues")
      .select("id,title,description,category,status,location_text,image_url,upvote_count,created_at")
      .order(sort === "top" ? "upvote_count" : "created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setIssues((data ?? []) as IssueRow[]));
  }, [sort]);

  const filtered = useMemo(() => {
    if (!issues) return null;
    return issues.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (status === "open" && (i.status === "resolved" || i.status === "rejected")) return false;
      if (status === "resolved" && i.status !== "resolved") return false;
      if (q && !`${i.title} ${i.description} ${i.location_text}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [issues, cat, status, q]);

  const totals = useMemo(() => {
    if (!issues) return { total: 0, open: 0, resolved: 0 };
    return {
      total: issues.length,
      open: issues.filter((i) => i.status === "reported" || i.status === "in_progress").length,
      resolved: issues.filter((i) => i.status === "resolved").length,
    };
  }, [issues]);

  return (
    <Layout>
      <AnnouncementBanner />
      <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-hero p-6 sm:p-8 text-primary-foreground shadow-elevated">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("feed.heroTitle")}</h1>
          <p className="mt-1.5 text-sm sm:text-base text-primary-foreground/85">
            {t("feed.heroBody")}
          </p>
          <div className="mt-4 flex gap-2">
            <Button asChild variant="secondary" size="lg">
              <Link to={user ? "/report" : "/auth"}>
                <PlusCircle className="h-4 w-4" /> {t("feed.report")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat icon={ListChecks} label={t("stat.total")} value={totals.total} />
        <Stat icon={TrendingUp} label={t("stat.active")} value={totals.open} accent="text-warning" />
        <Stat icon={CheckCircle2} label={t("stat.resolved")} value={totals.resolved} accent="text-success" />
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("feed.search")} className="pl-9" />
        </div>
        <Tabs value={sort} onValueChange={(v) => setSort(v as SortMode)}>
          <TabsList>
            <TabsTrigger value="recent">{t("feed.recent")}</TabsTrigger>
            <TabsTrigger value="top">{t("feed.top")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">{t("feed.all")}</TabsTrigger>
            <TabsTrigger value="open">{t("feed.open")}</TabsTrigger>
            <TabsTrigger value="resolved">{t("feed.resolved")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <CategoryChip active={cat === "all"} onClick={() => setCat("all")} label={t("feed.allCats")} />
        {CATEGORIES.map((c) => (
          <CategoryChip key={c.value} active={cat === c.value} onClick={() => setCat(c.value)} label={t(c.labelKey)} />
        ))}
      </div>

      {filtered === null ? (
        <p className="text-sm text-muted-foreground">{t("feed.loading")}</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          {t("feed.empty")} <Link className="text-primary underline" to={user ? "/report" : "/auth"}>{t("feed.report")}</Link>.
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((i) => <IssueCard key={i.id} issue={i} />)}
        </div>
      )}
    </Layout>
  );
}

function Stat({ icon: Icon, label, value, accent = "text-primary" }: { icon: any; label: string; value: number; accent?: string }) {
  return (
    <Card className="p-3 sm:p-4 bg-gradient-card shadow-soft">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${accent}`} />
        <div>
          <div className="text-lg sm:text-xl font-bold tabular-nums">{value}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  );
}

function CategoryChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}