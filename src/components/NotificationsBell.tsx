import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

type N = { id: string; kind: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data ?? []) as N[]);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel("notif-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user?.id]);

  const unread = items.filter((i) => !i.read_at).length;

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
    load();
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border p-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll}><Check className="h-3 w-3" />Mark all read</Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
          ) : items.map((n) => (
            <Link
              key={n.id}
              to={n.link ?? "#"}
              onClick={() => setOpen(false)}
              className={`block border-b border-border last:border-0 p-3 hover:bg-secondary/60 transition-colors ${!n.read_at ? "bg-primary/5" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </div>
                {!n.read_at && <Badge className="h-1.5 w-1.5 rounded-full p-0 bg-primary border-0" />}
              </div>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}