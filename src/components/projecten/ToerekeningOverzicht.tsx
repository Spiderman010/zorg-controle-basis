import { Fragment, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const exporteer = async () => {
    const XLSX = await import("xlsx");
    const kop = ["Kostenplaats", "Soort", "Rol", "Omzet", "Kosten", "Marge", "Uren", "Regels"];
    const data: (string | number)[][] = [kop];
    const regel = (r: ToerekeningRij, soort: string, t = r) => {
      data.push([
        r.project?.naam ?? "Niet toegewezen",
        soort,
        r.project?.rol ? ROL_KORT[r.project.rol] : "",
        t.omzet, t.kosten, t.omzet - t.kosten, t.uren, t.regels,
      ]);
    };
    for (const r of rijen) {
      regel(r, r.kinderen.length ? "Totaal opdrachtgever (incl. cliënten)" : "Kostenplaats", { ...r, ...totaalInclusief(r) });
      for (const k of r.kinderen) regel(k, "Cliëntregel");
    }
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 32 }, { wch: 36 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 8 }];
    for (let i = 2; i <= data.length; i++)
      for (const c of ["D", "E", "F"]) if (ws[`${c}${i}`]) ws[`${c}${i}`].z = '€ #,##0.00;-€ #,##0.00';
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Toerekening");
    XLSX.writeFile(wb, `toerekening-kostenplaatsen-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

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
        <div className="flex w-full items-center gap-2 sm:w-auto">
        <Button variant="outline" size="sm" onClick={exporteer} disabled={rijen.length === 0}>
          <Download className="h-4 w-4" /> Excel downloaden
        </Button>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek kostenplaats..." className="pl-8" />
        </div>
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
