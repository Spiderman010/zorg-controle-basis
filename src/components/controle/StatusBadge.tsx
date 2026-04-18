import type { CheckStatus } from "@/core";
import { cn } from "@/lib/utils";

const STYLES: Record<CheckStatus, string> = {
  groen: "bg-success/15 text-success border-success/30",
  oranje: "bg-warning/15 text-warning border-warning/30",
  rood: "bg-destructive/15 text-destructive border-destructive/30",
  grijs: "bg-muted text-muted-foreground border-border",
};

const LABELS: Record<CheckStatus, string> = {
  groen: "Groen",
  oranje: "Oranje",
  rood: "Rood",
  grijs: "Grijs",
};

export function StatusBadge({ status, className }: { status: CheckStatus; className?: string }) {
  return (
    <span
      data-status={LABELS[status]}
      className={cn(
        "status-badge inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STYLES[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  );
}
