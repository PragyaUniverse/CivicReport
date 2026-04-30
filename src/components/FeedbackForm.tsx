import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function FeedbackForm({ issueId, userId, onDone }: { issueId: string; userId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (rating < 1) return toast.error("Pick a rating");
    setBusy(true);
    const { error } = await supabase.from("feedback").insert({ issue_id: issueId, user_id: userId, rating, comment: comment.trim() || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks for your feedback · +5 points");
    onDone();
  };

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <h3 className="text-sm font-semibold">Rate the resolution</h3>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="p-0.5"
          >
            <Star className={`h-7 w-7 transition-colors ${n <= (hover || rating) ? "fill-warning text-warning" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Anything you'd like the city to know? (optional)"
        rows={2}
        maxLength={500}
        className="mt-3"
      />
      <div className="mt-3 flex justify-end">
        <Button onClick={submit} disabled={busy} size="sm">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit feedback
        </Button>
      </div>
    </div>
  );
}