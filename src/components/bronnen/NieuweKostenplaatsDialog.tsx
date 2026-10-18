import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addProject, listProjecten, ROL_LABELS, type Project, type ProjectRol } from "@/lib/projecten";

const GEEN = "__geen__";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  voorstelNaam?: string;
  voorstelRol?: ProjectRol;
  onAangemaakt: (p: Project) => void;
}

export function NieuweKostenplaatsDialog({ open, onOpenChange, dossierId, voorstelNaam, voorstelRol, onAangemaakt }: Props) {
  const [naam, setNaam] = useState("");
  const [rol, setRol] = useState<ProjectRol>("opdrachtgever");
  const [tarief, setTarief] = useState("");
  const [fout, setFout] = useState("");
  const [via, setVia] = useState(GEEN);
  const opdrachtgevers = open ? listProjecten(dossierId).filter((p) => p.rol === "opdrachtgever") : [];

  useEffect(() => {
    if (open) {
      setNaam(voorstelNaam ?? "");
      setRol(voorstelRol ?? "opdrachtgever");
      setTarief("");
      setFout("");
      setVia(GEEN);
    }
  }, [open, voorstelNaam, voorstelRol]);

  const opslaan = () => {
    const n = naam.trim();
    if (!n) return setFout("Vul een naam in.");
    if (listProjecten(dossierId).some((p) => p.naam.toLowerCase() === n.toLowerCase()))
      return setFout("Deze kostenplaats bestaat al in dit dossier.");
    let t: number | undefined;
    if (tarief.trim()) {
      t = Number(tarief.replace(",", "."));
      if (!Number.isFinite(t) || t < 0) return setFout("Uurtarief moet een positief getal zijn.");
    }
    onAangemaakt(addProject(dossierId, n, undefined, t, rol, rol === "client" && via !== GEEN ? via : undefined));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nieuwe kostenplaats</DialogTitle>
          <DialogDescription>Een klant, partner of cliënt waaraan u omzet en kosten toerekent.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="kp-naam">Naam</Label>
            <Input id="kp-naam" value={naam} onChange={(e) => setNaam(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={rol} onValueChange={(v) => setRol(v as ProjectRol)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ROL_LABELS) as ProjectRol[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROL_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {rol === "client" && (
            <div className="space-y-1.5">
              <Label>Via opdrachtgever (onderaanneming)</Label>
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
            <Label htmlFor="kp-tarief">Afgesproken uurtarief in euro (optioneel)</Label>
            <Input id="kp-tarief" inputMode="decimal" placeholder="bijv. 45,00" value={tarief} onChange={(e) => setTarief(e.target.value)} />
          </div>
          {fout && <p className="text-sm text-destructive">{fout}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button onClick={opslaan}>Toevoegen en selecteren</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
