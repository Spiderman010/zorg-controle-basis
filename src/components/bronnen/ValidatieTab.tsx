import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BRON_LABELS, type BronBestand, valideerBron } from "@/lib/bronnen";
import { cn } from "@/lib/utils";

interface Props {
  bronnen: BronBestand[];
  dossierId: string;
}

const KLEUR: Record<"groen" | "oranje" | "rood", string> = {
  groen: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  oranje: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",
  rood: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400",
};

export default function ValidatieTab({ bronnen, dossierId }: Props) {
  const actief = bronnen.filter((b) => b.type !== "niet_gebruiken");

  if (actief.length === 0) {
    return <p className="text-sm text-muted-foreground">Nog geen bronnen geüpload.</p>;
  }

  const resultaten = actief.map((b) => ({ b, r: valideerBron(b) }));
  const fouten = resultaten.reduce((s, x) => s + x.r.fouten.length, 0);
  const waarsch = resultaten.reduce((s, x) => s + x.r.waarschuwingen.length, 0);

  const allesGoed = fouten === 0 && waarsch === 0;

  return (
    <div className="space-y-4">
      {allesGoed ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          Alle bronnen zijn geldig. Je kunt doorgaan naar de volgende stap.
        </div>
      ) : (
        <div className="rounded-md border bg-muted/40 p-4 text-sm">
          {fouten} fout(en) en {waarsch} waarschuwing(en) gevonden. Je kunt herstellen, doorgaan of later aanvullen.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {resultaten.map(({ b, r }) => (
          <Card key={b.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="truncate">
                  {b.bestandsnaam}{" "}
                  <span className="text-muted-foreground">({BRON_LABELS[b.type]})</span>
                </span>
                <Badge className={cn("border", KLEUR[r.status])}>{r.status.toUpperCase()}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {r.fouten.length > 0 && (
                <Sectie titel="Fouten" kleur="text-red-600" items={r.fouten} />
              )}
              {r.waarschuwingen.length > 0 && (
                <Sectie titel="Waarschuwingen" kleur="text-amber-600" items={r.waarschuwingen} />
              )}
              {r.signalen.length > 0 && (
                <Sectie titel="Signalen" kleur="text-muted-foreground" items={r.signalen} />
              )}
              {r.fouten.length + r.waarschuwingen.length + r.signalen.length === 0 && (
                <p className="text-xs text-muted-foreground">Geen bevindingen.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <Button asChild variant="outline">
          <Link to={`/dossiers/${dossierId}`}>Later aanvullen</Link>
        </Button>
        <Button variant="outline" disabled={fouten === 0}>
          Herstellen
        </Button>
        <Button disabled={fouten > 0}>Doorgaan</Button>
      </div>
    </div>
  );
}

function Sectie({ titel, kleur, items }: { titel: string; kleur: string; items: string[] }) {
  return (
    <div>
      <div className={cn("text-xs font-medium uppercase", kleur)}>{titel}</div>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
        {items.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  );
}
