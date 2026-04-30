import { Construction, Trash2, Droplets, Zap, Lightbulb, Waves, MoreHorizontal, LucideIcon } from "lucide-react";

export type Category = "pothole" | "garbage" | "water" | "electricity" | "streetlight" | "sewage" | "other";

export const CATEGORIES: { value: Category; label: string; labelKey: string; icon: LucideIcon; color: string }[] = [
  { value: "pothole", label: "Pothole", labelKey: "cat.pothole", icon: Construction, color: "bg-warning/15 text-warning" },
  { value: "garbage", label: "Garbage", labelKey: "cat.garbage", icon: Trash2, color: "bg-success/15 text-success" },
  { value: "water", label: "Water leak", labelKey: "cat.water", icon: Droplets, color: "bg-info/15 text-info" },
  { value: "electricity", label: "Electricity", labelKey: "cat.electricity", icon: Zap, color: "bg-warning/15 text-warning" },
  { value: "streetlight", label: "Streetlight", labelKey: "cat.streetlight", icon: Lightbulb, color: "bg-accent/15 text-accent" },
  { value: "sewage", label: "Sewage", labelKey: "cat.sewage", icon: Waves, color: "bg-info/15 text-info" },
  { value: "other", label: "Other", labelKey: "cat.other", icon: MoreHorizontal, color: "bg-muted text-muted-foreground" },
];

export const STATUS_META: Record<string, { label: string; labelKey: string; className: string }> = {
  reported: { label: "Reported", labelKey: "status.reported", className: "bg-info/15 text-info border-info/30" },
  in_progress: { label: "In progress", labelKey: "status.in_progress", className: "bg-warning/15 text-warning border-warning/30" },
  resolved: { label: "Resolved", labelKey: "status.resolved", className: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Rejected", labelKey: "status.rejected", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

export const getCategory = (v: string) => CATEGORIES.find((c) => c.value === v) ?? CATEGORIES[CATEGORIES.length - 1];
