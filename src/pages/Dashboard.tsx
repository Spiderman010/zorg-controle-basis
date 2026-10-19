import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Building2, Clock3, CheckCircle2, Search, ArrowUpDown, FilePlus2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { listDossiers, type Dossier, type DossierStatus } from "@/lib/dossiers";
import { listBronnen } from "@/lib/bronnen";
import { voortgangDossier } from "@/lib/dossier-voortgang";

/** De volgende stap voor een dossier, in woorden (zelfde bron als de lijst op de dossierpagina). */
function voortgang(dossierId: string) {
  const stap = voortgangDossier(listBronnen(dossierId), dossierId).volgendeStap;
  return { stap: stap.tekst, klaar: stap.route.endsWith("/controle") };
}

type StatusFilter = "alle" | DossierStatus;
type Sortering = "nieuwste" | "oudste" | "klant" | "periode";

const statusStijl: Record<DossierStatus, string> = {
  nieuw: "border-primary/30 bg-primary/10 text-primary",
  "in behandeling": "border-warning/30 bg-warning/10 text-warning",
  afgerond: "border-success/30 bg-success/10 text-success",
};

function datum(s: string) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export default function Dashboard() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [zoek, setZoek] = useState("");
  const [status, setStatus] = useState<StatusFilter>("alle");
  const [sortering, setSortering] = useState<Sortering>("nieuwste");

  useEffect(() => {
    setDossiers(listDossiers());
  }, []);

  const kpis = useMemo(() => {
    const klanten = new Set(dossiers.map((d) => d.bedrijfsnaam.trim().toLowerCase())).size;
    const tel = (s: DossierStatus) => dossiers.filter((d) => d.status === s).length;
    return [
      { label: "Dossiers", waarde: dossiers.length, icon: FolderOpen },
      { label: "Klanten", waarde: klanten, icon: Building2 },
      { label: "Open", waarde: tel("nieuw") + tel("in behandeling"), icon: Clock3 },
      { label: "Afgerond", waarde: tel("afgerond"), icon: CheckCircle2 },
    ];
  }, [dossiers]);

  const zichtbaar = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    const lijst = dossiers.filter((d) => {
      if (status !== "alle" && d.status !== status) return false;
      if (!q) return true;
      return d.bedrijfsnaam.toLowerCase().includes(q) || d.dossiernaam.toLowerCase().includes(q);
    });
    return [...lijst].sort((a, b) => {
      switch (sortering) {
        case "oudste":
          return a.aangemaakt_op.localeCompare(b.aangemaakt_op);
        case "klant":
          return a.bedrijfsnaam.localeCompare(b.bedrijfsnaam, "nl");
        case "periode":
          return b.periode_van.localeCompare(a.periode_van);
        default:
          return b.aangemaakt_op.localeCompare(a.aangemaakt_op);
      }
    });
  }, [dossiers, zoek, status, sortering]);

  const filterActief = zoek !== "" || status !== "alle";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overzicht van je controledossiers.</p>
        </div>
        <Button asChild>
          <Link to="/dossiers/nieuw">
            <FilePlus2 className="h-4 w-4" /> Nieuw controledossier
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{k.waarde}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <k.icon className="h-4 w-4" aria-hidden />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
              placeholder="Zoek op klant of dossiernaam"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border p-0.5">
              {(["alle", "nieuw", "in behandeling", "afgerond"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                    status === s ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <Select value={sortering} onValueChange={(v) => setSortering(v as Sortering)}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nieuwste">Nieuwste eerst</SelectItem>
                <SelectItem value="oudste">Oudste eerst</SelectItem>
                <SelectItem value="klant">Klant (A-Z)</SelectItem>
                <SelectItem value="periode">Periode</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {dossiers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FolderOpen className="h-5 w-5 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-sm text-muted-foreground">
              Nog geen dossiers. Klik op Nieuw controledossier om te beginnen.
            </p>
            <Button asChild size="sm">
              <Link to="/dossiers/nieuw">Nieuw controledossier</Link>
            </Button>
          </div>
        ) : zichtbaar.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="text-sm text-muted-foreground">Geen dossiers gevonden met deze filters.</p>
            <Button size="sm" variant="outline" onClick={() => { setZoek(""); setStatus("alle"); }}>
              <X className="h-3.5 w-3.5" /> Filters wissen
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Klant / dossier</TableHead>
                  <TableHead className="hidden md:table-cell">Periode</TableHead>
                  <TableHead className="hidden lg:table-cell">Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Aangemaakt</TableHead>
                  <TableHead className="text-right">Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zichtbaar.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="font-medium">{d.bedrijfsnaam}</div>
                      <div className="text-xs text-muted-foreground">{d.dossiernaam}</div>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {datum(d.periode_van)} – {datum(d.periode_tot)}
                      <div className="text-xs capitalize">{d.periode_type}</div>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{d.controle_type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("capitalize", statusStijl[d.status])}>
                        {d.status}
                      </Badge>
                      {(() => {
                        const v = voortgang(d.id);
                        return (
                          <div className={cn("mt-1 text-xs", v.klaar ? "text-success" : "text-muted-foreground")}>
                            {v.stap}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {datum(d.aangemaakt_op)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
                          <Link to={`/dossiers/${d.id}/controle`}>Controle</Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/dossiers/${d.id}/bronnen`}>Bronnen</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/dossiers/${d.id}`}>Openen</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t px-4 py-3 text-xs text-muted-foreground">
              {zichtbaar.length} van {dossiers.length} dossiers{filterActief && " (gefilterd)"}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
