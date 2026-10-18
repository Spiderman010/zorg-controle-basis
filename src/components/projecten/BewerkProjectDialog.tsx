import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STROOM_LABELS, STROOM_VOLGORDE, type Financieringsstroom } from "@/core";
import { ROL_LABELS, updateProject, type Project, type ProjectRol } from "@/lib/projecten";

const GEEN = "__geen__";
const STROMEN = STROOM_VOLGORDE.filter((s) => s !== "onbekend");

interface Props {
  project: Project | null;
  alle: Project[];
  onClose: () => void;
  onOpgeslagen: () => void;
}

export function BewerkProjectDialog({ project, alle, onClose, onOpgeslagen }: Props) {
  const [naam, setNaam] = useState("");
  const [rol, setRol] = useState<string>(GEEN);
  const [via, setVia] = useState(GEEN);
  const [stroom, setStroom] = useState(GEEN);
  const [tarief, setTarief] = useState("");
  const [fout, setFout] = useState("");

  useEffect(() => {
    if (!project) return;
    setNaam(project.naam);
    setRol(project.rol ?? GEEN);
    setVia(project.via_id ?? GEEN);
    setStroom(project.stroom ?? GEEN);
    setTarief(project.tarief === undefined ? "" : String(project.tarief).replace(".", ","));
    setFout("");
  }, [project]);

  if (!project) return null;
  const opdrachtgevers = alle.filter((p) => p.rol === "opdrachtgever" && p.id !== project.id);

  const opslaan = () => {
    const n = naam.trim();
    if (!n) return setFout("Vul een naam in.");
    if (alle.some((p) => p.id !== project.id && p.naam.toLowerCase() === n.toLowerCase()))
      return setFout("Deze naam bestaat al in dit dossier.");
    let t: number | undefined;
    const s = tarief.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    if (s) {
      t = Number(s);
      if (!Number.isFinite(t) || t <= 0) return setFout("Uurtarief moet een positief getal zijn.");
    }
    const r = rol === GEEN ? undefined : (rol as ProjectRol);
    updateProject(project.id, {
      naam: n,
      rol: r,
      via_id: r === "client" && via !== GEEN ? via : undefined,
      stroom: stroom === GEEN ? undefined : (stroom as Financieringsstroom),
      tarief: t,
    });
    onOpgeslagen();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kostenplaats bewerken</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bp-naam">Naam</Label>
            <Input id="bp-naam" value={naam} onChange={(e) => setNaam(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={rol} onValueChange={setRol}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={GEEN}>Geen rol</SelectItem>
                {(Object.keys(ROL_LABELS) as ProjectRol[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROL_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {rol === "client" && (
            <div className="space-y-1.5">
              <Label>Via opdrachtgever</Label>
              <Select value={via} onValueChange={setVia}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={GEEN}>Geen — directe cliënt</SelectItem>
                  {opdrachtgevers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.naam}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Financieringsstroom</Label>
            <Select value={stroom} onValueChange={setStroom}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={GEEN}>Geen stroom</SelectItem>
                {STROMEN.map((s) => (
                  <SelectItem key={s} value={s}>{STROOM_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bp-tarief">Uurtarief in euro (optioneel)</Label>
            <Input id="bp-tarief" inputMode="decimal" value={tarief} onChange={(e) => setTarief(e.target.value)} />
          </div>
          {fout && <p className="text-sm text-destructive">{fout}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuleren</Button>
          <Button onClick={opslaan}>Opslaan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
