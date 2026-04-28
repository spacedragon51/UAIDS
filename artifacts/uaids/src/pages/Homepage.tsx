import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Shield, ArrowRight, CheckCircle, BarChart3, FileSearch, Lock,
  Users, Zap, ChevronDown, Menu, X, LayoutDashboard, LogOut,
  Brain, Scale, AlertTriangle, TrendingUp, FileText, Cpu
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedBackground from "@/components/AnimatedBackground";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import HamburgerMenu from "@/components/HamburgerMenu";
import WelcomeBackSection from "@/components/WelcomeBackSection";
import LoggedInHighlights from "@/components/LoggedInHighlights";
import { useAuth } from "@/hooks/useAuth";

export default function Homepage() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen text-foreground relative">
      <AnimatedBackground />
      <div className="relative z-10">
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Logo />
            <div className="hidden md:flex items-center gap-1">
              {["services", "about", "features"].map((s) => (
                <button key={s} onClick={() => scrollTo(s)}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary capitalize">
                  {t(`home.nav.${s}`)}
                </button>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
              {user ? (
                <>
                  <Link to="/dashboard"
                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center gap-1.5">
                    <LayoutDashboard size={14} /> Dashboard
                  </Link>
                  <button onClick={signOut} title="Sign out"
                    className="p-2 text-muted-foreground hover:text-destructive rounded-lg border border-border/60 hover:border-destructive/40 transition-all active:scale-90">
                    <LogOut size={16} />
                  </button>
                </>
              ) : (
                <>
                  <Link to="/auth"
                    className="px-3 py-2 text-sm font-medium text-foreground rounded-lg border border-border hover:bg-secondary transition-all duration-200 hover:-translate-y-0.5 active:scale-95">
                    {t("home.nav.login")}
                  </Link>
                  <Link to="/auth?mode=register"
                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 hover:shadow-lg hover:shadow-primary/30 flex items-center gap-1.5">
                    Register <ArrowRight size={14} />
                  </Link>
                </>
              )}
              <HamburgerMenu />
            </div>
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <HamburgerMenu />
              <button
                className="p-2 text-muted-foreground rounded-lg border border-border/60 hover:bg-secondary transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle navigation"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="md:hidden border-t border-border/50 py-4 space-y-2 animate-fade-in">
              {["services", "about", "features"].map((s) => (
                <button key={s} onClick={() => scrollTo(s)}
                  className="block w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary capitalize">
                  {t(`home.nav.${s}`)}
                </button>
              ))}
              <div className="pt-2 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-between gap-2 px-1">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
                {user ? (
                  <>
                    <Link to="/dashboard" className="block px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg text-center">
                      Dashboard
                    </Link>
                    <button onClick={signOut} className="block w-full px-3 py-2 text-sm font-medium border border-border rounded-lg text-center">
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/auth" className="block px-3 py-2 text-sm font-medium border border-border rounded-lg text-center">
                      {t("home.nav.login")}
                    </Link>
                    <Link to="/auth?mode=register" className="block px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg text-center">
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {user && <WelcomeBackSection />}

      {!user && (
        <section className="pt-32 pb-20 px-4 sm:px-6">
          <div className="container max-w-7xl mx-auto text-center">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
                <Zap size={14} /> {t("home.hero.badge")}
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
                <span className="gradient-text-primary">{t("home.hero.title1")}</span>
                <br />
                <span className="text-foreground">{t("home.hero.title2")}</span>
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-10">
                {t("home.hero.description")}
              </p>
            </ScrollReveal>
            <ScrollReveal delay={300}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/auth?mode=register"
                  className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:scale-95 flex items-center justify-center gap-2">
                  {t("home.hero.getStarted")} <ArrowRight size={18} />
                </Link>
                <button onClick={() => scrollTo("services")}
                  className="w-full sm:w-auto px-6 py-3 border border-border text-foreground rounded-lg font-medium hover:bg-secondary transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2">
                  {t("home.hero.learnMore")} <ChevronDown size={18} />
                </button>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
              {[
                { val: "3+", label: t("home.hero.stat1") },
                { val: "99.9%", label: t("home.hero.stat2") },
                { val: "24/7", label: t("home.hero.stat3") },
                { val: "7yr", label: t("home.hero.stat4") },
              ].map((s, i) => (
                <ScrollReveal key={s.label} delay={100 * i}>
                  <div className="glass-card p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{s.val}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="services" className="py-20 px-4 sm:px-6 bg-card/30">
        <div className="container max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">{t("home.services.title")}</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">{t("home.services.subtitle")}</p>
            </div>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: t("home.services.detect.title"), desc: t("home.services.detect.desc"), color: "text-primary" },
              { icon: Scale, title: t("home.services.measure.title"), desc: t("home.services.measure.desc"), color: "text-accent" },
              { icon: AlertTriangle, title: t("home.services.mitigate.title"), desc: t("home.services.mitigate.desc"), color: "text-warning" },
              { icon: TrendingUp, title: t("home.services.monitor.title"), desc: t("home.services.monitor.desc"), color: "text-chart-4" },
              { icon: FileText, title: t("home.services.compliance.title"), desc: t("home.services.compliance.desc"), color: "text-accent" },
              { icon: Cpu, title: t("home.services.api.title"), desc: t("home.services.api.desc"), color: "text-primary" },
            ].map((s, i) => (
              <ScrollReveal key={s.title} delay={80 * i}>
                <div className="glass-card p-6 hover-lift hover:border-primary/30 group h-full">
                  <s.icon className={`${s.color} mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`} size={28} />
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="py-20 px-4 sm:px-6">
        <div className="container max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal direction="left">
              <div>
                <h2 className="text-3xl sm:text-4xl font-extrabold mb-6">{t("home.about.title")}</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">{t("home.about.desc1")}</p>
                <p className="text-muted-foreground mb-8 leading-relaxed">{t("home.about.desc2")}</p>
                <div className="space-y-3">
                  {[t("home.about.point1"), t("home.about.point2"), t("home.about.point3"), t("home.about.point4")].map((p) => (
                    <div key={p} className="flex items-start gap-2.5">
                      <CheckCircle size={18} className="text-accent mt-0.5 shrink-0" />
                      <span className="text-sm">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="right">
              <div className="glass-card p-8 space-y-6">
                <h3 className="text-xl font-bold mb-2">{t("home.about.pipeline")}</h3>
                {[
                  { step: "01", label: t("home.about.step1"), icon: FileSearch },
                  { step: "02", label: t("home.about.step2"), icon: BarChart3 },
                  { step: "03", label: t("home.about.step3"), icon: Shield },
                  { step: "04", label: t("home.about.step4"), icon: Lock },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">{s.step}</div>
                    <div className="flex-1 text-sm font-medium">{s.label}</div>
                    <s.icon size={18} className="text-muted-foreground" />
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {user ? (
        <LoggedInHighlights />
      ) : (
        <>
          <section id="features" className="py-20 px-4 sm:px-6">
            <div className="container max-w-7xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-14">
                  <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">{t("home.features.title")}</h2>
                  <p className="text-muted-foreground max-w-xl mx-auto">{t("home.features.subtitle")}</p>
                </div>
              </ScrollReveal>
              <div className="max-w-2xl mx-auto">
                <ScrollReveal>
                  <div className="glass-card p-8 border-primary/20">
                    <div className="flex items-center gap-3 mb-6">
                      <Users size={24} className="text-primary" />
                      <div>
                        <h3 className="text-xl font-bold">{t("home.features.solo.title")}</h3>
                        <p className="text-xs text-muted-foreground">{t("home.features.solo.subtitle")}</p>
                      </div>
                    </div>
                    <ul className="space-y-3">
                      {[1,2,3,4,5,6].map((i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle size={16} className="text-primary mt-0.5 shrink-0" />
                          <span>{t(`home.features.solo.f${i}`)}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/auth?mode=register"
                      className="mt-6 block w-full text-center py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors">
                      {t("home.features.solo.cta")}
                    </Link>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </section>

          <section className="py-20 px-4 sm:px-6 bg-card/30">
            <div className="container max-w-3xl mx-auto text-center">
              <ScrollReveal>
                <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">{t("home.cta.title")}</h2>
                <p className="text-muted-foreground mb-8">{t("home.cta.desc")}</p>
                <Link to="/auth?mode=register"
                  className="inline-flex px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors items-center gap-2">
                  {t("home.hero.getStarted")} <ArrowRight size={18} />
                </Link>
              </ScrollReveal>
            </div>
          </section>
        </>
      )}

      <footer className="bg-black text-white py-12 px-4 sm:px-6">
        <div className="container max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mb-10">
            <div className="col-span-2 sm:col-span-1">
              <Logo />
              <p className="text-xs text-white/60 leading-relaxed mt-3">{t("home.footer.brand")}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">{t("home.footer.quickLinks")}</h4>
              <ul className="space-y-2">
                {["services", "about", "features"].map((s) => (
                  <li key={s}>
                    <button onClick={() => scrollTo(s)} className="text-xs text-white/60 hover:text-white transition-colors capitalize">
                      {t(`home.nav.${s}`)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">{t("home.footer.services")}</h4>
              <ul className="space-y-2 text-xs text-white/60">
                <li>{t("home.services.detect.title")}</li>
                <li>{t("home.services.measure.title")}</li>
                <li>{t("home.services.mitigate.title")}</li>
                <li>{t("home.services.compliance.title")}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
            <span>© {new Date().getFullYear()} UAIDS. {t("home.footer.rights")}</span>
            <span>{t("home.footer.tagline")}</span>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
