import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BronBestand } from "@/lib/bronnen";
import { herkomstRijen, herkomstSamenvatting } from "@/lib/herkomst-weergave";

/** Rapportblok: waar de gegevens vandaan komen en hoe sterk dat bewijs is. */
export function HerkomstRapportBlok({ bronnen }: { bronnen: BronBestand[] }) {
  const rijen = herkomstRijen(bronnen);
  return (
    <Card className="print-card">
      <CardHeader><CardTitle className="text-base">Herkomst van de gegevens</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>De gegevens komen van de klant uit eigen systemen. Deze controle stelt zelf geen uren of bedragen vast.</p>
        <p className="text-muted-foreground">{herkomstSamenvatting(bronnen)}.</p>
        {rijen.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="px-2 py-1 text-left">Bestand</th>
                  <th className="px-2 py-1 text-left">Type</th>
                  <th className="px-2 py-1 text-left">Manier</th>
                  <th className="px-2 py-1 text-left">Systeem</th>
                  <th className="px-2 py-1 text-left">Exportdatum</th>
                  <th className="px-2 py-1 text-left">Bewijsniveau</th>
                </tr>
              </thead>
              <tbody>
                {rijen.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-2 py-1">{r.bestand}</td>
                    <td className="px-2 py-1">{r.type}</td>
                    <td className="px-2 py-1">{r.manier}</td>
                    <td className="px-2 py-1">{r.systeem}</td>
                    <td className="px-2 py-1">{r.exportdatum}</td>
                    <td className="px-2 py-1">{r.niveau}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
