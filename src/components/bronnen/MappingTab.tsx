import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BRON_LABELS,
  VERPLICHTE_VELDEN,
  type BronBestand,
  type BronType,
  getSavedMapping,
  saveMapping,
  suggestMapping,
  upsertBron,
} from "@/lib/bronnen";

interface Props {
  bronnen: BronBestand[];
  onChange: () => void;
}

export default function MappingTab({ bronnen, onChange }: Props) {
  const teMappen = bronnen.filter(
    (b) => b.type !== "niet_gebruiken" && !b.fout,
  );

  if (teMappen.length === 0) {
    return <p className="text-sm text-muted-foreground">Upload eerst bronbestanden in tab 1.</p>;
  }

  return (
    <div className="space-y-4">
      {teMappen.map((b) => (
        <MappingKaart key={b.id} bron={b} onChange={onChange} />
      ))}
    </div>
  );
}

function MappingKaart({ bron, onChange }: { bron: BronBestand; onChange: () => void }) {
  const type = bron.type as Exclude<BronType, "niet_gebruiken">;
  const verplicht = VERPLICHTE_VELDEN[type];
  const [mapping, setMapping] = useState<Record<string, string>>(
    bron.mapping || suggestMapping(type, bron.headers),
  );
  const opgeslagen = getSavedMapping(bron.type);

  const update = (veld: string, header: string) => {
    const next = { ...mapping, [veld]: header };
    setMapping(next);
    upsertBron({ ...bron, mapping: next });
    onChange();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>
            {bron.bestandsnaam} <Badge variant="outline" className="ml-2">{BRON_LABELS[bron.type]}</Badge>
          </span>
          <div className="flex gap-2">
            {opgeslagen && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMapping(opgeslagen);
                  upsertBron({ ...bron, mapping: opgeslagen });
                  onChange();
                }}
              >
                Gebruik vorige mapping
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                saveMapping(bron.type, mapping);
                onChange();
              }}
            >
              Opslaan als klantprofiel
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">Voorbeeld eerste rijen</h4>
            <div className="overflow-x-auto rounded-md border text-xs">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    {bron.headers.map((h) => (
                      <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bron.rijen.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t">
                      {bron.headers.map((_, j) => (
                        <td key={j} className="px-2 py-1">{r[j] ?? ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">Verplichte velden</h4>
            <div className="space-y-3">
              {verplicht.map((v) => (
                <div key={v} className="flex items-center gap-3">
                  <span className="w-48 text-sm">{v}</span>
                  <Select value={mapping[v] || ""} onValueChange={(val) => update(v, val)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Kies kolom…" />
                    </SelectTrigger>
                    <SelectContent>
                      {bron.headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
