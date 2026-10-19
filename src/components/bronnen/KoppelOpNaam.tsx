import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listBronnen, upsertBron, type BronBestand } from "@/lib/bronnen";
import { listProjecten, projectLabel as label, type ProjectRol } from "@/lib/projecten";
import { koppelMedewerker, voorstelOpNaam, type NaamVoorstel } from "@/lib/koppel-op-naam";
import { NieuweKostenplaatsDialog } from "./NieuweKostenplaatsDialog";

const samenvatting = (v: NaamVoorstel): string => {
  const delen = [`${v.gekoppeld} regel(s) gekoppeld op naam.`];
  if (v.bestond > 0) delen.push(`${v.bestond} regel(s) hadden al een koppeling en zijn niet overschreven.`);
  if (v.onduidelijk > 0) delen.push(`${v.onduidelijk} regel(s) passen bij meerdere kostenplaatsen: kies zelf.`);
  if (v.leeg > 0) delen.push(`${v.leeg} regel(s) hebben geen naam.`);
  if (v.geenMatch.length > 0) delen.push(`Geen kostenplaats gevonden voor: ${v.geenMatch.join(", ")}.`);
  return delen.join(" ");
};

/**
 * Stelt kostenplaatsen voor op basis van de naam in de kolom "Kostenplaats of cliënt". Vult
 * alleen regels zonder koppeling. Namen zonder kostenplaats kun je direct als nieuwe kostenplaats
 * aanmaken; daarna wordt opnieuw gekoppeld.
 */
export default function KoppelOpNaam({
  bron,
  onChange,
  voorstelRol = "opdrachtgever",
}: {
  bron: BronBestand;
  onChange: () => void;
  voorstelRol?: ProjectRol;
}) {
  const [melding, setMelding] = useState("");
  const [zonderMatch, setZonderMatch] = useState<string[]>([]);
  const [nieuwNaam, setNieuwNaam] = useState<string | null>(null);

  const kolom = bron.mapping?.kostenplaats;
  const idx = kolom ? bron.headers.indexOf(kolom) : -1;

  if (idx < 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Optioneel: koppel in tab 2 de kolom &quot;Kostenplaats of cliënt&quot; om hier automatisch op naam te kunnen koppelen.
      </p>
    );
  }

  const voer = (b: BronBestand) => {
    const v = voorstelOpNaam(
      b.rijen.map((r) => r[idx]),
      listProjecten(b.dossier_id),
      b.projecttoewijzingen ?? {},
    );
    if (Object.keys(v.toewijzingen).length > 0) {
      upsertBron({ ...b, projecttoewijzingen: { ...(b.projecttoewijzingen ?? {}), ...v.toewijzingen } });
    }
    onChange();
    setZonderMatch(v.geenMatch);
    setMelding(samenvatting(v));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => voer(bron)}>
          Koppel automatisch op naam
        </Button>
      </div>
      {melding && <p className="text-sm text-muted-foreground" role="status">{melding}</p>}
      {zonderMatch.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {zonderMatch.map((naam) => (
            <Button key={naam} size="sm" variant="ghost" onClick={() => setNieuwNaam(naam)}>
              Maak kostenplaats &quot;{naam}&quot;
            </Button>
          ))}
        </div>
      )}
      <NieuweKostenplaatsDialog
        open={nieuwNaam !== null}
        onOpenChange={(o) => !o && setNieuwNaam(null)}
        dossierId={bron.dossier_id}
        voorstelNaam={nieuwNaam ?? undefined}
        voorstelRol={voorstelRol}
        onAangemaakt={() => {
          setNieuwNaam(null);
          const vers = listBronnen(bron.dossier_id).find((b) => b.id === bron.id);
          if (vers) voer(vers);
        }}
      />
    </div>
  );
}

/**
 * Koppelt alle regels van één medewerker aan één kostenplaats (directe uren). Bestaande
 * koppelingen blijven staan.
 */
export function KoppelMedewerker({ bron, onChange }: { bron: BronBestand; onChange: () => void }) {
  const [medewerker, setMedewerker] = useState("");
  const [melding, setMelding] = useState("");
  // Guard tegen Radix-typeahead op een gesloten trigger (zelfde patroon als in de classificatie).
  const [bulkOpen, setBulkOpen] = useState(false);

  const kolom = bron.mapping?.medewerker;
  const idx = kolom ? bron.headers.indexOf(kolom) : -1;
  if (idx < 0) return null;

  const opties = [...new Set(bron.rijen.map((r) => (r[idx] ?? "").trim()).filter(Boolean))].sort();
  const projecten = listProjecten(bron.dossier_id);

  const pas = (projectId: string) => {
    if (!bulkOpen || !medewerker) return;
    const r = koppelMedewerker(bron.rijen.map((x) => x[idx]), medewerker, projectId, bron.projecttoewijzingen ?? {});
    upsertBron({ ...bron, projecttoewijzingen: r.toewijzingen });
    onChange();
    setMelding(
      `${r.gekoppeld} regel(s) van ${medewerker} gekoppeld.` +
        (r.bestond > 0 ? ` ${r.bestond} regel(s) hadden al een koppeling en zijn niet overschreven.` : ""),
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={medewerker} onValueChange={(v) => { setMedewerker(v); setMelding(""); }}>
          <SelectTrigger className="h-9 w-56">
            <SelectValue placeholder="Kies een medewerker…" />
          </SelectTrigger>
          <SelectContent>
            {opties.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value="" disabled={!medewerker} onValueChange={pas} onOpenChange={setBulkOpen}>
          <SelectTrigger className="h-9 w-60">
            <SelectValue placeholder="Koppel alle regels van deze medewerker aan…" />
          </SelectTrigger>
          <SelectContent>
            {projecten.map((p) => (
              <SelectItem key={p.id} value={p.id}>{label(p, projecten)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {melding && <p className="text-sm text-muted-foreground" role="status">{melding}</p>}
    </div>
  );
}
