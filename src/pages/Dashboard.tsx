import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listDossiers, type Dossier } from "@/lib/dossiers";

export default function Dashboard() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);

  useEffect(() => {
    setDossiers(listDossiers());
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overzicht van je controledossiers.</p>
        </div>
        <Button asChild>
          <Link to="/dossiers/nieuw">Nieuw controledossier</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Filters</CardTitle>
          <Badge variant="secondary">Binnenkort beschikbaar</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Klant</Label>
              <Input placeholder="Alle klanten" disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Periode</Label>
              <Input placeholder="Alle periodes" disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Alle statussen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nieuw">Nieuw</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dossiers</CardTitle>
        </CardHeader>
        <CardContent>
          {dossiers.length === 0 ? (
            <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
              Nog geen dossiers. Klik op Nieuw controledossier om te beginnen.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bedrijfsnaam</TableHead>
                  <TableHead>Dossiernaam</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aangemaakt</TableHead>
                  <TableHead className="text-right">Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dossiers.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.bedrijfsnaam}</TableCell>
                    <TableCell>{d.dossiernaam}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.periode_van} t/m {d.periode_tot}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(d.aangemaakt_op).toLocaleDateString("nl-NL")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/dossiers/${d.id}`}>Open dossier</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
