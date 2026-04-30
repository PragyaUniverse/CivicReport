import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Loader2, Shield, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const credSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(72),
});

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const isAdmin = !!r?.some((x: any) => x.role === "admin");
      navigate(isAdmin ? "/admin" : "/dashboard", { replace: true });
    });
  }, [navigate]);

  const routeAfterAuth = async (uid: string) => {
    const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    const isAdmin = !!r?.some((x: any) => x.role === "admin");
    if (role === "admin" && !isAdmin) {
      await supabase.auth.signOut();
      toast.error("This account is not an administrator. Sign in as a user instead.");
      return;
    }
    if (role === "user" && isAdmin) {
      // Admins selecting User portal — allow but route to admin to avoid confusion? Send to dashboard as requested.
    }
    navigate(isAdmin && role === "admin" ? "/admin" : "/dashboard", { replace: true });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.user) await routeAfterAuth(data.user.id);
    toast.success("Welcome back");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "admin") {
      toast.error("Admin accounts cannot self-register. Ask an existing administrator to grant you the admin role.");
      return;
    }
    const parsed = credSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName.trim() || email.split("@")[0] },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    if (data.user) await routeAfterAuth(data.user.id);
    else navigate("/dashboard", { replace: true });
  };

  const handleGoogle = async () => {
    if (role === "admin") {
      toast.error("Admin sign-in via Google is supported, but only if your account already has the admin role.");
    }
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setLoading(false);
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    setLoading(false);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await routeAfterAuth(session.user.id);
    else navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CivicReport</h1>
            <p className="text-sm text-muted-foreground">Report and track public issues in your area</p>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="mb-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sign in as</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("user")}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                  role === "user" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserIcon className="h-4 w-4" /> Citizen
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                  role === "admin" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <Shield className="h-4 w-4" /> Administrator
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {role === "admin"
                ? "Admin sign-in only — accounts must already have admin access."
                : "Citizens can report and track issues in their area."}
            </p>
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup" disabled={role === "admin"}>Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3 mt-4">
                <Field id="email" label="Email" type="email" value={email} onChange={setEmail} />
                <Field id="password" label="Password" type="password" value={password} onChange={setPassword} />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sign in {role === "admin" ? "as admin" : "as citizen"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3 mt-4">
                <Field id="name" label="Full name" type="text" value={fullName} onChange={setFullName} />
                <Field id="email2" label="Email" type="email" value={email} onChange={setEmail} />
                <Field id="password2" label="Password" type="password" value={password} onChange={setPassword} />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />} Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">Or continue with</span></div>
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
            <GoogleIcon /> Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ id, label, type, value, onChange }: { id: string; label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required maxLength={255} />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
  );
}