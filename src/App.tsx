import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Feed from "./pages/Feed.tsx";
import Auth from "./pages/Auth.tsx";
import Report from "./pages/Report.tsx";
import IssueDetail from "./pages/IssueDetail.tsx";
import Admin from "./pages/Admin.tsx";
import AdminAnalytics from "./pages/AdminAnalytics.tsx";
import AdminAnnouncements from "./pages/AdminAnnouncements.tsx";
import Profile from "./pages/Profile.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import NotFound from "./pages/NotFound.tsx";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/lib/i18n";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <I18nProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Feed />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/report" element={<Report />} />
              <Route path="/issue/:id" element={<IssueDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/announcements" element={<AdminAnnouncements />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
