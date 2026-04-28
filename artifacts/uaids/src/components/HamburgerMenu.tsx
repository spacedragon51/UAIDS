import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Menu, X, LayoutDashboard, Settings, User, LogOut, Home,
  Shield, Bell, HelpCircle, ChevronRight, LogIn, UserPlus, Info, Sparkles
} from "lucide-react";

export default function HamburgerMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [navigate]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/");
  };

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";

  const loggedInItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: User, label: "Edit Profile", href: "/profile" },
    { icon: Settings, label: "Settings", href: "/settings" },
    { icon: Shield, label: "Audit Trail", href: "/dashboard" },
    { icon: Bell, label: "Alerts", href: "/dashboard" },
    { icon: HelpCircle, label: "Help & Docs", href: "#" },
  ];

  const loggedOutItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Sparkles, label: "Services", href: "/#services" },
    { icon: Info, label: "About", href: "/#about" },
    { icon: Shield, label: "Features", href: "/#features" },
    { icon: HelpCircle, label: "Help & Docs", href: "#" },
  ];

  const menuItems = user ? loggedInItems : loggedOutItems;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Open menu"
        className="w-9 h-9 rounded-lg border border-border/60 bg-secondary/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary transition-all duration-300 active:scale-90"
      >
        {open ? <X size={16} /> : <Menu size={16} />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl shadow-black/30 z-50 overflow-hidden">
          {user ? (
            <div className="p-4 border-b border-border/60 bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <User size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate capitalize">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 border-b border-border/60 bg-primary/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Welcome to UAIDS</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sign in to access fairness audits, datasets, and dashboards.
              </p>
            </div>
          )}

          <nav className="py-2">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors group"
              >
                <item.icon size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight size={13} className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
              </Link>
            ))}
          </nav>

          <div className="border-t border-border/60 p-2">
            {user ? (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            ) : (
              <div className="flex flex-col gap-1.5 p-1">
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors justify-center"
                >
                  <LogIn size={14} /> Sign In
                </Link>
                <Link
                  to="/auth?mode=register"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors justify-center"
                >
                  <UserPlus size={14} /> Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
