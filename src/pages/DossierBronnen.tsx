import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
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
import { Check } from "lucide-react";

export default function DossierBronnen() {
  const { id = "" } = useParams();
  const dossier = getDossier(id);
  const [bronnen, setBronnen] = useState<BronBestand[]>([]);
  // Een tabblad kan via de adresbalk worden geopend, bijvoorbeeld ?tab=mapping (vanuit "Wat ontbreekt nog?").
  const [searchParams] = useSearchParams();
  const geldigeTabs = ["upload", "mapping", "classificatie", "validatie"];
  const gevraagdTab = searchParams.get("tab");
  const [tab, setTab] = useState(gevraagdTab && geldigeTabs.includes(gevraagdTab) ? gevraagdTab : "upload");

  const refresh = () => setBronnen(listBronnen(id));
  useEffect(() => {
    refresh();
  }, [id]);

  const teller = useMemo(() => bronnen.length, [bronnen]);
  const stappen = useMemo(() => {
    const bruikbaar = bronnen.filter((b) => !b.fout && b.type !== "niet_gebruiken");
    const bevestigd = bruikbaar.filter((b) => b.type_bevestigd);
    const gekoppeld = bevestigd.filter((b) => b.mapping && Object.keys(b.mapping).length > 0);
    const open = bronnen.length - bevestigd.length;
    return [
      { id: "upload", label: "Upload & type", klaar: bevestigd.length > 0 && open === 0, info: `${bevestigd.length} bevestigd${open > 0 ? `, ${open} open` : ""}` },
      { id: "mapping", label: "Kolommen koppelen", klaar: bevestigd.length > 0 && gekoppeld.length === bevestigd.length, info: `${gekoppeld.length} van ${bevestigd.length} gekoppeld` },
      { id: "classificatie", label: "Classificatie", klaar: false, info: "Regels beoordelen" },
      { id: "validatie", label: "Validatie", klaar: false, info: "Fouten en signalen" },
    ];
  }, [bronnen]);

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
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-4">
              {stappen.map((s, i) => (
                <TabsTrigger key={s.id} value={s.id} className="flex items-center justify-start gap-2 py-2 text-left">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                      s.klaar ? "border-success bg-success text-success-foreground" : "border-muted-foreground/40"
                    }`}
                  >
                    {s.klaar ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-xs font-medium">{s.label}</span>
                    <span className="text-[10px] text-muted-foreground">{s.info}</span>
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="upload" className="mt-6">
              <UploadTab dossierId={id} bronnen={bronnen} onChange={refresh} bedrijfsnaam={dossier.bedrijfsnaam} />
            </TabsContent>
            <TabsContent value="mapping" className="mt-6">
              <MappingTab bronnen={bronnen} onChange={refresh} bedrijfsnaam={dossier.bedrijfsnaam} />
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
