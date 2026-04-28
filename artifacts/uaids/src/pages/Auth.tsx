import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield, Mail, Lock, User, ArrowRight, Home, Sparkles, LogIn, UserPlus, X, CheckCircle2, UserCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

export default function Auth() {
  const { t } = useTranslation();
  const { user, signIn, signUp, signInWithGoogle, signInAsGuest, sendPasswordReset } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setIsLogin(params.get("mode") !== "register");
    setError(null);
  }, [location.search]);

  const switchMode = (toLogin: boolean) => {
    if (toLogin === isLogin) return;
    setError(null);
    navigate(toLogin ? "/auth" : "/auth?mode=register", { replace: true });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!email.includes("@")) throw new Error("Please enter a valid email address.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      if (isLogin) await signIn(email, password);
      else await signUp(email, password, displayName.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    }
    setGoogleLoading(false);
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    setError(null);
    try {
      await signInAsGuest();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Guest sign-in failed.");
    }
    setGuestLoading(false);
  };

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-primary/20 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-40 w-[520px] h-[520px] rounded-full bg-accent/20 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-40 left-1/3 w-[460px] h-[460px] rounded-full bg-chart-4/20 blur-3xl animate-blob animation-delay-4000" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/50 backdrop-blur">
        <Logo />
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"
          >
            <Home size={14} /> Home
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </nav>

      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg shadow-primary/30 transition-transform duration-500 hover:rotate-6"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
            >
              <Shield size={28} className="text-white" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-4">
              <Sparkles size={14} /> AI Fairness Platform
            </div>
            <h1 className="text-2xl font-extrabold mb-1 transition-all duration-300">
              {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Sign in to access your fairness dashboard" : "Create your free account to get started"}
            </p>
          </div>

          <div className="glass-card p-6 sm:p-8 backdrop-blur-xl border border-border/60 shadow-2xl shadow-primary/5">
            {/* Toggle pill */}
            <div className="relative grid grid-cols-2 mb-6 p-1 rounded-xl bg-secondary/70 border border-border/60">
              <span
                aria-hidden
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-gradient-to-r from-primary to-accent shadow-md transition-transform duration-300 ease-out"
                style={{ transform: isLogin ? "translateX(4px)" : "translateX(calc(100% + 4px))" }}
              />
              <button
                type="button"
                onClick={() => switchMode(true)}
                className={`relative z-10 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-colors ${isLogin ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LogIn size={14} /> Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode(false)}
                className={`relative z-10 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-colors ${!isLogin ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                <UserPlus size={14} /> Register
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive animate-fade-in">
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4" key={isLogin ? "login" : "register"}>
              <div
                className={`grid transition-all duration-300 ease-out ${isLogin ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}
              >
                <div className="overflow-hidden">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("auth.displayName")}</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your display name"
                      autoComplete="name"
                      className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("auth.email")}</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("auth.password")}</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email);
                        setResetError(null);
                        setResetSent(false);
                        setResetOpen(true);
                      }}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Min. 6 characters"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t("auth.pleaseWait")}
                  </>
                ) : (
                  <>
                    {isLogin ? t("auth.signIn") : "Create Account"} <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or continue with</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading || loading || guestLoading}
              className="w-full py-2.5 bg-secondary border border-border rounded-lg font-semibold text-sm text-foreground hover:bg-secondary/70 hover:border-primary/40 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {googleLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.86 2.69-6.61z" />
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.34A9 9 0 0 0 9 18z" />
                    <path fill="#FBBC05" d="M3.95 10.7A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.34z" />
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A8.97 8.97 0 0 0 9 0 9 9 0 0 0 .96 4.96l2.99 2.34C4.66 5.17 6.65 3.58 9 3.58z" />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleGuest}
              disabled={googleLoading || loading || guestLoading}
              className="mt-3 w-full py-2.5 bg-transparent border border-dashed border-border rounded-lg font-semibold text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary/40 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              data-testid="button-guest-login"
            >
              {guestLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                  Entering as guest…
                </>
              ) : (
                <>
                  <UserCircle2 size={16} />
                  Login as Guest
                </>
              )}
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Explore the platform with read-only sample data. No email required.
            </p>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              {isLogin ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button onClick={() => switchMode(false)} className="text-primary font-semibold hover:underline">
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button onClick={() => switchMode(true)} className="text-primary font-semibold hover:underline">
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-4">
            Protected by Firebase. Your audit data stays scoped to your account.
          </p>
        </div>
      </div>

      {resetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setResetOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "slideUp 0.3s ease-out both" }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Mail size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Reset password</h3>
                  <p className="text-xs text-muted-foreground">We&apos;ll email you a reset link.</p>
                </div>
              </div>
              <button
                onClick={() => setResetOpen(false)}
                className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {resetSent ? (
              <div className="text-center py-4">
                <div className="inline-flex w-12 h-12 rounded-full bg-accent/15 text-accent items-center justify-center mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-sm font-semibold">Check your inbox</p>
                <p className="text-xs text-muted-foreground mt-1">
                  If an account exists for <span className="font-medium text-foreground">{resetEmail}</span>, a password reset link has been sent.
                </p>
                <button
                  onClick={() => setResetOpen(false)}
                  className="mt-5 w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setResetError(null);
                  if (!resetEmail.includes("@")) {
                    setResetError("Please enter a valid email address.");
                    return;
                  }
                  setResetLoading(true);
                  try {
                    await sendPasswordReset(resetEmail);
                    setResetSent(true);
                  } catch (err) {
                    setResetError(err instanceof Error ? err.message : "Could not send reset email.");
                  }
                  setResetLoading(false);
                }}
                className="space-y-3"
              >
                {resetError && (
                  <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                    {resetError}
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      autoFocus
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {resetLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>Send reset link <ArrowRight size={14} /></>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
