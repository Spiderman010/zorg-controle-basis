import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDossier } from "@/lib/dossiers";
import { hasMinimaleBronnen } from "@/lib/datasetBuilder";
import { listBronnen } from "@/lib/bronnen";
import { voortgangDossier } from "@/lib/dossier-voortgang";
import { AanleverprofielKaart } from "@/components/dossier/AanleverprofielKaart";
import ProjectenBeheer from "@/components/projecten/ProjectenBeheer";
import ToerekeningOverzicht from "@/components/projecten/ToerekeningOverzicht";

export default function DossierDetail() {
  const { id = "" } = useParams();
  const d = getDossier(id);

  if (!d) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Dossier niet gevonden</h1>
        <Button asChild variant="outline"><Link to="/">Terug naar dashboard</Link></Button>
      </div>
    );
  }

  const klaarVoorControle = hasMinimaleBronnen(d.id);
  const bronnen = listBronnen(d.id);
  const voortgang = voortgangDossier(bronnen, d.id);

  const rows: Array<[string, string]> = [
    ["Bedrijfsnaam", d.bedrijfsnaam],
    ["Dossiernaam", d.dossiernaam],
    ["Periode", `${d.periode_van} t/m ${d.periode_tot} (${d.periode_type})`],
    ["Type controle", d.controle_type],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{d.dossiernaam}</h1>
          <p className="text-sm text-muted-foreground">{d.bedrijfsnaam}</p>
        </div>
        <Badge variant="outline" className="capitalize">{d.status}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Dossiergegevens</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k} className="space-y-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                <dd className="text-sm">{v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Wat ontbreekt nog?</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            {voortgang.bronnen.map((b) => (
              <li key={b.type} className="flex items-start gap-3 text-sm">
                {b.status === "compleet" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Compleet" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-label="Nog niet compleet" />
                )}
                <div>
                  <p className="font-medium">{b.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.levert}. {b.toelichting}
                    {b.bestandsnamen.length > 0 && <> Bestand: {b.bestandsnamen.join(", ")}.</>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {voortgang.herkomstOntbreekt > 0 && (
            <p className="text-xs text-muted-foreground">
              Herkomst bij {voortgang.herkomstOntbreekt} {voortgang.herkomstOntbreekt === 1 ? "bron" : "bronnen"} niet vastgelegd.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
            <p className="text-sm">{voortgang.volgendeStap.tekst}</p>
            <Button asChild>
              <Link to={voortgang.volgendeStap.route}>Volgende stap</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <AanleverprofielKaart key={`ap-${d.id}`} bedrijfsnaam={d.bedrijfsnaam} bronnen={bronnen} />

      <ProjectenBeheer key={d.id} dossierId={d.id} />

      <Card>
        <CardHeader><CardTitle className="text-base">Stap 2: Bronnen</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Upload bronbestanden, koppel kolommen, classificeer regels en bekijk de validatie.
          </p>
          <Button asChild>
            <Link to={`/dossiers/${d.id}/bronnen`}>Bronnen uploaden</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Stap 3: Controle &amp; rapportage</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          {klaarVoorControle ? (
            <>
              <p className="text-sm text-muted-foreground">
                Bekijk de KPI's, de kerncontroles en genereer de managementsamenvatting.
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link to={`/dossiers/${d.id}/rapportage`}>Rapportage</Link>
                </Button>
                <Button asChild>
                  <Link to={`/dossiers/${d.id}/controle`}>Controle-overzicht bekijken</Link>
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Voeg eerst minimaal zorgopbrengsten en personeelskosten toe om controles uit te voeren.
            </p>
          )}
        </CardContent>
      </Card>

      <ToerekeningOverzicht dossierId={d.id} />

      <div>
        <Button asChild variant="outline"><Link to="/">Terug naar dashboard</Link></Button>
      </div>
    </div>
  );
}
