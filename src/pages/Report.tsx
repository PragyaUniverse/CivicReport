import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, Category } from "@/lib/categories";
import { useAuth } from "@/contexts/AuthContext";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Loader2, Camera, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useI18n } from "@/lib/i18n";

const schema = z.object({
  title: z.string().trim().min(4, "Title is too short").max(120),
  description: z.string().trim().min(10, "Add more detail (min 10 chars)").max(2000),
  location_text: z.string().trim().min(3, "Location required").max(200),
  category: z.enum(["pothole","garbage","water","electricity","streetlight","sewage","other"]),
});

export default function Report() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<Category>("pothole");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    navigate("/auth");
    return null;
  }

  const onPickFile = (f: File | null) => {
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  };

  const useGeolocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not available");
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`),
      () => toast.error("Could not get your location")
    );
  };

  const submit = async () => {
    const parsed = schema.safeParse({ title, description, location_text: location, category });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSubmitting(true);
    try {
      let image_url: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("issue-media").upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        image_url = supabase.storage.from("issue-media").getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await supabase
        .from("issues")
        .insert({
          reporter_id: user.id,
          title: parsed.data.title,
          description: parsed.data.description,
          location_text: parsed.data.location_text,
          category: parsed.data.category,
          image_url,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success(t("report.success"));
      navigate(`/issue/${data.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <div className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight">{t("report.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("report.subtitle")}</p>
        </div>

        <Stepper step={step} t={t} />

        <Card className="mt-4 shadow-soft">
          {step === 1 && (
            <>
              <CardHeader><h2 className="text-lg font-semibold">1. {t("report.step1")}</h2></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    const active = category === c.value;
                    return (
                      <button
                        key={c.value}
                        onClick={() => setCategory(c.value)}
                        className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-all ${
                          active ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/40"
                        }`}
                      >
                        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${c.color}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="text-sm font-medium">{t(c.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 flex justify-end">
                  <Button onClick={() => setStep(2)}>{t("report.next")}</Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader><h2 className="text-lg font-semibold">2. {t("report.step2")}</h2></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t("report.photo")}</Label>
                  {preview ? (
                    <div className="relative mt-2 overflow-hidden rounded-lg border border-border">
                      <img src={preview} alt="preview" className="w-full max-h-72 object-cover" />
                      <button onClick={() => onPickFile(null)} className="absolute top-2 right-2 rounded-full bg-background/90 p-1.5 shadow-soft">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-secondary/40 p-8 text-center transition-colors hover:border-primary/40">
                      <Camera className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t("report.photoHint")}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  )}
                </div>

                <div>
                  <Label htmlFor="loc">{t("report.location")}</Label>
                  <div className="mt-1.5 flex gap-2">
                    <Input id="loc" placeholder={t("report.locationPh")} value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} />
                    <Button type="button" variant="outline" onClick={useGeolocation}><MapPin className="h-4 w-4" />{t("report.gps")}</Button>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)}>{t("report.back")}</Button>
                  <Button onClick={() => setStep(3)}>{t("report.next")}</Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader><h2 className="text-lg font-semibold">3. {t("report.step3")}</h2></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">{t("report.titleField")}</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("report.titlePh")} maxLength={120} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label htmlFor="desc">{t("report.desc")}</Label>
                    <VoiceRecorder onTranscript={(t) => setDescription((d) => (d ? `${d} ${t}` : t))} />
                  </div>
                  <Textarea id="desc" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("report.descPh")} maxLength={2000} />
                  <p className="mt-1 text-[11px] text-muted-foreground">{description.length}/2000 · {t("report.descHint")}</p>
                </div>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)}>{t("report.back")}</Button>
                  <Button onClick={submit} disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />} {t("report.submit")}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
}

function Stepper({ step, t }: { step: number; t: (k: string) => string }) {
  const labels = [t("report.step1"), t("report.step2"), t("report.step3")];
  return (
    <div className="flex items-center gap-2">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={l} className="flex items-center gap-2 flex-1">
            <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              done ? "bg-success text-success-foreground" : active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}>{n}</div>
            <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{l}</span>
            {n < labels.length && <div className="h-px flex-1 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}