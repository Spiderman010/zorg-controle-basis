import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BronBestand } from "@/lib/bronnen";
import {
  BEWIJSNIVEAU_LABEL,
  BEWIJSNIVEAUS,
  HERKOMST_MANIER_LABEL,
  HERKOMST_MANIEREN,
  datumNL,
  laatstIngelezen,
  telPerNiveau,
  type HerkomstManier,
} from "@/lib/herkomst";
import {
  FREQUENTIE_LABEL,
  getKlantprofiel,
  parseSystemen,
  saveKlantprofiel,
  type Aanleverfrequentie,
  type Klantprofiel,
} from "@/lib/klantprofiel";

/** Sentinel: Radix Select staat geen lege waarde toe. */
const GEEN = "__geen__";

/**
 * Aanleverprofiel van de klant van dit dossier: systemen, standaard manier, frequentie en notitie.
 * Wordt gebruikt om de herkomst bij een nieuwe upload voor te vullen. Geen persoonsgegevens.
 */
export function AanleverprofielKaart({ bedrijfsnaam, bronnen }: { bedrijfsnaam: string; bronnen: BronBestand[] }) {
  const start = getKlantprofiel(bedrijfsnaam);
  const [systemen, setSystemen] = useState(start?.systemen.join(", ") ?? "");
  const [manier, setManier] = useState<string>(start?.standaard_manier ?? GEEN);
  const [frequentie, setFrequentie] = useState<string>(start?.frequentie ?? GEEN);
  const [notitie, setNotitie] = useState(start?.notitie ?? "");
  const [melding, setMelding] = useState("");

  const telling = telPerNiveau(bronnen);
  const laatst = datumNL(laatstIngelezen(bronnen));

  const opslaan = () => {
    const profiel: Klantprofiel = { systemen: parseSystemen(systemen) };
    if (manier !== GEEN) profiel.standaard_manier = manier as HerkomstManier;
    if (frequentie !== GEEN) profiel.frequentie = frequentie as Aanleverfrequentie;
    if (notitie.trim()) profiel.notitie = notitie.trim();
    saveKlantprofiel(bedrijfsnaam, profiel);
    setMelding("Aanleverprofiel opgeslagen. Nieuwe uploads krijgen de standaard manier en het eerste systeem als voorstel.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aanleverprofiel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Hoe deze klant de gegevens meestal aanlevert. Geldt voor alle dossiers van {bedrijfsnaam}. Vul geen persoonsgegevens in.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="ap-systemen">Systemen (komma-gescheiden)</Label>
            <Input id="ap-systemen" value={systemen} placeholder="Bijv. Nedap Ons, AFAS" onChange={(e) => setSystemen(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Standaard manier</Label>
            <Select value={manier} onValueChange={setManier}>
              <SelectTrigger aria-label="Standaard manier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GEEN}>Geen standaard</SelectItem>
                {HERKOMST_MANIEREN.map((m) => (
                  <SelectItem key={m} value={m}>{HERKOMST_MANIER_LABEL[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Frequentie</Label>
            <Select value={frequentie} onValueChange={setFrequentie}>
              <SelectTrigger aria-label="Frequentie">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GEEN}>Niet vastgelegd</SelectItem>
                {(Object.keys(FREQUENTIE_LABEL) as Aanleverfrequentie[]).map((f) => (
                  <SelectItem key={f} value={f}>{FREQUENTIE_LABEL[f]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="ap-notitie">Notitie</Label>
            <Textarea id="ap-notitie" rows={2} value={notitie} placeholder="Bijv. export komt de eerste werkdag van de maand" onChange={(e) => setNotitie(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={opslaan}>Profiel opslaan</Button>
          {melding && <p className="text-sm text-muted-foreground" role="status">{melding}</p>}
        </div>
        <div className="space-y-1 border-t pt-4 text-sm">
          <p>Laatst ingelezen: {laatst ?? "nog niets ingelezen"}</p>
          <ul className="text-xs text-muted-foreground">
            {BEWIJSNIVEAUS.map((n) => (
              <li key={n}>
                {BEWIJSNIVEAU_LABEL[n]}: {telling[n]} {telling[n] === 1 ? "bron" : "bronnen"}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
