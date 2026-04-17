import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDossier } from "@/lib/dossiers";

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
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Stap 2: Bronnen uploaden — nog niet beschikbaar.
        </CardContent>
      </Card>

      <div>
        <Button asChild variant="outline"><Link to="/">Terug naar dashboard</Link></Button>
      </div>
    </div>
  );
}
