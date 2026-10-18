// Client-side opslag voor bronbestanden, mappings en classificaties (Fase 2B).
// Later vervangen door Lovable Cloud.

export type BronType =
  | "zorgopbrengsten"
  | "personeelskosten"
  | "inhuur"
  | "betaalde_uren"
  | "directe_uren"
  | "niet_productieve_uren"
  | "niet_gebruiken";

export const BRON_LABELS: Record<BronType, string> = {
  zorgopbrengsten: "Zorgopbrengsten",
  personeelskosten: "Personeelskosten",
  inhuur: "Inhuur",
  betaalde_uren: "Betaalde uren",
  directe_uren: "Directe uren",
  niet_productieve_uren: "Niet-productieve uren",
  niet_gebruiken: "Niet gebruiken",
};

export const BRON_BESCHRIJVING: Record<Exclude<BronType, "niet_gebruiken">, string> = {
  zorgopbrengsten: "Grootboek of subadministratie met zorgomzet per periode.",
  personeelskosten: "Lonen, sociale lasten en overige personeelskosten per periode.",
  inhuur: "Externe inhuur (zzp, detachering, uitzendkrachten) per periode.",
  betaalde_uren: "Verloonde uren per medewerker per periode.",
  directe_uren: "Cliëntgebonden / declarabele uren per medewerker.",
  niet_productieve_uren: "Verlof, ziekte, scholing, niet-cliëntgebonden uren.",
};

export const VERPLICHTE_VELDEN: Record<Exclude<BronType, "niet_gebruiken">, string[]> = {
  zorgopbrengsten: ["periode", "bedrag", "rekening_of_categorie"],
  personeelskosten: ["periode", "bedrag", "looncomponent"],
  inhuur: ["periode", "bedrag", "leverancier_of_omschrijving"],
  betaalde_uren: ["periode", "medewerker", "betaalde_uren"],
  directe_uren: ["periode", "medewerker", "directe_uren"],
  niet_productieve_uren: ["periode", "medewerker", "uren"],
};

/** Optionele velden per brontype: mogen leeg blijven, mapping-UI toont ze als "(optioneel)". */
export const OPTIONELE_VELDEN: Partial<Record<Exclude<BronType, "niet_gebruiken">, string[]>> = {
  zorgopbrengsten: ["financieringsstroom"],
};

export type ClassificatieZorg = "meetellen" | "niet_meetellen" | "twijfel";
export type ClassificatieInhuur = "zorginhuur" | "overige_inkoop" | "twijfel";
export type ClassificatieActiviteit = "direct" | "niet_productief" | "onbekend";
export type Classificatie = ClassificatieZorg | ClassificatieInhuur | ClassificatieActiviteit;

export interface BronBestand {
  id: string;
  dossier_id: string;
  bestandsnaam: string;
  geupload_op: string; // ISO
  type: BronType; // bevestigd of "niet_gebruiken" of automatisch geraden
  type_auto_herkend: boolean;
  type_bevestigd: boolean; // true zodra gebruiker het type heeft bevestigd of handmatig gekozen
  headers: string[];
  rijen: string[][]; // ruwe data zonder header
  preview_rows: number;
  mapping?: Record<string, string>; // verplichtveld -> headernaam
  classificaties?: Record<number, Classificatie>; // index -> klasse
  projecttoewijzingen?: Record<number, string>; // index -> project_id
  fout?: string;
}

const KEY = "zcb.bronnen.v1";
const MAPPING_KEY = "zcb.mappings.v1"; // opgeslagen mappings per importtype (klantprofiel)

function read(): BronBestand[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]") as BronBestand[];
    // Backwards-compat: oudere records hadden geen type_bevestigd.
    return raw.map((b) => ({
      ...b,
      type_bevestigd: b.type_bevestigd ?? (b.type !== "niet_gebruiken" || !!b.fout),
    }));
  } catch {
    return [];
  }
}
function write(all: BronBestand[]) {
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function listBronnen(dossier_id: string): BronBestand[] {
  return read().filter((b) => b.dossier_id === dossier_id);
}

export function getBron(id: string): BronBestand | undefined {
  return read().find((b) => b.id === id);
}

export function upsertBron(b: BronBestand) {
  const all = read();
  const idx = all.findIndex((x) => x.id === b.id);
  if (idx >= 0) all[idx] = b;
  else all.unshift(b);
  write(all);
}

export function deleteBron(id: string) {
  write(read().filter((b) => b.id !== id));
  verwijderPdf(id);
}

// ---- Opgeslagen mappings (klantprofiel per bedrijfsnaam + type) ----
type MappingStore = Record<string, Record<string, string>>; // sleutel -> mapping
function readMappings(): MappingStore {
  try {
    return JSON.parse(localStorage.getItem(MAPPING_KEY) || "{}");
  } catch {
    return {};
  }
}
function mappingKey(type: BronType, klant?: string): string {
  const k = (klant || "").trim().toLowerCase();
  return k ? `${k}::${type}` : type;
}
export function getSavedMapping(type: BronType, klant?: string): Record<string, string> | undefined {
  const s = readMappings();
  return s[mappingKey(type, klant)] ?? (klant ? s[type] : undefined);
}
export function saveMapping(type: BronType, mapping: Record<string, string>, klant?: string) {
  const s = readMappings();
  s[mappingKey(type, klant)] = mapping;
  localStorage.setItem(MAPPING_KEY, JSON.stringify(s));
}

// ---- CSV parser-fouten ----
export class CSVError extends Error {
  code: "leeg" | "onleesbaar" | "delimiter";
  constructor(code: "leeg" | "onleesbaar" | "delimiter", message: string) {
    super(message);
    this.code = code;
  }
}

// ---- CSV parser (eenvoudig, ondersteunt , ; en tab) ----
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const clean = text.replace(/^\uFEFF/, "").trim();
  if (clean.length === 0) {
    throw new CSVError("leeg", "Dit bestand is leeg. Upload een bestand met gegevens.");
  }
  const lines = clean.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) {
    throw new CSVError("leeg", "Dit bestand bevat geen leesbare regels.");
  }
  const semis = lines[0].match(/;/g)?.length ?? 0;
  const commas = lines[0].match(/,/g)?.length ?? 0;
  const tabs = lines[0].match(/\t/g)?.length ?? 0;
  if (semis === 0 && commas === 0 && tabs === 0 && lines.length > 1) {
    throw new CSVError(
      "delimiter",
      "We konden dit CSV-bestand niet goed lezen. Controleer het scheidingsteken (komma of puntkomma) en probeer opnieuw.",
    );
  }
  const sep = tabs > Math.max(semis, commas) ? "\t" : semis > commas ? ";" : ",";
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (c === sep && !inQ) {
        out.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = split(lines[0]).filter((h) => h.length > 0);
  if (headers.length === 0) {
    throw new CSVError("onleesbaar", "We konden geen kolomkoppen vinden. Controleer of de eerste regel kolomnamen bevat.");
  }
  if (headers.length === 1 && lines.length > 1) {
    throw new CSVError(
      "delimiter",
      "We konden dit CSV-bestand niet goed lezen. Controleer het scheidingsteken (komma of puntkomma) en probeer opnieuw.",
    );
  }
  const rows = lines.slice(1).map((l) => split(l));
  return { headers, rows };
}

/** Is dit bestand een Excel-werkmap (.xlsx / .xls)? */
export function isExcelBestand(naam: string): boolean {
  return /\.(xlsx|xls)$/i.test(naam);
}

/** Leest het eerste werkblad van een Excel-bestand naar headers + rijen (als tekst). */
export async function parseExcel(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: string[][] }> {
  const XLSX = await import("xlsx");
  let wb;
  try {
    wb = XLSX.read(buffer, { type: "array", cellDates: false });
  } catch {
    throw new CSVError("onleesbaar", "We konden dit Excel-bestand niet lezen. Controleer of het bestand niet beschadigd of beveiligd is.");
  }
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new CSVError("leeg", "Dit Excel-bestand bevat geen werkbladen.");
  const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    raw: true,
    defval: "",
    blankrows: false,
  });
  const toStr = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
  const lines = raw.map((r) => (r as unknown[]).map(toStr)).filter((r) => r.some((c) => c.length > 0));
  if (lines.length === 0) throw new CSVError("leeg", "Het eerste werkblad is leeg. Upload een bestand met gegevens.");
  const headers = lines[0].filter((h) => h.length > 0);
  if (headers.length === 0) {
    throw new CSVError("onleesbaar", "We konden geen kolomkoppen vinden. Controleer of de eerste regel kolomnamen bevat.");
  }
  const rows = lines.slice(1).map((r) => headers.map((_, i) => r[i] ?? ""));
  return { headers, rows };
}

/** Is dit bestand een PDF? */
export function isPdfBestand(naam: string): boolean {
  return /\.pdf$/i.test(naam);
}

export interface PdfTekstItem {
  str: string;
  x: number;
  y: number;
  pagina: number;
}

/**
 * Zet losse tekstfragmenten (met positie) om naar een tabel.
 * Regels = fragmenten met (ongeveer) dezelfde y; kolommen = grote horizontale tussenruimte.
 * De eerste regel met minimaal 2 kolommen wordt als kolomkop gebruikt.
 */
export function pdfItemsNaarTabel(items: PdfTekstItem[]): { headers: string[]; rows: string[][] } {
  const schoon = items.filter((i) => i.str.trim().length > 0);
  if (schoon.length === 0) {
    throw new CSVError(
      "leeg",
      "Deze PDF bevat geen leesbare tekst. Waarschijnlijk is het een scan; gebruik een digitale export of Excel/CSV.",
    );
  }
  const regels: PdfTekstItem[][] = [];
  const gesorteerd = [...schoon].sort((a, b) => a.pagina - b.pagina || b.y - a.y || a.x - b.x);
  for (const it of gesorteerd) {
    const laatste = regels[regels.length - 1];
    if (laatste && laatste[0].pagina === it.pagina && Math.abs(laatste[0].y - it.y) <= 3) laatste.push(it);
    else regels.push([it]);
  }
  const naarCellen = (regel: PdfTekstItem[]) => {
    const r = [...regel].sort((a, b) => a.x - b.x);
    const cellen: string[] = [];
    let vorigeX = -Infinity;
    let vorigeEind = -Infinity;
    for (const it of r) {
      const gat = it.x - vorigeEind;
      if (cellen.length === 0 || gat > 12) cellen.push(it.str.trim());
      else cellen[cellen.length - 1] += (gat > 1 ? " " : "") + it.str.trim();
      vorigeX = it.x;
      vorigeEind = vorigeX + it.str.length * 5;
    }
    return cellen;
  };
  const tabel = regels.map(naarCellen);
  const factuur = herkenFactuur(regels, tabel);
  if (factuur) return factuur;
  const kopIdx = tabel.findIndex((c) => c.length >= 2);
  if (kopIdx < 0) {
    throw new CSVError("onleesbaar", "We konden geen tabel met kolommen vinden in deze PDF.");
  }
  const headers = tabel[kopIdx];
  const kopTekst = headers.join("|");
  const rows = tabel
    .slice(kopIdx + 1)
    .filter((c) => c.length >= 2 && c.join("|") !== kopTekst)
    .map((c) => headers.map((_, i) => c[i] ?? ""));
  return { headers, rows };
}

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const BEDRAG_RE = /€?\s*-?\d{1,3}(?:\.\d{3})*,\d{2}|€\s*-?\d+(?:,\d{2})?/;

/** "€ 1.500,00" -> "1500.00" */
export function nlBedragNaarGetal(s: string): string | null {
  const m = s.match(BEDRAG_RE);
  if (!m) return null;
  const n = Number(m[0].replace(/[€\s.]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n.toFixed(2) : null;
}

export const FACTUUR_KOLOMMEN = ["Periode", "Factuurnummer", "Factuurdatum", "Debiteur", "Categorie", "Omschrijving", "Bedrag"];

/**
 * Herkent een losse verkoopfactuur (factuurnummer + "Totaalbedrag excl. btw")
 * en zet die om naar vaste kolommen met één rij per factuurregel.
 */
export function herkenFactuur(
  regels: PdfTekstItem[][],
  tabel: string[][],
): { headers: string[]; rows: string[][] } | null {
  const alleTekst = tabel.map((c) => c.join(" "));
  const volledig = alleTekst.join("\n");
  const nrMatch = volledig.match(/Factuur(?:nummer)?\s*:?\s*(\d{4,})/i);
  const totaalIdx = alleTekst.findIndex((t) => /totaal\w*\s*excl/i.test(t));
  if (!nrMatch || totaalIdx < 0) return null;

  // Factuurdatum: datum direct na het label "Factuurdatum", anders eerste datum.
  const datums = [...volledig.matchAll(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/g)];
  const fdIdx = volledig.search(/factuurdatum/i);
  const fd = datums.find((d) => fdIdx < 0 || (d.index ?? 0) > fdIdx) ?? datums[0];
  const factuurdatum = fd ? `${fd[3]}-${fd[2].padStart(2, "0")}-${fd[1].padStart(2, "0")}` : "";

  // Debiteur: bovenste tekst in de linkerkolom.
  const links = regels.flat().filter((i) => i.pagina === 1 && i.x < 200 && !/factuur/i.test(i.str));
  const debiteur = links.sort((a, b) => b.y - a.y)[0]?.str.trim() ?? "";

  const periodeVoor = (omschrijving: string) => {
    const jaar = fd ? Number(fd[3]) : new Date().getFullYear();
    const mi = MAANDEN.findIndex((m) => new RegExp(`\\b${m}\\b`, "i").test(omschrijving));
    if (mi >= 0) {
      const factuurMaand = fd ? Number(fd[2]) : 12;
      const j = mi + 1 > factuurMaand + 1 ? jaar - 1 : jaar;
      return `${j}-${String(mi + 1).padStart(2, "0")}`;
    }
    return factuurdatum.slice(0, 7);
  };

  // Factuurregels: begint met een aantal en bevat een bedrag, vóór de totaalregel.
  const rows: string[][] = [];
  for (const cellen of tabel.slice(0, totaalIdx)) {
    if (cellen.length < 3 || !/^\d+([.,]\d+)?$/.test(cellen[0])) continue;
    const bedragCel = cellen.slice(2).find((c) => nlBedragNaarGetal(c) !== null);
    const bedrag = bedragCel ? nlBedragNaarGetal(bedragCel) : null;
    if (!bedrag) continue;
    const omschrijving = cellen[1];
    rows.push([periodeVoor(omschrijving), nrMatch[1], factuurdatum, debiteur, "Zorgopbrengst", omschrijving, bedrag]);
  }
  if (rows.length === 0) {
    const bedrag = nlBedragNaarGetal(alleTekst[totaalIdx]);
    if (!bedrag) return null;
    rows.push([periodeVoor(""), nrMatch[1], factuurdatum, debiteur, "Zorgopbrengst", `Factuur ${nrMatch[1]}`, bedrag]);
  }
  return { headers: [...FACTUUR_KOLOMMEN], rows };
}

// ---- Originele PDF's bewaren (lokaal, voor inzien) ----
const PDF_KEY = "zcb.pdfs.v1";
function readPdfs(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(PDF_KEY) || "{}");
  } catch {
    return {};
  }
}
/** Bewaart de PDF als data-URL. Geeft false als de browseropslag vol is. */
export function bewaarPdf(id: string, dataUrl: string): boolean {
  try {
    const all = readPdfs();
    all[id] = dataUrl;
    localStorage.setItem(PDF_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}
export function getPdf(id: string): string | null {
  return readPdfs()[id] ?? null;
}
export function verwijderPdf(id: string) {
  const all = readPdfs();
  if (all[id]) {
    delete all[id];
    localStorage.setItem(PDF_KEY, JSON.stringify(all));
  }
}

/** Leest een digitale PDF volledig in de browser en zet de tekst om naar headers + rijen. */
export async function parsePdf(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: string[][] }> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  } catch {
    throw new CSVError("onleesbaar", "We konden deze PDF niet lezen. Controleer of het bestand niet beschadigd of beveiligd is.");
  }
  const items: PdfTekstItem[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    for (const it of content.items as { str?: string; transform?: number[] }[]) {
      if (typeof it.str === "string" && it.transform) {
        items.push({ str: it.str, x: it.transform[4], y: it.transform[5], pagina: p });
      }
    }
  }
  return pdfItemsNaarTabel(items);
}

// ---- Auto-detectie bestandstype op basis van bestandsnaam + headers ----
export function detectBronType(bestandsnaam: string, headers: string[]): BronType | null {
  const name = bestandsnaam.toLowerCase();
  const h = headers.map((x) => x.toLowerCase()).join(" ");
  const test = (...keys: string[]) => keys.some((k) => name.includes(k) || h.includes(k));

  if (test("niet-prod", "niet_prod", "verzuim", "verlof", "ziekte")) return "niet_productieve_uren";
  if (test("direct", "declarab", "cliëntgebonden", "clientgebonden")) return "directe_uren";
  if (test("betaalde uren", "verloond", "uren betaald", "loonuren")) return "betaalde_uren";
  if (test("inhuur", "zzp", "detacher", "uitzend")) return "inhuur";
  if (test("personeel", "loon", "salaris", "lonen")) return "personeelskosten";
  if (test("opbrengst", "omzet", "wlz", "zvw", "wmo", "pgb")) return "zorgopbrengsten";
  return null;
}

// ---- Auto-suggestie kolommapping ----
const VELD_SYNONIEMEN: Record<string, string[]> = {
  periode: ["periode", "maand", "jaar", "boekperiode", "datum"],
  bedrag: ["bedrag", "amount", "saldo", "waarde", "totaal", "eur"],
  rekening_of_categorie: ["rekening", "grootboek", "categorie", "account", "code"],
  looncomponent: ["component", "looncomponent", "loonsoort", "soort"],
  leverancier_of_omschrijving: ["leverancier", "vendor", "crediteur", "omschrijving", "naam"],
  medewerker: ["medewerker", "employee", "personeel", "naam", "id"],
  betaalde_uren: ["betaalde", "verloond", "loonuren", "uren"],
  directe_uren: ["direct", "declarab", "cliëntgebonden", "clientgebonden", "uren"],
  uren: ["uren", "hours"],
  financieringsstroom: ["financieringsstroom", "stroom", "kader", "wet", "financier", "geldstroom", "regeling"],
};

export function suggestMapping(type: Exclude<BronType, "niet_gebruiken">, headers: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const veld of [...VERPLICHTE_VELDEN[type], ...(OPTIONELE_VELDEN[type] ?? [])]) {
    const syns = VELD_SYNONIEMEN[veld] || [veld];
    const match = headers.find((h) => syns.some((s) => h.toLowerCase().includes(s)));
    if (match) result[veld] = match;
  }
  return result;
}

// ---- Validatie van een bron ----
export interface ValidatieResultaat {
  fouten: string[];
  waarschuwingen: string[];
  signalen: string[];
  status: "groen" | "oranje" | "rood";
}

export function valideerBron(b: BronBestand): ValidatieResultaat {
  const fouten: string[] = [];
  const waarschuwingen: string[] = [];
  const signalen: string[] = [];

  if (b.type === "niet_gebruiken") {
    return { fouten, waarschuwingen, signalen: ["Bestand wordt niet gebruikt."], status: "groen" };
  }

  const verplicht = VERPLICHTE_VELDEN[b.type];
  const m = b.mapping || {};
  for (const v of verplicht) {
    if (!m[v]) fouten.push(`Verplicht veld "${v}" is niet gekoppeld aan een kolom.`);
  }
  if (b.rijen.length === 0) waarschuwingen.push("Bestand bevat geen datarijen.");

  // Check numerieke velden
  const numerieke = ["bedrag", "betaalde_uren", "directe_uren", "uren"];
  for (const v of verplicht) {
    if (numerieke.includes(v) && m[v]) {
      const colIdx = b.headers.indexOf(m[v]);
      if (colIdx >= 0) {
        let bad = 0;
        for (const r of b.rijen) {
          const cel = (r[colIdx] || "").replace(/\./g, "").replace(",", ".");
          if (cel && isNaN(Number(cel))) bad++;
        }
        if (bad > 0) waarschuwingen.push(`${bad} rij(en) hebben geen geldig getal in "${m[v]}".`);
      }
    }
  }

  // Classificatie-signaal
  if (b.type === "zorgopbrengsten" || b.type === "inhuur" || b.type === "directe_uren") {
    const totaal = b.rijen.length;
    const geclassificeerd = Object.keys(b.classificaties || {}).length;
    if (totaal > 0 && geclassificeerd < totaal) {
      signalen.push(`Nog ${totaal - geclassificeerd} van ${totaal} regels te classificeren.`);
    }
  }

  const status: ValidatieResultaat["status"] = fouten.length > 0 ? "rood" : waarschuwingen.length > 0 ? "oranje" : "groen";
  return { fouten, waarschuwingen, signalen, status };
}

export const CLASSIFICEERBARE_TYPES: BronType[] = ["zorgopbrengsten", "inhuur", "directe_uren"];
