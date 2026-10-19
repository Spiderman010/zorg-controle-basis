import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { laadVoorbeeldDossier, verwijderVoorbeeldDossier, heeftVoorbeeldDossier, VOORBEELD_NAAM } from "@/lib/voorbeeld";
import { maakBackup, leesBackup, terugzetten, type Backup } from "@/lib/backup";

export const BACKUP_WAARSCHUWING = "Dit bestand kan gegevens van medewerkers en cliënten bevatten. Bewaar het veilig.";

interface Teruggezet {
  backup: Backup;
  aantal: { dossiers: number; projecten: number; bronnen: number };
}

/** Voorbeelddossier en back-up op het dashboard. */
export function VoorbeeldEnBackup({ onChange }: { onChange: () => void }) {
  const [melding, setMelding] = useState("");
  const [fout, setFout] = useState("");
  const [teZetten, setTeZetten] = useState<Teruggezet | null>(null);
  const [overschrijven, setOverschrijven] = useState(false);
  const bestandRef = useRef<HTMLInputElement>(null);
  const isVoorbeeld = heeftVoorbeeldDossier();

  const laden = () => {
    laadVoorbeeldDossier();
    setFout("");
    setMelding(`Voorbeelddossier geladen: ${VOORBEELD_NAAM}.`);
    onChange();
  };

  const verwijderen = () => {
    verwijderVoorbeeldDossier();
    setFout("");
    setMelding("Voorbeelddossier verwijderd.");
    onChange();
  };

  const download = () => {
    const b = maakBackup();
    const url = URL.createObjectURL(new Blob([JSON.stringify(b, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `back-up-zorg-controle-basis-${b.gemaakt_op.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setFout("");
    setMelding(
      `Back-up gemaakt: ${b.dossiers.length} dossier(s), ${b.projecten.length} kostenplaats(en) en ${b.bronnen.length} bron(nen). ${BACKUP_WAARSCHUWING}`,
    );
  };

  const kiesBestand = async (e: ChangeEvent<HTMLInputElement>) => {
    const bestand = e.target.files?.[0];
    e.target.value = "";
    if (!bestand) return;
    const r = leesBackup(await bestand.text());
    if (r.ok === false) {
      setMelding("");
      setFout(`Back-up niet teruggezet: ${r.fout}`);
      setTeZetten(null);
      return;
    }
    setFout("");
    setMelding("");
    setOverschrijven(false);
    setTeZetten({ backup: r.backup, aantal: r.aantal });
  };

  const bevestigTerugzetten = () => {
    if (!teZetten) return;
    const r = terugzetten(teZetten.backup, overschrijven);
    setTeZetten(null);
    setFout("");
    setMelding(
      `Back-up teruggezet: ${r.toegevoegd} dossier(s) toegevoegd, ${r.vervangen} vervangen, ${r.overgeslagen} overgeslagen omdat ze al bestonden.`,
    );
    onChange();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Voorbeeld en back-up</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Voorbeelddossier</p>
            <p className="text-xs text-muted-foreground">
              Laadt het fictieve dossier &quot;{VOORBEELD_NAAM}&quot; met twee kostenplaatsen en vier bronnen. Opnieuw laden vervangt alleen dit voorbeeld.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={laden}>Voorbeelddossier laden</Button>
            {isVoorbeeld && (
              <Button size="sm" variant="outline" onClick={verwijderen}>Voorbeelddossier verwijderen</Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-3 border-t pt-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Back-up</p>
            <p className="text-xs text-muted-foreground">
              Eén bestand met alle dossiers, kostenplaatsen en bronnen. {BACKUP_WAARSCHUWING}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={download}>Back-up maken</Button>
            <Button size="sm" variant="outline" onClick={() => bestandRef.current?.click()}>Back-up terugzetten</Button>
            <input ref={bestandRef} type="file" accept=".json,application/json" className="hidden" onChange={kiesBestand} />
          </div>
        </div>

        {melding && <p className="text-sm text-muted-foreground" role="status">{melding}</p>}
        {fout && <p className="text-sm text-destructive" role="alert">{fout}</p>}
      </CardContent>

      <Dialog open={teZetten !== null} onOpenChange={(o) => !o && setTeZetten(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Back-up terugzetten?</DialogTitle>
            <DialogDescription>
              Dit bestand bevat {teZetten?.aantal.dossiers} dossier(s), {teZetten?.aantal.projecten} kostenplaats(en) en{" "}
              {teZetten?.aantal.bronnen} bron(nen). {BACKUP_WAARSCHUWING}
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={overschrijven}
              onCheckedChange={(v) => setOverschrijven(v === true)}
            />
            <span>
              Bestaande dossiers met dezelfde id overschrijven. Hun kostenplaatsen en bronnen worden dan ook vervangen.
              Standaard blijven bestaande dossiers ongewijzigd.
            </span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeZetten(null)}>Annuleren</Button>
            <Button onClick={bevestigTerugzetten}>Terugzetten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
