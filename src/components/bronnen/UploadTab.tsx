import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BRON_BESCHRIJVING,
  BRON_LABELS,
  type BronBestand,
  type BronType,
  detectBronType,
  deleteBron,
  parseCSV,
  upsertBron,
} from "@/lib/bronnen";

interface Props {
  dossierId: string;
  bronnen: BronBestand[];
  onChange: () => void;
}

const KAARTEN: Exclude<BronType, "niet_gebruiken">[] = [
  "zorgopbrengsten",
  "personeelskosten",
  "inhuur",
  "betaalde_uren",
  "directe_uren",
  "niet_productieve_uren",
];

export default function UploadTab({ dossierId, bronnen, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {KAARTEN.map((type) => (
        <BronKaart
          key={type}
          dossierId={dossierId}
          type={type}
          bestanden={bronnen.filter((b) => b.type === type)}
          onChange={onChange}
        />
      ))}
      <UnclassifiedKaart
        bestanden={bronnen.filter((b) => b.type_auto_herkend === false && !b.mapping)}
        onChange={onChange}
      />
    </div>
  );
}

function BronKaart({
  dossierId,
  type,
  bestanden,
  onChange,
}: {
  dossierId: string;
  type: Exclude<BronType, "niet_gebruiken">;
  bestanden: BronBestand[];
  onChange: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      await importFile(dossierId, file, type);
    }
    onChange();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{BRON_LABELS[type]}</span>
          <Badge variant="outline">{bestanden.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{BRON_BESCHRIJVING[type]}</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button size="sm" variant="outline" className="w-full" onClick={() => inputRef.current?.click()}>
          CSV uploaden
        </Button>
        <ul className="space-y-2">
          {bestanden.map((b) => (
            <BestandsRij key={b.id} bron={b} onChange={onChange} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function UnclassifiedKaart({ bestanden, onChange }: { bestanden: BronBestand[]; onChange: () => void }) {
  if (bestanden.length === 0) return null;
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Type bevestigen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          We konden het bestandstype niet herkennen. Selecteer het type handmatig.
        </p>
        <ul className="space-y-2">
          {bestanden.map((b) => (
            <BestandsRij key={b.id} bron={b} onChange={onChange} forceTypePicker />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function BestandsRij({
  bron,
  onChange,
  forceTypePicker = false,
}: {
  bron: BronBestand;
  onChange: () => void;
  forceTypePicker?: boolean;
}) {
  if (bron.fout) {
    return (
      <li className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <div className="font-medium">{bron.bestandsnaam}</div>
        <div className="text-xs text-destructive">{bron.fout}</div>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => deleteBron(bron.id) || onChange()}>
            Opnieuw proberen
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium" title={bron.bestandsnaam}>
          {bron.bestandsnaam}
        </span>
        <Badge variant="secondary" className="text-[10px]">
          {bron.rijen.length} rijen
        </Badge>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Select
          value={bron.type}
          onValueChange={(v) => {
            upsertBron({ ...bron, type: v as BronType, type_auto_herkend: false });
            onChange();
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={forceTypePicker ? "Kies type…" : ""} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="zorgopbrengsten">Zorgopbrengsten</SelectItem>
            <SelectItem value="personeelskosten">Personeelskosten</SelectItem>
            <SelectItem value="inhuur">Inhuur</SelectItem>
            <SelectItem value="betaalde_uren">Betaalde uren</SelectItem>
            <SelectItem value="directe_uren">Directe uren</SelectItem>
            <SelectItem value="niet_productieve_uren">Niet-productieve uren</SelectItem>
            <SelectItem value="niet_gebruiken">Niet gebruiken</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            deleteBron(bron.id);
            onChange();
          }}
        >
          Verwijder
        </Button>
      </div>
      {bron.type_auto_herkend && (
        <p className="mt-1 text-[11px] text-muted-foreground">Type automatisch herkend — bevestig of wijzig.</p>
      )}
    </li>
  );
}

async function importFile(dossierId: string, file: File, voorgesteldType?: BronType) {
  try {
    const text = await file.text();
    const { headers, rows } = parseCSV(text);
    if (headers.length === 0) {
      upsertBron(makeFout(dossierId, file.name, "Bestand is leeg of geen geldige CSV."));
      return;
    }
    const auto = voorgesteldType ?? detectBronType(file.name, headers);
    upsertBron({
      id: crypto.randomUUID(),
      dossier_id: dossierId,
      bestandsnaam: file.name,
      geupload_op: new Date().toISOString(),
      type: auto ?? ("niet_gebruiken" as BronType),
      type_auto_herkend: !!auto && !voorgesteldType,
      headers,
      rijen: rows,
      preview_rows: Math.min(5, rows.length),
    });
  } catch (e) {
    upsertBron(makeFout(dossierId, file.name, e instanceof Error ? e.message : "Onbekende fout bij inlezen."));
  }
}

function makeFout(dossierId: string, naam: string, fout: string): BronBestand {
  return {
    id: crypto.randomUUID(),
    dossier_id: dossierId,
    bestandsnaam: naam,
    geupload_op: new Date().toISOString(),
    type: "niet_gebruiken",
    type_auto_herkend: false,
    headers: [],
    rijen: [],
    preview_rows: 0,
    fout,
  };
}
