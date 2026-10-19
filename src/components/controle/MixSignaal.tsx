import type { FinancieringsSignaal } from "@/core";
import { Badge } from "@/components/ui/badge";

/**
 * Informatief signaal over meerdere wettelijke kaders. Telt niet mee in de score, daarom een
 * neutrale badge "Info" en geen oranje status.
 */
export function MixSignaal({ signaal }: { signaal: FinancieringsSignaal }) {
  return (
    <div className="flex items-start gap-3 border-t pt-3">
      <Badge variant="outline" className="shrink-0">Info</Badge>
      <div className="text-sm">
        <p className="font-medium">Signaal: meerdere wettelijke kaders</p>
        <p className="text-muted-foreground">{signaal.message}</p>
        <p className="mt-1 text-xs text-muted-foreground">Informatief signaal — telt niet mee in de hoofdscore.</p>
      </div>
    </div>
  );
}
