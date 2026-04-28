import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { firebaseConfigured } from "@/lib/firebase";
import Homepage from "@/pages/Homepage";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import JobScreening from "@/pages/JobScreening";
import Healthcare from "@/pages/Healthcare";
import HealthcareHub from "@/pages/HealthcareHub";
import LoanApproval from "@/pages/LoanApproval";
import { ReactNode } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  // When auth isn't configured in this environment, allow viewing protected pages
  // so the app remains usable. Real auth gating resumes once Firebase env vars are set.
  if (!user && firebaseConfigured) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <BrowserRouter basename={base}>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/job-screening/*" element={<ProtectedRoute><JobScreening /></ProtectedRoute>} />
        <Route path="/healthcare" element={<ProtectedRoute><HealthcareHub /></ProtectedRoute>} />
        <Route path="/healthcare/melanoma" element={<ProtectedRoute><Healthcare /></ProtectedRoute>} />
        <Route path="/loan-approval" element={<ProtectedRoute><LoanApproval /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppRoutes />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
