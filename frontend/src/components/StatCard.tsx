export default function StatCard({ label, value = "", color = "primary", subtitle }: { 
  label: string; 
  value: string | number; 
  color?: "primary" | "success" | "warning" | "error" | "info" | "cyan" | "lilac" | "magenta" | "orange";
  subtitle?: string;
}
) {
  const indicatorColors: Record<string, string> = {
    primary: 'bg-brand-primary',
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    error: 'bg-status-error',
    info: 'bg-status-info',
    cyan: 'bg-brand-cyan',
    lilac: 'bg-brand-lilac',
    magenta: 'bg-brand-magenta',
    orange: 'bg-brand-orange',
  };

  return (
    <div className="bg-white rounded-lg shadow-card border border-neutral-border p-5 transition-all duration-200 hover:shadow-hover">
      <p className="text-xs font-medium text-neutral-mid uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-3 mt-2">
        <span className={`text-[var(--text-3xl-size)] leading-none font-bold ${color === "primary" ? "text-brand-primary" : "text-neutral-black"}`}>
          {value}
        </span>
        <span className={`h-2 w-2 rounded-full ${indicatorColors[color] || indicatorColors.primary}`} />
      </div>
      {subtitle && <p className="text-[var(--text-xs-size)] leading-[var(--text-xs-line)] text-neutral-mid mt-1">{subtitle}</p>}
    </div>
  );
}
