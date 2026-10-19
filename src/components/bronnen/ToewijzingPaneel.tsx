import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRON_LABELS, leesGedeclareerdeUren, upsertBron, type BronBestand } from "@/lib/bronnen";
import { listProjecten, projectLabel as label } from "@/lib/projecten";
import { voorstelToewijzing } from "@/lib/uren-toewijzing";
import { NieuweKostenplaatsDialog } from "./NieuweKostenplaatsDialog";
import KoppelOpNaam from "./KoppelOpNaam";

/** Sentinels: Radix Select staat geen lege waarde toe. */
const ALGEMEEN = "__algemeen__";
const NIEUW = "__nieuw__";

const REDEN_TEKST: Record<string, string> = {
  dagen: "in dagen",
  niet_in_uren: "niet in uren",
  ongeldig: "onleesbaar",
};

/**
 * Koppelt gedeclareerde uren aan een kostenplaats (project). Dit is geen classificatie: er is
 * maar één keuze per regel. Zo kan de verbandcontrole later per kostenplaats vergelijken.
 */
export default function ToewijzingPaneel({ bron, onChange }: { bron: BronBestand; onChange: () => void }) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [nieuw, setNieuw] = useState<number | "alle" | null>(null);
  const [melding, setMelding] = useState("");

  const regels = leesGedeclareerdeUren(bron);
  const projecten = listProjecten(bron.dossier_id);
  const toewijzingen = bron.projecttoewijzingen || {};
  const gekoppeld = (i: number) => projecten.some((p) => p.id === toewijzingen[i]);
  const open = regels.filter((r) => !gekoppeld(r.regel)).length;

  const opslaan = (next: Record<number, string>) => {
    upsertBron({ ...bron, projecttoewijzingen: next });
    onChange();
  };

  const setProject = (i: number, project_id: string) => {
    if (project_id === NIEUW) return setNieuw(i);
    const next = { ...toewijzingen };
    if (project_id === ALGEMEEN) delete next[i];
    else next[i] = project_id;
    opslaan(next);
  };

  const assignAll = (project_id: string) => {
    const next: Record<number, string> = {};
    if (project_id !== ALGEMEEN) regels.forEach((r) => (next[r.regel] = project_id));
    opslaan(next);
  };

  const bulkProject = (project_id: string) => {
    // Guard tegen Radix-typeahead op een gesloten trigger (zelfde als in Classificatie).
    if (!bulkOpen) return;
    if (project_id === NIEUW) return setNieuw("alle");
    assignAll(project_id);
  };

  const automatisch = () => {
    const v = voorstelToewijzing(regels, projecten, toewijzingen);
    const aantal = Object.keys(v.toewijzingen).length;
    if (aantal > 0) opslaan({ ...toewijzingen, ...v.toewijzingen });
    const delen = [`${aantal} regel(s) gekoppeld op stroom.`];
    if (v.onduidelijk > 0) delen.push(`${v.onduidelijk} regel(s) hebben meerdere passende kostenplaatsen: kies zelf.`);
    if (v.zonderMatch > 0) delen.push(`${v.zonderMatch} regel(s) hebben geen passende kostenplaats.`);
    setMelding(delen.join(" "));
  };

  const zichtbaar = regels.slice(0, 50);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>
            Gedeclareerde uren — koppel aan kostenplaats <Badge variant="outline" className="ml-2">{bron.bestandsnaam}</Badge>
          </span>
          <span className="text-sm text-muted-foreground">Nog {open} zonder kostenplaats</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {regels.length === 0 ? (
          <p className="text-sm text-destructive">
            Koppel eerst de verplichte kolommen in tab 2 voor {BRON_LABELS.gedeclareerde_uren}.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={automatisch}>
                Koppel automatisch op stroom
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
                voorstelRol="opdrachtgever"
                onAangemaakt={(p) => {
                  if (nieuw === "alle") assignAll(p.id);
                  else if (nieuw !== null) setProject(nieuw, p.id);
                }}
              />
            </div>
            <KoppelOpNaam bron={bron} onChange={onChange} />
            {melding && <p className="text-sm text-muted-foreground" role="status">{melding}</p>}
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Periode</th>
                    <th className="px-3 py-2 text-left">Stroom</th>
                    <th className="px-3 py-2 text-right">Uren</th>
                    <th className="px-3 py-2 text-left">Kostenplaats</th>
                  </tr>
                </thead>
                <tbody>
                  {zichtbaar.map((r) => (
                    <tr key={r.regel} className="border-t">
                      <td className="px-3 py-2">{r.periode}</td>
                      <td className="px-3 py-2">{r.stroom ?? ""}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.uren !== undefined
                          ? r.uren.toLocaleString("nl-NL")
                          : REDEN_TEKST[r.reden ?? ""] ?? ""}
                      </td>
                      <td className="px-3 py-2">
                        <Select value={gekoppeld(r.regel) ? toewijzingen[r.regel] : ALGEMEEN} onValueChange={(v) => setProject(r.regel, v)}>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {regels.length > 50 && (
              <p className="text-xs text-muted-foreground">Eerste 50 regels getoond. Gebruik de bulkacties voor de rest.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
