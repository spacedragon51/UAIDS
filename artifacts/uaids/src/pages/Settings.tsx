import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Moon, Globe, Bell, Shield, Trash2, Home, LayoutDashboard, ArrowLeft, Save, KeyRound, CheckCircle2, Lock } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import HamburgerMenu from "@/components/HamburgerMenu";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function Settings() {
  const { signOut, updatePassword, hasPasswordProvider } = useAuth();
  const isPasswordUser = hasPasswordProvider();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    if (newPassword.length < 6) return setPwError("New password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return setPwError("New passwords do not match.");
    setPwLoading(true);
    try {
      await updatePassword(currentPassword, newPassword);
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setPwError("Current password is incorrect.");
      } else {
        setPwError(err instanceof Error ? err.message : "Could not update password.");
      }
    }
    setPwLoading(false);
  };
  const [notifications, setNotifications] = useState(true);
  const [biasAlerts, setBiasAlerts] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete your account? This will sign you out. (Demo only — no data is deleted)")) {
      signOut();
    }
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)} role="switch" aria-checked={checked}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-secondary border border-border"}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? "left-6" : "left-1"}`} />
    </button>
  );

  return (
    <div className="min-h-screen text-foreground relative">
      <AnimatedBackground variant="subtle" />
      <div className="relative z-10">
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-md sticky top-0 z-40">
        <div className="container max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"><Home size={14} /> Home</Link>
            <Link to="/dashboard" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"><LayoutDashboard size={14} /> Dashboard</Link>
            <ThemeToggle />
            <HamburgerMenu />
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-6 py-12">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <h1 className="text-3xl font-extrabold mb-2">Settings</h1>
        <p className="text-muted-foreground mb-8">Manage your application preferences and notifications.</p>

        <div className="space-y-5">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Moon size={18} className="text-primary" />
              <h2 className="font-semibold">Appearance</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-muted-foreground mt-0.5">Toggle between dark and light mode</p>
              </div>
              <ThemeToggle />
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Globe size={18} className="text-primary" />
              <h2 className="font-semibold">Language & Region</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Language</p>
                <p className="text-xs text-muted-foreground mt-0.5">Interface language</p>
              </div>
              <select className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="en">🇬🇧 English</option>
              </select>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Bell size={18} className="text-primary" />
              <h2 className="font-semibold">Notifications</h2>
            </div>
            <div className="space-y-4">
              {[
                { label: "All Notifications", desc: "Receive notifications for all activity", value: notifications, onChange: setNotifications },
                { label: "Bias Alerts", desc: "Get alerted when high disparity is detected", value: biasAlerts, onChange: setBiasAlerts },
                { label: "Weekly Report", desc: "Receive a weekly fairness summary email", value: weeklyReport, onChange: setWeeklyReport },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <Toggle checked={item.value} onChange={item.onChange} />
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Shield size={18} className="text-primary" />
              <h2 className="font-semibold">Privacy & Data</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Audit Data Retention</p>
                  <p className="text-xs text-muted-foreground mt-0.5">How long audit logs are kept locally</p>
                </div>
                <select className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option>30 days</option>
                  <option>90 days</option>
                  <option>1 year</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-destructive">Clear All Local Data</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Remove all locally stored audit logs and datasets</p>
                </div>
                <button
                  onClick={() => { localStorage.clear(); alert("Local data cleared."); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-destructive/10 text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 size={13} /> Clear Data
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <KeyRound size={18} className="text-primary" />
              <h2 className="font-semibold">Security</h2>
            </div>

            {!isPasswordUser ? (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/60 border border-border/40">
                <Lock size={16} className="text-muted-foreground mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  You signed in with Google. To change your password, manage it from your{" "}
                  <a
                    href="https://myaccount.google.com/security"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    Google account
                  </a>
                  .
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {pwError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive animate-fade-in">
                    {pwError}
                  </div>
                )}
                {pwSuccess && (
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 text-sm text-accent flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 size={14} /> Password updated successfully.
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Current password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">New password</label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        placeholder="Min. 6 characters"
                        className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Confirm new password</label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
                  >
                    {pwLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Updating…
                      </>
                    ) : (
                      <>
                        <KeyRound size={14} /> Update password
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={handleDeleteAccount}
              className="flex items-center gap-2 px-4 py-2.5 border border-destructive/30 text-destructive rounded-lg text-sm hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={15} /> Delete Account
            </button>
            <button onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Save size={15} /> {saved ? "Saved!" : "Save Settings"}
            </button>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
