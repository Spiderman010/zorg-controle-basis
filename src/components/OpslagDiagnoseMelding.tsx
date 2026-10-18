import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Ernst = "fout" | "waarschuwing";
interface Diagnose {
  ernst: Ernst;
  titel: string;
  oorzaak: string;
  volgendeStap: string;
}

function leesArray(key: string): { ok: boolean; aanwezig: boolean; data: unknown[] } {
  const raw = localStorage.getItem(key);
  if (raw === null) return { ok: true, aanwezig: false, data: [] };
  try {
    const p = JSON.parse(raw);
    return { ok: true, aanwezig: true, data: Array.isArray(p) ? p : [] };
  } catch {
    return { ok: false, aanwezig: true, data: [] };
  }
}

export function diagnoseOpslag(): Diagnose | null {
  const dossiers = leesArray("zcb.dossiers.v1");
  const bronnen = leesArray("zcb.bronnen.v1");
  const projecten = leesArray("zcb.projecten.v1");
  const mappingsAanwezig = localStorage.getItem("zcb.mappings.v1") !== null;
  const host = window.location.host;

  if (!dossiers.ok) {
    return {
      ernst: "fout",
      titel: "Dossieropslag is beschadigd",
      oorzaak: "De opgeslagen dossiergegevens in deze browser zijn onleesbaar, waardoor de app ze niet kan tonen.",
      volgendeStap: "Open de diagnosepagina en kopieer de ruwe gegevens als back-up. Verwijder of overschrijf niets voordat dit is bekeken.",
    };
  }

  const dossierIds = new Set(
    dossiers.data.map((d) => (d as { id?: string })?.id).filter(Boolean) as string[],
  );
  const verweesd = new Set<string>();
  for (const r of [...bronnen.data, ...projecten.data]) {
    const id = (r as { dossier_id?: string })?.dossier_id;
    if (id && !dossierIds.has(id)) verweesd.add(id);
  }

  if (verweesd.size > 0) {
    return {
      ernst: "fout",
      titel: `Bronbestanden gevonden voor ${verweesd.size} ontbrekend(e) dossier(s)`,
      oorzaak: "In deze browser staan nog geüploade bronnen of projecten, maar het bijbehorende dossier is niet meer aanwezig. Het dossier is waarschijnlijk verwijderd of de dossierlijst is overschreven.",
      volgendeStap: "Open de diagnosepagina om de ruwe gegevens te bekijken en een kopie te bewaren. Maak daarna het dossier opnieuw aan.",
    };
  }

  if (dossierIds.size > 0) return null;

  if (!dossiers.aanwezig && !bronnen.aanwezig && !mappingsAanwezig && !projecten.aanwezig) {
    const opPreview = host.includes("id-preview--");
    return {
      ernst: "waarschuwing",
      titel: "Geen opgeslagen gegevens op dit adres",
      oorzaak: `Er staat helemaal niets van Zorg Controle Basis in deze browser op ${host}. Gegevens worden per browser, per profiel en per webadres apart bewaard. Waarschijnlijk werkte je eerder in een andere browser, een ander profiel, in een incognitovenster, op een ander adres${opPreview ? " (bijvoorbeeld de gepubliceerde versie of localhost)" : " (bijvoorbeeld de preview of localhost)"}, of zijn de sitegegevens gewist.`,
      volgendeStap: "Open de app in de browser en op het adres waar je de dossiers eerder hebt aangemaakt. Is dit de eerste keer, dan kun je deze melding negeren.",
    };
  }

  return {
    ernst: "waarschuwing",
    titel: "Dossierlijst is leeg",
    oorzaak: "Er zijn wel eerdere gegevens (zoals kolomkoppelingen) in deze browser, maar geen dossiers. De dossiers zijn verwijderd of op een ander adres of in een andere browser aangemaakt.",
    volgendeStap: "Controleer of je op hetzelfde adres en in dezelfde browser werkt als eerder. Opgeslagen klantprofielen blijven bruikbaar bij een nieuw dossier.",
  };
}

const VERBORGEN_KEY = "zcb.diagnose.verborgen";

export function OpslagDiagnoseMelding() {
  const [diag, setDiag] = useState<Diagnose | null>(null);
  const [verborgen, setVerborgen] = useState(false);

  useEffect(() => {
    const d = diagnoseOpslag();
    setDiag(d);
    setVerborgen(!!d && sessionStorage.getItem(VERBORGEN_KEY) === d.titel);
  }, []);

  if (!diag || verborgen) return null;

  return (
    <Alert variant={diag.ernst === "fout" ? "destructive" : "default"} className="mb-6">
      <AlertTitle>Automatische diagnose: {diag.titel}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p><span className="font-medium">Oorzaak:</span> {diag.oorzaak}</p>
        <p><span className="font-medium">Volgende stap:</span> {diag.volgendeStap}</p>
        <div className="flex gap-2 pt-1">
          <Button asChild size="sm" variant="outline">
            <Link to="/debug">Open diagnosepagina</Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              sessionStorage.setItem(VERBORGEN_KEY, diag.titel);
              setVerborgen(true);
            }}
          >
            Verbergen
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
