import { Link } from "react-router-dom";

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 36, showText = true, className = "" }: LogoProps) {
  return (
    <Link
      to="/"
      className={`group flex items-center gap-2.5 transition-transform duration-300 hover:scale-[1.03] active:scale-95 ${className}`}
      aria-label="UAIDS Home"
    >
      <div
        className="relative rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-all duration-500 group-hover:shadow-primary/40 group-hover:rotate-[8deg]"
        style={{ width: size, height: size, background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
      >
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width={size * 0.62} height={size * 0.62} className="drop-shadow">
          <path d="M16 3 L27 7 V16 C27 22.5 22 27.5 16 29 C10 27.5 5 22.5 5 16 V7 Z" fill="hsl(var(--primary-foreground))" fillOpacity="0.96" />
          <circle cx="16" cy="14" r="3.2" fill="hsl(var(--primary))" />
          <path d="M10 22 C12 18.5 20 18.5 22 22" stroke="hsl(var(--primary))" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <circle cx="16" cy="14" r="5.5" stroke="hsl(var(--accent))" strokeWidth="1" fill="none" opacity="0.7" />
        </svg>
        <span className="absolute inset-0 rounded-xl bg-primary/0 group-hover:bg-primary/10 transition-colors" />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">UAIDS</span>
          <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Fairness AI</span>
        </div>
      )}
    </Link>
  );
}
