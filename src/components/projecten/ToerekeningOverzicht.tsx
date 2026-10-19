import { Fragment, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listBronnen } from "@/lib/bronnen";
import { listProjecten, ROL_KORT } from "@/lib/projecten";
import { berekenToerekening, filterToerekening, totaalInclusief, type ToerekeningRij } from "@/lib/toerekening";

const eur = (n: number) => n.toLocaleString("nl-NL", { style: "currency", currency: "EUR" });

export default function ToerekeningOverzicht({ dossierId }: { dossierId: string }) {
  const [zoek, setZoek] = useState("");
  const alle = useMemo(() => berekenToerekening(listBronnen(dossierId), listProjecten(dossierId)), [dossierId]);
  const rijen = filterToerekening(alle, zoek);

  const Regel = ({ r, kind, inclusief }: { r: ToerekeningRij; kind?: boolean; inclusief?: boolean }) => {
    const t = inclusief ? totaalInclusief(r) : r;
    const marge = t.omzet - t.kosten;
    return (
      <tr className={kind ? "bg-muted/30" : "border-t"}>
        <td className={`py-2 pr-3 ${kind ? "pl-8 text-muted-foreground" : "pl-3 font-medium"}`}>
          {kind && "↳ "}
          {r.project?.naam ?? "Niet toegewezen"}
          {r.project?.rol && <Badge variant="outline" className="ml-2 text-[10px]">{ROL_KORT[r.project.rol]}</Badge>}
        </td>
        <td className="py-2 pr-3 text-right tabular-nums">{eur(t.omzet)}</td>
        <td className="py-2 pr-3 text-right tabular-nums">{eur(t.kosten)}</td>
        <td className={`py-2 pr-3 text-right tabular-nums ${marge < 0 ? "text-destructive" : ""}`}>{eur(marge)}</td>
        <td className="py-2 pr-3 text-right tabular-nums">{t.uren.toLocaleString("nl-NL")}</td>
        <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{t.regels}</td>
      </tr>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Toerekening per kostenplaats</CardTitle>
          <p className="text-xs text-muted-foreground">Omzet en kosten per opdrachtgever, met cliënten eronder.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek kostenplaats..." className="pl-8" />
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rijen.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen kostenplaatsen gevonden.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pl-3 text-left font-medium">Kostenplaats</th>
                <th className="py-2 pr-3 text-right font-medium">Omzet</th>
                <th className="py-2 pr-3 text-right font-medium">Kosten</th>
                <th className="py-2 pr-3 text-right font-medium">Marge</th>
                <th className="py-2 pr-3 text-right font-medium">Uren</th>
                <th className="py-2 pr-3 text-right font-medium">Regels</th>
              </tr>
            </thead>
            <tbody>
              {rijen.map((r, i) => (
                <Fragment key={r.project?.id ?? `geen-${i}`}>
                  <Regel r={r} inclusief />
                  {r.kinderen.map((k) => <Regel key={k.project!.id} r={k} kind />)}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Totaal bij een opdrachtgever is inclusief de cliënten eronder.</p>
      </CardContent>
    </Card>
  );
}
