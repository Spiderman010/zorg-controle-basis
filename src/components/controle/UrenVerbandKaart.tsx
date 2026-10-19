import { Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/controle/StatusBadge";
import type { UrenVerbandRegel, UrenVerbandResultaat } from "@/core";
import { uitlegRegel } from "@/lib/uren-controle-uitleg";
import { cn } from "@/lib/utils";

const uren = (n: number) => n.toLocaleString("nl-NL", { maximumFractionDigits: 1 });
const pct = (n: number | undefined) =>
  n === undefined ? "-" : `${n > 0 ? "+" : ""}${(n * 100).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%`;

/** Het deel van een project dat de weergave nodig heeft: naam, rol en opdrachtgever. */
export interface ProjectRef {
  id: string;
  naam?: string;
  rol?: string;
  via_id?: string;
}

/**
 * Verbandcontrole gedeclareerde tegen gewerkte uren, per kostenplaats. Dezelfde berekening
 * telt als kerncontrole V1-C10 mee in de hoofdscore; deze kaart toont het detail.
 *
 * Cliënten staan als eigen regel, zoals in de hoofdscore. Bij een oranje of rode kostenplaats
 * worden ze onder die kostenplaats getoond (uitsplitsing). Bij een groene kostenplaats staan ze
 * gewoon in de lijst, met de opdrachtgever erbij, zodat niets verdwijnt.
 */
export function UrenVerbandKaart({
  resultaat,
  projecten = [],
  herkomstRegel,
}: {
  resultaat: UrenVerbandResultaat;
  projecten?: ProjectRef[];
  /** Bewijsniveau van de uren-bronnen; alleen weergave, verandert de uitkomst niet. */
  herkomstRegel?: string;
}) {
  const r = resultaat;
  const perId = new Map(projecten.map((p) => [p.id, p]));
  const statusVan = new Map(r.regels.map((x) => [x.project_id, x.status]));
  const naamVan = (id: string) => perId.get(id)?.naam ?? r.regels.find((x) => x.project_id === id)?.naam ?? id;
  const viaVan = (id: string): string | undefined => {
    const p = perId.get(id);
    return p?.rol === "client" && p.via_id ? p.via_id : undefined;
  };

  const kinderen = new Map<string, UrenVerbandRegel[]>();
  const rijen: { regel: UrenVerbandRegel; via?: string }[] = [];
  for (const x of r.regels) {
    const via = viaVan(x.project_id);
    const ouderStatus = via ? statusVan.get(via) : undefined;
    if (via && (ouderStatus === "rood" || ouderStatus === "oranje")) {
      kinderen.set(via, [...(kinderen.get(via) ?? []), x]);
      continue;
    }
    rijen.push({ regel: x, via: via ? naamVan(via) : undefined });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Uren-controle: gedeclareerd tegen gewerkt</h2>
        <p className="text-xs text-muted-foreground">Telt mee in de hoofdscore (V1-C10)</p>
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
                      <th className="px-3 py-2 text-left">Uitleg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rijen.map(({ regel, via }) => (
                      <Fragment key={regel.project_id}>
                        <Rij regel={regel} via={via} clientLabel={viaVan(regel.project_id) !== undefined} />
                        {(kinderen.get(regel.project_id) ?? []).map((k) => (
                          <Rij key={k.project_id} regel={k} genest clientLabel />
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t p-4 text-xs text-muted-foreground">
                De app past niets aan. De uren komen van de klant; de beslissing ligt bij de klant of het bronsysteem.
              </p>
            </>
          )}
          {herkomstRegel && <p className="border-t p-4 text-xs text-muted-foreground">{herkomstRegel}</p>}
        </CardContent>
      </Card>
    </section>
  );
}

function Rij({ regel: x, via, genest, clientLabel }: { regel: UrenVerbandRegel; via?: string; genest?: boolean; clientLabel?: boolean }) {
  const u = uitlegRegel(x);
  return (
    <tr className="border-t align-top" data-regel={x.project_id} data-nested={genest ? "ja" : undefined}>
      <td className={cn("px-3 py-2", genest && "pl-8")}>
        {x.naam}
        {clientLabel && <span className="ml-2 text-xs text-muted-foreground">cliënt</span>}
        {via && <span className="block text-xs text-muted-foreground">via {via}</span>}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{x.status === "grijs" ? "-" : uren(x.declared_hours)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{uren(x.worked_hours)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{pct(x.afwijking)}</td>
      <td className="px-3 py-2">
        <StatusBadge status={x.status} />
      </td>
      <td className="px-3 py-2">
        <p>{u.uitleg}</p>
        <p className="mt-1 font-medium">{u.watNu}</p>
      </td>
    </tr>
  );
}
