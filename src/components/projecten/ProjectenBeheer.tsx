import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STROOM_LABELS, STROOM_VOLGORDE, type Financieringsstroom } from "@/core";
import { addProject, deleteProject, listProjecten, updateProject, projectLabel, type Project, type ProjectRol, ROL_LABELS } from "@/lib/projecten";
import { BewerkProjectDialog } from "./BewerkProjectDialog";
import { getDossier, updateDossier } from "@/lib/dossiers";

/** Sentinel: Radix Select staat geen lege waarde toe. */
const GEEN_STROOM = "__geen__";

/** Stromen die als projectkoppeling kiesbaar zijn ("onbekend" is geen zinvolle keuze). */
const KIESBARE_STROMEN = STROOM_VOLGORDE.filter((s) => s !== "onbekend");

/**
 * Parse een Nederlands tariefveld ("85", "85,50", "1.000"); undefined bij
 * leeg/ongeldig/niet-positief. Zelfde normalisatie als parseNumber in
 * datasetBuilder.ts: punt = duizendtal, komma = decimaal.
 */
function parseTarief(raw: string): number | undefined {
  const s = raw.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (s.length === 0) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function formatTarief(t: number | undefined): string {
  return t === undefined ? "" : String(t).replace(".", ",");
}

export default function ProjectenBeheer({ dossierId, onChange }: { dossierId: string; onChange?: () => void }) {
  const [versie, setVersie] = useState(0);
  const [bewerk, setBewerk] = useState<Project | null>(null);
  const [naam, setNaam] = useState("");
  const [stroom, setStroom] = useState<string>(GEEN_STROOM);
  const [tarief, setTarief] = useState("");
  const [standaardTarief, setStandaardTarief] = useState(() =>
    formatTarief(getDossier(dossierId)?.standaard_tarief),
  );

  const projecten = listProjecten(dossierId);
  void versie;

  const refresh = () => {
    setVersie((v) => v + 1);
    onChange?.();
  };

  const voegToe = () => {
    if (naam.trim().length === 0) return;
    addProject(
      dossierId,
      naam,
      stroom === GEEN_STROOM ? undefined : (stroom as Financieringsstroom),
      parseTarief(tarief),
    );
    setNaam("");
    setStroom(GEEN_STROOM);
    setTarief("");
    refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kostenplaatsen &amp; tarieven (optioneel)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Deel het dossier op in projecten — bijvoorbeeld per financieringsstroom of contract — en wijs bij de
          classificatie opbrengsten, inhuur en directe uren toe. Met een uurtarief per project (of het
          standaardtarief) draait de soll-omzetcontrole: directe uren × tarief vergeleken met de verantwoorde
          omzet. Niet-toegewezen regels vallen onder "Algemeen".
        </p>

        {projecten.length > 0 && (
          <ul className="space-y-2">
            {projecten.map((p) => (
              <li key={`${p.id}-${versie}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{projectLabel(p, projecten)}</span>
                  {p.stroom && <Badge variant="outline">{STROOM_LABELS[p.stroom]}</Badge>}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <Select
                    value={p.rol ?? GEEN_STROOM}
                    onValueChange={(v) => {
                      updateProject(p.id, {
                        rol: v === GEEN_STROOM ? undefined : (v as ProjectRol),
                        ...(v !== "client" ? { via_id: undefined } : {}),
                      });
                      refresh();
                    }}
                  >
                    <SelectTrigger className="h-8 w-36 text-xs" aria-label="Rol"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={GEEN_STROOM}>Geen rol</SelectItem>
                      {(Object.keys(ROL_LABELS) as ProjectRol[]).map((r) => (
                        <SelectItem key={r} value={r}>{ROL_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {p.rol === "client" && (
                    <Select
                      value={p.via_id && projecten.some((o) => o.id === p.via_id) ? p.via_id : GEEN_STROOM}
                      onValueChange={(v) => {
                        updateProject(p.id, { via_id: v === GEEN_STROOM ? undefined : v });
                        refresh();
                      }}
                    >
                      <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={GEEN_STROOM}>Directe cliënt</SelectItem>
                        {projecten.filter((o) => o.rol === "opdrachtgever").map((o) => (
                          <SelectItem key={o.id} value={o.id}>Via {o.naam}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <label className="text-xs text-muted-foreground">Uurtarief €</label>
                  <Input
                    className="h-8 w-24 text-right"
                    placeholder="—"
                    inputMode="decimal"
                    defaultValue={formatTarief(p.tarief)}
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      const parsed = parseTarief(raw);
                      if (raw.length > 0 && parsed === undefined) {
                        // Ongeldige invoer: oude waarde terugzetten, niets opslaan.
                        e.target.value = formatTarief(p.tarief);
                        return;
                      }
                      updateProject(p.id, { tarief: parsed });
                      refresh();
                    }}
                  />
                  <Button size="sm" variant="outline" onClick={() => setBewerk(p)}>
                    Bewerken
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      deleteProject(p.id);
                      refresh();
                    }}
                  >
                    Verwijder
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-9 w-56"
            placeholder="Naam kostenplaats, bv. WMO gemeente Utrecht"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") voegToe();
            }}
          />
          <Select value={stroom} onValueChange={setStroom}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="Financieringsstroom" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GEEN_STROOM}>Geen stroom</SelectItem>
              {KIESBARE_STROMEN.map((s) => (
                <SelectItem key={s} value={s}>{STROOM_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="h-9 w-28"
            placeholder="Uurtarief €"
            inputMode="decimal"
            value={tarief}
            onChange={(e) => setTarief(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") voegToe();
            }}
          />
          <Button size="sm" onClick={voegToe} disabled={naam.trim().length === 0}>
            Project toevoegen
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <label className="text-sm">Standaard uurtarief €</label>
          <Input
            className="h-8 w-24 text-right"
            placeholder="—"
            inputMode="decimal"
            value={standaardTarief}
            onChange={(e) => setStandaardTarief(e.target.value)}
            onBlur={(e) => {
              const raw = e.target.value.trim();
              const parsed = parseTarief(raw);
              if (raw.length > 0 && parsed === undefined) {
                // Ongeldige invoer: oude waarde terugzetten, niets opslaan.
                setStandaardTarief(formatTarief(getDossier(dossierId)?.standaard_tarief));
                return;
              }
              updateDossier(dossierId, { standaard_tarief: parsed });
              refresh();
            }}
          />
          <span className="text-xs text-muted-foreground">
            Geldt voor projecten zonder eigen tarief en voor niet-toegewezen uren ("Algemeen").
          </span>
        </div>
      </CardContent>
      <BewerkProjectDialog project={bewerk} alle={projecten} onClose={() => setBewerk(null)} onOpgeslagen={refresh} />
    </Card>
  );
}
