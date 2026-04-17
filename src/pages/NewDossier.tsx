import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveDossier, type ControleType, type PeriodeType } from "@/lib/dossiers";
import { toast } from "@/hooks/use-toast";

export default function NewDossier() {
  const navigate = useNavigate();
  const [bedrijfsnaam, setBedrijfsnaam] = useState("");
  const [dossiernaam, setDossiernaam] = useState("");
  const [van, setVan] = useState("");
  const [tot, setTot] = useState("");
  const [periodeType, setPeriodeType] = useState<PeriodeType>("maand");
  const [controleType, setControleType] = useState<ControleType>("basiscontrole");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!bedrijfsnaam || !dossiernaam || !van || !tot) {
      toast({ title: "Vul alle verplichte velden in.", variant: "destructive" });
      return;
    }
    const d = saveDossier({
      bedrijfsnaam,
      dossiernaam,
      periode_van: van,
      periode_tot: tot,
      periode_type: periodeType,
      controle_type: controleType,
    });
    toast({ title: "Dossier aangemaakt." });
    navigate(`/dossiers/${d.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nieuw controledossier</h1>
        <p className="text-sm text-muted-foreground">Vul de basisgegevens van het dossier in.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dossiergegevens</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="bedrijfsnaam">Bedrijfsnaam</Label>
              <Input id="bedrijfsnaam" value={bedrijfsnaam} onChange={(e) => setBedrijfsnaam(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dossiernaam">Dossiernaam</Label>
              <Input id="dossiernaam" value={dossiernaam} onChange={(e) => setDossiernaam(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="van">Controleperiode van</Label>
                <Input id="van" type="date" value={van} onChange={(e) => setVan(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tot">Controleperiode tot</Label>
                <Input id="tot" type="date" value={tot} onChange={(e) => setTot(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/")}>Annuleren</Button>
              <Button type="submit">Opslaan en verder</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
