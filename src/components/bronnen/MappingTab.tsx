import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BRON_LABELS,
  EENHEID_LABEL,
  type Eenheid,
  VERPLICHTE_VELDEN,
  OPTIONELE_VELDEN,
  type BronBestand,
  type BronType,
  getSavedMapping,
  saveMapping,
  suggestMapping,
  upsertBron,
} from "@/lib/bronnen";
import { veldNaam, veldUitleg } from "@/lib/veld-labels";

/** Sentinel voor "geen kolom gekozen" bij optionele velden (Radix Select staat geen lege waarde toe). */
const GEEN_KOLOM = "__geen__";
/** Sentinel voor "eenheid automatisch herkennen". */
const AUTO_EENHEID = "__auto__";

interface Props {
  bronnen: BronBestand[];
  onChange: () => void;
  bedrijfsnaam?: string;
}

export default function MappingTab({ bronnen, onChange, bedrijfsnaam }: Props) {
  const teMappen = bronnen.filter(
    (b) => b.type !== "niet_gebruiken" && !b.fout && b.type_bevestigd,
  );

  if (teMappen.length === 0) {
    return <p className="text-sm text-muted-foreground">Bevestig eerst het type van geüploade bestanden in tab 1.</p>;
  }

  return (
    <div className="space-y-4">
      {teMappen.map((b) => (
        <MappingKaart key={b.id} bron={b} onChange={onChange} bedrijfsnaam={bedrijfsnaam} />
      ))}
    </div>
  );
}

function MappingKaart({
  bron,
  onChange,
  bedrijfsnaam,
}: {
  bron: BronBestand;
  onChange: () => void;
  bedrijfsnaam?: string;
}) {
  const type = bron.type as Exclude<BronType, "niet_gebruiken">;
  const verplicht = VERPLICHTE_VELDEN[type];
  const optioneel = OPTIONELE_VELDEN[type] ?? [];
  const initial = bron.mapping && Object.keys(bron.mapping).length > 0
    ? bron.mapping
    : suggestMapping(type, bron.headers);
  const [mapping, setMapping] = useState<Record<string, string>>(initial);

  // Persist auto-suggested mapping zodat tab 3/4 het zien.
  useEffect(() => {
    if (!bron.mapping || Object.keys(bron.mapping).length === 0) {
      if (Object.keys(initial).length > 0) {
        upsertBron({ ...bron, mapping: initial });
        onChange();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bron.id]);

  const opgeslagen = getSavedMapping(bron.type, bedrijfsnaam);
  // Toon "Gebruik vorige mapping" alleen als de opgeslagen mapping daadwerkelijk verschilt
  const verschilt =
    opgeslagen && JSON.stringify(opgeslagen) !== JSON.stringify(mapping);

  const update = (veld: string, header: string) => {
    const next = { ...mapping };
    if (header === GEEN_KOLOM) delete next[veld];
    else next[veld] = header;
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
            {opgeslagen && verschilt && (
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
                saveMapping(bron.type, mapping, bedrijfsnaam);
                onChange();
              }}
            >
              Onthoud deze kolomkeuze voor deze klant
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-xs text-muted-foreground">
          Kies per veld de kolom uit het bestand. Met &quot;Onthoud deze kolomkeuze voor deze klant&quot; bewaar je de keuze;
          bij een volgend bestand van dezelfde klant en hetzelfde type wordt die keuze dan voorgesteld.
        </p>
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
                  <span className="w-48 text-sm">
                    {veldNaam(v)}
                    <span className="block text-xs text-muted-foreground">{veldUitleg(v)}</span>
                  </span>
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
            {optioneel.length > 0 && (
              <>
                <h4 className="mb-2 mt-4 text-xs font-medium uppercase text-muted-foreground">Optionele velden</h4>
                <div className="space-y-3">
                  {optioneel.map((v) => (
                    <div key={v} className="flex items-center gap-3">
                      <span className="w-48 text-sm">
                        {veldNaam(v)} <span className="text-xs text-muted-foreground">(optioneel)</span>
                        <span className="block text-xs text-muted-foreground">{veldUitleg(v)}</span>
                      </span>
                      <Select value={mapping[v] || GEEN_KOLOM} onValueChange={(val) => update(v, val)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Geen kolom" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={GEEN_KOLOM}>Geen kolom (automatisch herkennen)</SelectItem>
                          {bron.headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </>
            )}
            {type === "gedeclareerde_uren" && (
              <>
                <h4 className="mb-2 mt-4 text-xs font-medium uppercase text-muted-foreground">Eenheid</h4>
                <div className="flex items-center gap-3">
                  <span className="w-48 text-sm">Eenheid van de aantallen</span>
                  <Select
                    value={bron.eenheid ?? AUTO_EENHEID}
                    onValueChange={(val) => {
                      upsertBron({ ...bron, eenheid: val === AUTO_EENHEID ? undefined : (val as Eenheid) });
                      onChange();
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO_EENHEID}>Automatisch (uit kolom of kolomnaam)</SelectItem>
                      {(Object.keys(EENHEID_LABEL) as Eenheid[]).map((e) => (
                        <SelectItem key={e} value={e}>{EENHEID_LABEL[e]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
