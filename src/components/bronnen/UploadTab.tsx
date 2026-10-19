import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BRON_BESCHRIJVING,
  BRON_LABELS,
  type BronBestand,
  type BronType,
  CSVError,
  ALLE_BRONTYPEN,
  detectBronType,
  deleteBron,
  isExcelBestand,
  isPdfBestand,
  parseCSV,
  parseExcel,
  parsePdf,
  bewaarPdf,
  getPdf,
  upsertBron,
  wijzigBronType,
  vindDubbeleFacturen,
} from "@/lib/bronnen";
import { datumUitLastModified } from "@/lib/herkomst";
import { HerkomstBlok } from "./HerkomstBlok";

interface Props {
  dossierId: string;
  bronnen: BronBestand[];
  onChange: () => void;
}

const KAARTEN = ALLE_BRONTYPEN;

export default function UploadTab({ dossierId, bronnen, onChange }: Props) {
  const dubbel = vindDubbeleFacturen(bronnen);
  return (
    <div className="space-y-4">
      {dubbel.length > 0 && <DubbeleFacturenMelding dubbel={dubbel} bronnen={bronnen} onChange={onChange} />}
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
        bestanden={bronnen.filter((b) => !b.fout && !b.type_bevestigd)}
        onChange={onChange}
      />
    </div>
    </div>
  );
}

function DubbeleFacturenMelding({
  dubbel,
  bronnen,
  onChange,
}: {
  dubbel: ReturnType<typeof vindDubbeleFacturen>;
  bronnen: BronBestand[];
  onChange: () => void;
}) {
  // Verwijder de rij uit alle latere voorkomens; het eerste voorkomen blijft staan.
  const verwijderDubbel = (g: (typeof dubbel)[number]) => {
    const perBron = new Map<string, number[]>();
    for (const v of g.voorkomens.slice(1)) perBron.set(v.bronId, [...(perBron.get(v.bronId) ?? []), v.rij]);
    for (const [bronId, rijen] of perBron) {
      const b = bronnen.find((x) => x.id === bronId);
      if (!b) continue;
      const weg = new Set(rijen);
      if (weg.size >= b.rijen.length) {
        deleteBron(b.id);
        continue;
      }
      // Indexen van classificaties/toewijzingen opnieuw nummeren.
      const nieuwIdx = new Map<number, number>();
      let j = 0;
      b.rijen.forEach((_, i) => {
        if (!weg.has(i)) nieuwIdx.set(i, j++);
      });
      const herNummer = <T,>(m?: Record<number, T>) => {
        if (!m) return m;
        const out: Record<number, T> = {};
        for (const [k, v] of Object.entries(m)) {
          const n = nieuwIdx.get(Number(k));
          if (n !== undefined) out[n] = v;
        }
        return out;
      };
      upsertBron({
        ...b,
        rijen: b.rijen.filter((_, i) => !weg.has(i)),
        classificaties: herNummer(b.classificaties),
        projecttoewijzingen: herNummer(b.projecttoewijzingen),
      });
    }
    onChange();
  };
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Mogelijk dubbele facturen ({dubbel.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Deze facturen komen vaker voor met hetzelfde factuurnummer, dezelfde relatie en hetzelfde bedrag. Controleer ze
          voordat u verder gaat met classificeren.
        </p>
        <ul className="space-y-2">
          {dubbel.map((g) => (
            <li key={g.sleutel} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card p-2 text-sm">
              <div>
                <div className="font-medium">
                  Factuur {g.factuurnummer} — {g.relatie || "onbekende relatie"} —{" "}
                  {Number(g.bedrag).toLocaleString("nl-NL", { style: "currency", currency: "EUR" })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {g.voorkomens.length}x in: {[...new Set(g.voorkomens.map((v) => v.bestandsnaam))].join(", ")}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => verwijderDubbel(g)}>
                Dubbele verwijderen
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
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
          multiple
          accept=".csv,.xlsx,.xls,.pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button size="sm" variant="outline" className="w-full" onClick={() => inputRef.current?.click()}>
          Bestanden uploaden (meerdere CSV / Excel / PDF)
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              deleteBron(bron.id);
              onChange();
            }}
          >
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
            upsertBron(wijzigBronType(bron, v as BronType));
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
            <SelectItem value="gedeclareerde_uren">Gedeclareerde uren</SelectItem>
            <SelectItem value="niet_productieve_uren">Niet-productieve uren</SelectItem>
            <SelectItem value="niet_gebruiken">Niet gebruiken</SelectItem>
          </SelectContent>
        </Select>
        {!bron.type_bevestigd && bron.type !== "niet_gebruiken" && (
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              upsertBron({ ...bron, type_bevestigd: true });
              onChange();
            }}
          >
            Bevestig
          </Button>
        )}
        {isPdfBestand(bron.bestandsnaam) && <BekijkPdf bron={bron} />}
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
      <HerkomstBlok bron={bron} onChange={onChange} />
      {bron.type_auto_herkend && !bron.type_bevestigd && (
        <p className="mt-1 text-[11px] text-muted-foreground">Type automatisch herkend — bevestig of wijzig.</p>
      )}
    </li>
  );
}

async function importFile(dossierId: string, file: File, voorgesteldType?: BronType) {
  try {
    if (file.size === 0) {
      upsertBron(makeFout(dossierId, file.name, "Dit bestand is leeg. Upload een bestand met gegevens."));
      return;
    }
    const { headers, rows } = isExcelBestand(file.name)
      ? await parseExcel(await file.arrayBuffer())
      : isPdfBestand(file.name)
        ? await parsePdf(await file.arrayBuffer())
        : parseCSV(await file.text());
    if (headers.length === 0) {
      upsertBron(makeFout(dossierId, file.name, "Bestand bevat geen kolomkoppen."));
      return;
    }
    const auto = voorgesteldType ?? detectBronType(file.name, headers);
    const isManueel = !!voorgesteldType;
    const id = crypto.randomUUID();
    const exportDatum = datumUitLastModified(file.lastModified);
    if (isPdfBestand(file.name)) {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(r.error);
        r.readAsDataURL(file);
      });
      bewaarPdf(id, dataUrl);
    }
    upsertBron({
      id,
      dossier_id: dossierId,
      bestandsnaam: file.name,
      geupload_op: new Date().toISOString(),
      type: auto ?? ("niet_gebruiken" as BronType),
      type_auto_herkend: !!auto && !isManueel,
      type_bevestigd: isManueel,
      headers,
      rijen: rows,
      preview_rows: Math.min(5, rows.length),
      // Exportdatum voorgesteld uit de wijzigingsdatum van het bestand; aanpasbaar in het blok "Herkomst".
      herkomst: exportDatum ? { export_datum: exportDatum } : undefined,
    });
  } catch (e) {
    const msg =
      e instanceof CSVError
        ? e.message
        : e instanceof Error
        ? `We konden dit bestand niet lezen: ${e.message}`
        : "Onbekende fout bij inlezen.";
    upsertBron(makeFout(dossierId, file.name, msg));
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
    type_bevestigd: true,
    headers: [],
    rijen: [],
    preview_rows: 0,
    fout,
  };
}

function BekijkPdf({ bron }: { bron: BronBestand }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const openen = async () => {
    const data = getPdf(bron.id);
    if (data) {
      const blob = await (await fetch(data)).blob();
      setUrl(URL.createObjectURL(blob));
    } else setUrl(null);
    setOpen(true);
  };
  return (
    <>
      <Button size="sm" variant="outline" onClick={openen}>
        Bekijk
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o && url) URL.revokeObjectURL(url);
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{bron.bestandsnaam}</DialogTitle>
          </DialogHeader>
          {url ? (
            <div className="space-y-2">
              <iframe src={url} title={bron.bestandsnaam} className="h-[70vh] w-full rounded-md border" />
              <a href={url} target="_blank" rel="noreferrer" className="text-sm underline">
                Openen in nieuw tabblad
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Het originele bestand is niet bewaard (eerder geüpload of browseropslag vol). Upload de PDF opnieuw om hem te kunnen bekijken.
            </p>
          )}
          {bron.rijen.length > 0 && (
            <div className="overflow-x-auto">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Uitgelezen gegevens</p>
              <table className="w-full text-xs">
                <thead>
                  <tr>{bron.headers.map((h) => <th key={h} className="border-b p-1 text-left">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {bron.rijen.slice(0, 10).map((r, i) => (
                    <tr key={i}>{r.map((c, j) => <td key={j} className="border-b p-1">{c}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
