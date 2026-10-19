import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/controle/StatusBadge";
import type { UrenVerbandResultaat } from "@/core";

const uren = (n: number) => n.toLocaleString("nl-NL", { maximumFractionDigits: 1 });
const pct = (n: number | undefined) =>
  n === undefined ? "-" : `${n > 0 ? "+" : ""}${(n * 100).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%`;

/**
 * Verbandcontrole gedeclareerde tegen gewerkte uren. Voorlopig apart getoond:
 * telt niet mee in de hoofdscore (zoals de financieringsmix en de projectanalyse).
 */
export function UrenVerbandKaart({ resultaat }: { resultaat: UrenVerbandResultaat }) {
  const r = resultaat;
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Uren-controle: gedeclareerd tegen gewerkt</h2>
        <p className="text-xs text-muted-foreground">Voorlopig apart getoond — telt niet mee in de hoofdscore</p>
      </div>
      <Card>
        <CardContent className="p-0">
          {!r.uitvoerbaar ? (
            <div className="flex items-start gap-3 p-4">
              <StatusBadge status="grijs" />
              <p className="text-sm text-muted-foreground">
                Niet uitvoerbaar: {r.reden_niet_uitvoerbaar}. Upload een bron met gedeclareerde uren en directe uren.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b p-4 text-sm">
                <StatusBadge status={r.status} />
                <span className="text-muted-foreground">
                  {r.aantal.groen} groen · {r.aantal.oranje} oranje · {r.aantal.rood} rood · {r.aantal.grijs} niet vergelijkbaar
                </span>
                <span className="ml-auto tabular-nums text-muted-foreground">
                  Totaal vergelijkbaar: {uren(r.totaal_declared)} gedeclareerd, {uren(r.totaal_worked)} gewerkt
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left">Kostenplaats</th>
                      <th className="px-3 py-2 text-right">Gedeclareerd</th>
                      <th className="px-3 py-2 text-right">Gewerkt</th>
                      <th className="px-3 py-2 text-right">Afwijking</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Toelichting</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.regels.map((x) => (
                      <tr key={x.project_id} className="border-t align-top">
                        <td className="px-3 py-2">{x.naam}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{x.status === "grijs" ? "-" : uren(x.declared_hours)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{uren(x.worked_hours)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pct(x.afwijking)}</td>
                        <td className="px-3 py-2"><StatusBadge status={x.status} /></td>
                        <td className="px-3 py-2 text-muted-foreground">{x.reden}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
