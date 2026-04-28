interface Props {
  variant?: "default" | "subtle";
}

export default function AnimatedBackground({ variant = "default" }: Props) {
  const intensity = variant === "subtle" ? 0.7 : 1;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Base theme color so nothing shows through */}
      <div className="absolute inset-0 bg-background" />

      {/* Soft theme-aware wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-accent/[0.08] dark:from-primary/[0.12] dark:via-transparent dark:to-accent/[0.14]" />

      {/* Animated color blobs (green/teal palette matching login page) */}
      <div
        className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full bg-primary blur-3xl animate-blob"
        style={{ opacity: 0.18 * intensity }}
      />
      <div
        className="absolute top-1/4 -right-48 w-[600px] h-[600px] rounded-full bg-accent blur-3xl animate-blob animation-delay-2000"
        style={{ opacity: 0.22 * intensity }}
      />
      <div
        className="absolute -bottom-48 left-1/4 w-[540px] h-[540px] rounded-full bg-chart-2 blur-3xl animate-blob animation-delay-4000"
        style={{ opacity: 0.2 * intensity }}
      />
      <div
        className="absolute top-2/3 right-1/4 w-[420px] h-[420px] rounded-full bg-primary blur-3xl animate-blob"
        style={{ opacity: 0.14 * intensity, animationDelay: "6s" }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.06] dark:opacity-[0.09]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
    </div>
  );
}
