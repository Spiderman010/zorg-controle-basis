import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getDossier } from "@/lib/dossiers";
import { listBronnen, type BronBestand } from "@/lib/bronnen";
import UploadTab from "@/components/bronnen/UploadTab";
import MappingTab from "@/components/bronnen/MappingTab";
import ClassificatieTab from "@/components/bronnen/ClassificatieTab";
import ValidatieTab from "@/components/bronnen/ValidatieTab";

export default function DossierBronnen() {
  const { id = "" } = useParams();
  const dossier = getDossier(id);
  const [bronnen, setBronnen] = useState<BronBestand[]>([]);
  const [tab, setTab] = useState("upload");

  const refresh = () => setBronnen(listBronnen(id));
  useEffect(() => {
    refresh();
  }, [id]);

  const teller = useMemo(() => bronnen.length, [bronnen]);

  if (!dossier) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Dossier niet gevonden</h1>
        <Button asChild variant="outline">
          <Link to="/">Terug naar dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bronnen — {dossier.dossiernaam}</h1>
          <p className="text-sm text-muted-foreground">{dossier.bedrijfsnaam}</p>
        </div>
        <Badge variant="outline">{teller} bestand(en)</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoerflow</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload">1. Upload &amp; type</TabsTrigger>
              <TabsTrigger value="mapping">2. Kolommen koppelen</TabsTrigger>
              <TabsTrigger value="classificatie">3. Classificatie</TabsTrigger>
              <TabsTrigger value="validatie">4. Validatie</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-6">
              <UploadTab dossierId={id} bronnen={bronnen} onChange={refresh} />
            </TabsContent>
            <TabsContent value="mapping" className="mt-6">
              <MappingTab bronnen={bronnen} onChange={refresh} />
            </TabsContent>
            <TabsContent value="classificatie" className="mt-6">
              <ClassificatieTab bronnen={bronnen} onChange={refresh} />
            </TabsContent>
            <TabsContent value="validatie" className="mt-6">
              <ValidatieTab bronnen={bronnen} dossierId={id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div>
        <Button asChild variant="outline">
          <Link to={`/dossiers/${id}`}>Terug naar dossier</Link>
        </Button>
      </div>
    </div>
  );
}
