import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveDossier, type ControleType, type PeriodeType } from "@/lib/dossiers";
import { toast } from "@/hooks/use-toast";

function suggestieNaam(bedrijf: string, van: string, type: PeriodeType): string {
  if (!bedrijf || !van) return "";
  const [j, m] = van.split("-");
  const maand = Number(m);
  if (type === "jaar") return `${bedrijf} - ${j}`;
  if (type === "kwartaal") return `${bedrijf} - Q${Math.ceil(maand / 3)} ${j}`;
  return `${bedrijf} - ${j}-${m}`;
}

export default function NewDossier() {
  const navigate = useNavigate();
  const [bedrijfsnaam, setBedrijfsnaam] = useState("");
  const [dossiernaam, setDossiernaam] = useState("");
  const [naamAangepast, setNaamAangepast] = useState(false);
  const [van, setVan] = useState("");
  const [tot, setTot] = useState("");
  const [periodeType, setPeriodeType] = useState<PeriodeType>("maand");
  const [controleType, setControleType] = useState<ControleType>("basiscontrole");
  const [poging, setPoging] = useState(false);

  const voorgesteld = suggestieNaam(bedrijfsnaam.trim(), van, periodeType);
  const naam = naamAangepast ? dossiernaam : voorgesteld;
  const periodeFout = van && tot && tot < van ? "De einddatum ligt vóór de begindatum." : "";

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPoging(true);
    if (!bedrijfsnaam.trim() || !naam.trim() || !van || !tot || periodeFout) {
      toast({ title: "Controleer de gemarkeerde velden.", variant: "destructive" });
      return;
    }
    const d = saveDossier({
      bedrijfsnaam: bedrijfsnaam.trim(),
      dossiernaam: naam.trim(),
      periode_van: van,
      periode_tot: tot,
      periode_type: periodeType,
      controle_type: controleType,
    });
    toast({ title: "Dossier aangemaakt." });
    navigate(`/dossiers/${d.id}`);
  }

  const fout = (leeg: boolean) => (poging && leeg ? "Verplicht veld." : "");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nieuw controledossier</h1>
        <p className="text-sm text-muted-foreground">Leg de klant, de periode en het type controle vast.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Organisatie</CardTitle>
            <CardDescription>Het zorgbedrijf waarvoor u de controle uitvoert.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bedrijfsnaam">Bedrijfsnaam</Label>
              <Input id="bedrijfsnaam" value={bedrijfsnaam} onChange={(e) => setBedrijfsnaam(e.target.value)} placeholder="Bijv. Zorggroep De Linde BV" />
              {fout(!bedrijfsnaam.trim()) && <p className="text-xs text-destructive">{fout(true)}</p>}
              <p className="text-xs text-muted-foreground">Kolomkoppelingen worden per bedrijfsnaam onthouden.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Controleperiode</CardTitle>
            <CardDescription>De periode waarover de bronbestanden gaan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type periode</Label>
              <Select value={periodeType} onValueChange={(v) => setPeriodeType(v as PeriodeType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maand">Maand</SelectItem>
                  <SelectItem value="kwartaal">Kwartaal</SelectItem>
                  <SelectItem value="jaar">Jaar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="van">Van</Label>
                <Input id="van" type="date" value={van} onChange={(e) => setVan(e.target.value)} />
                {fout(!van) && <p className="text-xs text-destructive">{fout(true)}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tot">Tot en met</Label>
                <Input id="tot" type="date" value={tot} onChange={(e) => setTot(e.target.value)} />
                {fout(!tot) && <p className="text-xs text-destructive">{fout(true)}</p>}
                {periodeFout && <p className="text-xs text-destructive">{periodeFout}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Controle</CardTitle>
            <CardDescription>Kies de omvang en geef het dossier een naam.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type controle</Label>
              <Select value={controleType} onValueChange={(v) => setControleType(v as ControleType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basiscontrole">Basiscontrole</SelectItem>
                  <SelectItem value="basiscontrole + urenanalyse">Basiscontrole + urenanalyse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dossiernaam">Dossiernaam</Label>
              <Input
                id="dossiernaam"
                value={naam}
                placeholder="Wordt automatisch voorgesteld"
                onChange={(e) => { setNaamAangepast(true); setDossiernaam(e.target.value); }}
              />
              {fout(!naam.trim()) && <p className="text-xs text-destructive">{fout(true)}</p>}
              {naamAangepast && voorgesteld && naam !== voorgesteld && (
                <button type="button" className="text-xs text-primary underline" onClick={() => setNaamAangepast(false)}>
                  Gebruik voorstel: {voorgesteld}
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/")}>Annuleren</Button>
          <Button type="submit">Opslaan en verder</Button>
        </div>
      </form>
    </div>
  );
}
