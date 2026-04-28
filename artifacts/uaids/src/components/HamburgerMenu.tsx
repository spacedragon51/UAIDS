import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Menu, X, LayoutDashboard, Settings, User, LogOut, Home,
  Shield, Bell, ChevronRight, LogIn, UserPlus, Info, Sparkles,
  Stethoscope, Briefcase, Banknote, Github,
} from "lucide-react";

type MenuItem = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  href?: string;
  hash?: string;
  external?: boolean;
};

export default function HamburgerMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close menu whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search, location.hash]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/");
  };

  const handleNavigate = (item: MenuItem) => {
    setOpen(false);
    if (item.external && item.href) {
      window.open(item.href, "_blank", "noopener,noreferrer");
      return;
    }
    if (item.hash) {
      // Scroll to anchor on the homepage
      if (location.pathname !== "/") {
        navigate(`/#${item.hash}`);
        // Defer scroll until after navigation paints
        setTimeout(() => {
          document.getElementById(item.hash!)?.scrollIntoView({ behavior: "smooth" });
        }, 80);
      } else {
        document.getElementById(item.hash)?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }
    if (item.href) navigate(item.href);
  };

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";

  const loggedInItems: MenuItem[] = [
    { icon: Home, label: "Home", href: "/" },
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Stethoscope, label: "Healthcare Audit", href: "/healthcare" },
    { icon: Briefcase, label: "Job Screening", href: "/job-screening" },
    { icon: Banknote, label: "Loan Approval", href: "/loan-approval" },
    { icon: User, label: "Edit Profile", href: "/profile" },
    { icon: Settings, label: "Settings", href: "/settings" },
    { icon: Bell, label: "Alerts", href: "/dashboard" },
  ];

  const loggedOutItems: MenuItem[] = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Sparkles, label: "Services", hash: "services" },
    { icon: Info, label: "About", hash: "about" },
    { icon: Shield, label: "Features", hash: "features" },
    {
      icon: Github,
      label: "GitHub",
      href: "https://github.com/Trusted-AI/AIF360",
      external: true,
    },
  ];

  const menuItems = user ? loggedInItems : loggedOutItems;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="w-9 h-9 rounded-lg border border-border/60 bg-secondary/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary transition-all duration-300 active:scale-90"
        data-testid="button-hamburger-menu"
      >
        <span className="relative inline-block w-4 h-4">
          <Menu
            size={16}
            className={`absolute inset-0 transition-all duration-300 ${open ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"}`}
          />
          <X
            size={16}
            className={`absolute inset-0 transition-all duration-300 ${open ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"}`}
          />
        </span>
      </button>

      <div
        className={`absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl shadow-black/30 z-50 overflow-hidden origin-top-right transition-all duration-200 ease-out ${
          open
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
        }`}
      >
        {user ? (
          <div className="p-4 border-b border-border/60 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                <User size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate capitalize">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email || "Guest session"}
                </p>
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
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => handleNavigate(item)}
              style={{ transitionDelay: open ? `${i * 25}ms` : "0ms" }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all group text-left ${
                open ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
              }`}
            >
              <item.icon size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="flex-1">{item.label}</span>
              <ChevronRight
                size={13}
                className="text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
              />
            </button>
          ))}
        </nav>

        <div className="border-t border-border/60 p-2">
          {user ? (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              data-testid="button-sign-out"
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
    </div>
  );
}
