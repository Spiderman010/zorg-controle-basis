import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STROOM_LABELS, STROOM_VOLGORDE, type Financieringsstroom } from "@/core";
import { addProject, deleteProject, listProjecten } from "@/lib/projecten";

/** Sentinel: Radix Select staat geen lege waarde toe. */
const GEEN_STROOM = "__geen__";

/** Stromen die als projectkoppeling kiesbaar zijn ("onbekend" is geen zinvolle keuze). */
const KIESBARE_STROMEN = STROOM_VOLGORDE.filter((s) => s !== "onbekend");

export default function ProjectenBeheer({ dossierId, onChange }: { dossierId: string; onChange?: () => void }) {
  const [versie, setVersie] = useState(0);
  const [naam, setNaam] = useState("");
  const [stroom, setStroom] = useState<string>(GEEN_STROOM);

  const projecten = listProjecten(dossierId);
  void versie;

  const refresh = () => {
    setVersie((v) => v + 1);
    onChange?.();
  };

  const voegToe = () => {
    if (naam.trim().length === 0) return;
    addProject(dossierId, naam, stroom === GEEN_STROOM ? undefined : (stroom as Financieringsstroom));
    setNaam("");
    setStroom(GEEN_STROOM);
    refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Projecten (optioneel)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Deel het dossier op in projecten — bijvoorbeeld per financieringsstroom of contract — en wijs bij de
          classificatie opbrengsten, inhuur en directe uren toe. Niet-toegewezen regels vallen onder "Algemeen".
        </p>

        {projecten.length > 0 && (
          <ul className="space-y-2">
            {projecten.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{p.naam}</span>
                  {p.stroom && <Badge variant="outline">{STROOM_LABELS[p.stroom]}</Badge>}
                </span>
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
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-9 w-56"
            placeholder="Projectnaam, bv. WMO gemeente Utrecht"
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
          <Button size="sm" onClick={voegToe} disabled={naam.trim().length === 0}>
            Project toevoegen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
