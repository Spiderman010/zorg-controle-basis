import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BRON_LABELS,
  CLASSIFICEERBARE_TYPES,
  type BronBestand,
  type BronType,
  type Classificatie,
  upsertBron,
} from "@/lib/bronnen";

interface Props {
  bronnen: BronBestand[];
  onChange: () => void;
}

const KNOPPEN: Record<string, { label: string; value: Classificatie }[]> = {
  zorgopbrengsten: [
    { label: "Meetellen", value: "meetellen" },
    { label: "Niet meetellen", value: "niet_meetellen" },
    { label: "Twijfel", value: "twijfel" },
  ],
  inhuur: [
    { label: "Zorginhuur", value: "zorginhuur" },
    { label: "Overige inkoop", value: "overige_inkoop" },
    { label: "Twijfel", value: "twijfel" },
  ],
  directe_uren: [
    { label: "Direct", value: "direct" },
    { label: "Niet-productief", value: "niet_productief" },
    { label: "Onbekend", value: "onbekend" },
  ],
};

const TITELS: Record<string, string> = {
  zorgopbrengsten: "Zorgopbrengsten — meetellen / niet meetellen / twijfel",
  inhuur: "Inhuur — zorginhuur / overige inkoop / twijfel",
  directe_uren: "Activiteiten — direct / niet-productief / onbekend",
};

export default function ClassificatieTab({ bronnen, onChange }: Props) {
  const teClassificeren = bronnen.filter(
    (b) => CLASSIFICEERBARE_TYPES.includes(b.type) && !b.fout && b.type_bevestigd && b.rijen.length > 0,
  );

  if (teClassificeren.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Geen bestanden om te classificeren. Upload zorgopbrengsten, inhuur of directe uren.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {teClassificeren.map((b) => (
        <ClassificatiePaneel key={b.id} bron={b} onChange={onChange} />
      ))}
    </div>
  );
}

function ClassificatiePaneel({ bron, onChange }: { bron: BronBestand; onChange: () => void }) {
  const type = bron.type as Exclude<BronType, "niet_gebruiken">;
  const knoppen = KNOPPEN[type];
  const titel = TITELS[type];
  const [filter, setFilter] = useState<"alle" | "twijfel" | "open">("open");

  const m = bron.mapping || {};
  const omschrijvingHeader =
    type === "zorgopbrengsten"
      ? m.rekening_of_categorie
      : type === "inhuur"
        ? m.leverancier_of_omschrijving
        : m.medewerker;
  const waardeHeader = type === "directe_uren" ? m.directe_uren : m.bedrag;

  const omIdx = omschrijvingHeader ? bron.headers.indexOf(omschrijvingHeader) : -1;
  const wIdx = waardeHeader ? bron.headers.indexOf(waardeHeader) : -1;

  const classificaties = bron.classificaties || {};
  const totaal = bron.rijen.length;
  const open = totaal - Object.keys(classificaties).length;

  const zichtbaar = useMemo(() => {
    return bron.rijen
      .map((r, i) => ({ r, i }))
      .filter(({ i }) => {
        if (filter === "alle") return true;
        if (filter === "twijfel") return classificaties[i] === "twijfel";
        return !classificaties[i];
      })
      .slice(0, 50);
  }, [bron.rijen, classificaties, filter]);

  const setKlasse = (i: number, k: Classificatie) => {
    const next = { ...classificaties, [i]: k };
    upsertBron({ ...bron, classificaties: next });
    onChange();
  };

  const bulk = (k: Classificatie) => {
    const next: Record<number, Classificatie> = { ...classificaties };
    bron.rijen.forEach((_, i) => {
      next[i] = k;
    });
    upsertBron({ ...bron, classificaties: next });
    onChange();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>
            {titel} <Badge variant="outline" className="ml-2">{bron.bestandsnaam}</Badge>
          </span>
          <span className="text-sm text-muted-foreground">Nog {open} te classificeren</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => bulk(knoppen[0].value)}>
            Alles {knoppen[0].label.toLowerCase()}
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulk(knoppen[1].value)}>
            Alles {knoppen[1].label.toLowerCase()}
          </Button>
          <div className="ml-auto flex gap-1 text-xs">
            {(["alle", "twijfel", "open"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "ghost"}
                onClick={() => setFilter(f)}
              >
                {f === "alle" ? "Alle regels" : f === "twijfel" ? "Alleen twijfel" : "Nog niet geclassificeerd"}
              </Button>
            ))}
          </div>
        </div>

        {!omschrijvingHeader || !waardeHeader ? (
          <p className="text-sm text-destructive">
            Koppel eerst de verplichte kolommen in tab 2 voor {BRON_LABELS[type]}.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">Omschrijving</th>
                  <th className="px-3 py-2 text-right">Bedrag / uren</th>
                  <th className="px-3 py-2 text-right">Classificatie</th>
                </tr>
              </thead>
              <tbody>
                {zichtbaar.map(({ r, i }) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r[omIdx] ?? ""}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r[wIdx] ?? ""}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {knoppen.map((k) => (
                          <Button
                            key={k.value}
                            size="sm"
                            variant={classificaties[i] === k.value ? "default" : "outline"}
                            onClick={() => setKlasse(i, k.value)}
                          >
                            {k.label}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {zichtbaar.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                      Geen regels in deze weergave.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {bron.rijen.length > 50 && (
          <p className="text-xs text-muted-foreground">Eerste 50 regels getoond. Gebruik bulkacties voor de rest.</p>
        )}
      </CardContent>
    </Card>
  );
}
