import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BRON_LABELS,
  CLASSIFICEERBARE_TYPES,
  type BronBestand,
  type BronType,
  type Classificatie,
  upsertBron,
} from "@/lib/bronnen";
import { listProjecten, projectLabel as label } from "@/lib/projecten";
import { NieuweKostenplaatsDialog } from "./NieuweKostenplaatsDialog";
import ToewijzingPaneel from "./ToewijzingPaneel";
import KoppelOpNaam, { KoppelMedewerker } from "./KoppelOpNaam";

/** Sentinel voor "Algemeen" (geen toewijzing); Radix Select staat geen lege waarde toe. */
const ALGEMEEN = "__algemeen__";
const NIEUW = "__nieuw__";

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

  const teKoppelen = bronnen.filter(
    (b) => b.type === "gedeclareerde_uren" && !b.fout && b.type_bevestigd && b.rijen.length > 0,
  );

  if (teClassificeren.length === 0 && teKoppelen.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Geen bestanden om te classificeren. Upload zorgopbrengsten, inhuur, directe uren of gedeclareerde uren.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {teClassificeren.map((b) => (
        <ClassificatiePaneel key={b.id} bron={b} onChange={onChange} />
      ))}
      {teKoppelen.map((b) => (
        <ToewijzingPaneel key={b.id} bron={b} onChange={onChange} />
      ))}
    </div>
  );
}

function ClassificatiePaneel({ bron, onChange }: { bron: BronBestand; onChange: () => void }) {
  const type = bron.type as Exclude<BronType, "niet_gebruiken">;
  const knoppen = KNOPPEN[type];
  const titel = TITELS[type];
  const [filter, setFilter] = useState<"alle" | "twijfel" | "open">("open");
  // Guard tegen Radix-typeahead op een gesloten trigger: een toetsaanslag zou
  // anders ongemerkt álle toewijzingen overschrijven. Alleen toepassen als de
  // dropdown daadwerkelijk geopend is geweest.
  const [bulkOpen, setBulkOpen] = useState(false);
  const [nieuw, setNieuw] = useState<number | "alle" | null>(null);

  const m = bron.mapping || {};
  const omschrijvingHeader =
    type === "zorgopbrengsten"
      ? m.rekening_of_categorie
      : type === "inhuur"
        ? m.leverancier_of_omschrijving
        : m.medewerker;
  const waardeHeader = type === "directe_uren" ? m.directe_uren : m.bedrag;

  const omIdx = omschrijvingHeader ? bron.headers.indexOf(omschrijvingHeader) : -1;
  const isGetal = (v: string | undefined) => !!v && !isNaN(Number(String(v).replace(",", ".")));
  let wIdx = waardeHeader ? bron.headers.indexOf(waardeHeader) : -1;
  // Herstel: staat "bedrag" op een tekstkolom (bv. Debiteur), gebruik dan de kolom "Bedrag".
  const fouteWaardeKolom = wIdx >= 0 && bron.rijen.length > 0 && !bron.rijen.some((r) => isGetal(r[wIdx]));
  if (fouteWaardeKolom && bron.headers.includes("Bedrag")) wIdx = bron.headers.indexOf("Bedrag");
  const toonWaarde = (v: string | undefined) => {
    if (!isGetal(v)) return v ?? "";
    const n = Number(String(v).replace(",", "."));
    return type === "directe_uren"
      ? n.toLocaleString("nl-NL")
      : n.toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
  };

  const classificaties = bron.classificaties || {};
  const toewijzingen = bron.projecttoewijzingen || {};
  const projecten = listProjecten(bron.dossier_id);
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

  const setProject = (i: number, project_id: string) => {
    if (project_id === NIEUW) return setNieuw(i);
    const next = { ...(bron.projecttoewijzingen || {}) };
    if (project_id === ALGEMEEN) delete next[i];
    else next[i] = project_id;
    upsertBron({ ...bron, projecttoewijzingen: next });
    onChange();
  };

  const assignAll = (project_id: string) => {
    const next: Record<number, string> = {};
    if (project_id !== ALGEMEEN) {
      bron.rijen.forEach((_, i) => {
        next[i] = project_id;
      });
    }
    upsertBron({ ...bron, projecttoewijzingen: next });
    onChange();
  };

  const bulkProject = (project_id: string) => {
    if (!bulkOpen) return;
    if (project_id === NIEUW) return setNieuw("alle");
    assignAll(project_id);
  };

  // Voorstel uit herkende factuur: kolom "Debiteur" (PDF-factuurlezer).
  const debIdx = bron.headers.findIndex((h) => /debiteur|klant|opdrachtgever|leverancier/i.test(h));
  const voorstelNaam = (n: number | "alle" | null) => {
    if (debIdx < 0 || n === null) return undefined;
    const rij = n === "alle" ? bron.rijen[0] : bron.rijen[n];
    return rij?.[debIdx]?.trim() || undefined;
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
        {type === "directe_uren" && (
          <div className="space-y-2">
            <KoppelOpNaam bron={bron} onChange={onChange} />
            <KoppelMedewerker bron={bron} onChange={onChange} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => bulk(knoppen[0].value)}>
            Alles {knoppen[0].label.toLowerCase()}
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulk(knoppen[1].value)}>
            Alles {knoppen[1].label.toLowerCase()}
          </Button>
          <Select value="" onValueChange={bulkProject} onOpenChange={setBulkOpen}>
            <SelectTrigger className="h-9 w-60">
              <SelectValue placeholder="Alle regels naar kostenplaats…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NIEUW}>+ Nieuwe kostenplaats…</SelectItem>
              <SelectItem value={ALGEMEEN}>Algemeen (geen kostenplaats)</SelectItem>
              {projecten.map((p) => (
                <SelectItem key={p.id} value={p.id}>{label(p, projecten)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <NieuweKostenplaatsDialog
            open={nieuw !== null}
            onOpenChange={(o) => !o && setNieuw(null)}
            dossierId={bron.dossier_id}
            voorstelNaam={voorstelNaam(nieuw)}
            voorstelRol={type === "inhuur" ? "onderaannemer" : "opdrachtgever"}
            onAangemaakt={(p) => {
              if (nieuw === "alle") assignAll(p.id);
              else if (nieuw !== null) setProject(nieuw, p.id);
            }}
          />
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
                  <th className="px-3 py-2 text-left">Kostenplaats</th>
                  <th className="px-3 py-2 text-right">Classificatie</th>
                </tr>
              </thead>
              <tbody>
                {zichtbaar.map(({ r, i }) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r[omIdx] ?? ""}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{toonWaarde(r[wIdx])}</td>
                    <td className="px-3 py-2">
                      {/* Fallback naar Algemeen bij een verwijderd project — spiegelt de rekenkern. */}
                      <Select
                        value={projecten.some((p) => p.id === toewijzingen[i]) ? toewijzingen[i] : ALGEMEEN}
                        onValueChange={(v) => setProject(i, v)}
                      >
                        <SelectTrigger className="h-8 w-48 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NIEUW}>+ Nieuwe kostenplaats…</SelectItem>
                          <SelectItem value={ALGEMEEN}>Algemeen</SelectItem>
                          {projecten.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{label(p, projecten)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
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
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
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
