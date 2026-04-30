import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Building2, LayoutDashboard, ListChecks, PlusCircle, LogOut, Shield, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NotificationsBell } from "@/components/NotificationsBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero shadow-soft">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">CivicReport</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Public issues</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavItem to="/" icon={ListChecks} label={t("nav.issues")} />
            {/* Citizens-only: report + dashboard + profile */}
            {!isAdmin && <NavItem to="/report" icon={PlusCircle} label={t("nav.report")} />}
            {user && !isAdmin && <NavItem to="/dashboard" icon={LayoutDashboard} label={t("nav.dashboard")} />}
            {user && !isAdmin && <NavItem to="/profile" icon={Award} label={t("nav.me")} />}
            {/* Admins: single tabbed admin entry */}
            {isAdmin && <NavItem to="/admin" icon={Shield} label={t("nav.admin")} />}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {user ? (
              <>
                <NotificationsBell />
                {profile && !isAdmin && (
                  <Badge variant="outline" className="hidden sm:flex gap-1 border-accent/40 bg-accent/10 text-accent-foreground">
                    <Award className="h-3 w-3 text-accent" />
                    <span className="text-foreground">{profile.points} {t("dash.points")}</span>
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate("/auth"))}>
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("nav.signout")}</span>
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => navigate("/auth")}>{t("nav.signin")}</Button>
            )}
          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur">
          <div className="grid grid-cols-3">
            <MobileNavItem to="/" icon={ListChecks} label={t("nav.issues")} />
            {isAdmin ? (
              <>
                <MobileNavItem to="/admin" icon={Shield} label={t("nav.admin")} />
                <MobileNavItem to="/auth" icon={LogOut} label={t("nav.signout")} />
              </>
            ) : (
              <>
                <MobileNavItem to="/report" icon={PlusCircle} label={t("nav.report")} />
                <MobileNavItem to="/dashboard" icon={LayoutDashboard} label={t("nav.dashboard")} />
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="container py-6 pb-24 md:pb-10">{children}</main>
    </div>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        }`
      }
    >
      <Icon className="h-4 w-4" /> {label}
    </NavLink>
  );
}

function MobileNavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 py-2.5 text-xs ${isActive ? "text-primary" : "text-muted-foreground"}`
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}
