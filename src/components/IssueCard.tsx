import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowBigUp, MapPin, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getCategory, STATUS_META } from "@/lib/categories";
import { useI18n } from "@/lib/i18n";

export type IssueRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  location_text: string;
  image_url: string | null;
  upvote_count: number;
  created_at: string;
};

export function IssueCard({ issue }: { issue: IssueRow }) {
  const { t } = useI18n();
  const cat = getCategory(issue.category);
  const status = STATUS_META[issue.status] ?? STATUS_META.reported;
  const Icon = cat.icon;
  return (
    <Link to={`/issue/${issue.id}`}>
      <Card className="group overflow-hidden border-border bg-gradient-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated">
        <div className="flex">
          {issue.image_url ? (
            <img
              src={issue.image_url}
              alt={issue.title}
              loading="lazy"
              className="h-28 w-28 sm:h-32 sm:w-32 flex-shrink-0 object-cover"
            />
          ) : (
            <div className={`h-28 w-28 sm:h-32 sm:w-32 flex-shrink-0 flex items-center justify-center ${cat.color}`}>
              <Icon className="h-8 w-8" />
            </div>
          )}
          <div className="flex-1 p-3 sm:p-4 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cat.color}`}>
                    <Icon className="h-3 w-3" /> {t(cat.labelKey)}
                  </span>
                  <Badge variant="outline" className={`text-[11px] ${status.className}`}>{t(status.labelKey)}</Badge>
                </div>
                <h3 className="mt-1.5 text-sm sm:text-base font-semibold text-foreground line-clamp-1">{issue.title}</h3>
                <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground line-clamp-2">{issue.description}</p>
              </div>
              <div className="flex flex-col items-center rounded-lg border border-border bg-background px-2 py-1.5 text-foreground">
                <ArrowBigUp className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold tabular-nums">{issue.upvote_count}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{issue.location_text}</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}