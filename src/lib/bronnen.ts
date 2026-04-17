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
  fout?: string;
}

const KEY = "zcb.bronnen.v1";
const MAPPING_KEY = "zcb.mappings.v1"; // opgeslagen mappings per importtype (klantprofiel)

function read(): BronBestand[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as BronBestand[];
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
}

// ---- Opgeslagen mappings (klantprofiel) ----
type MappingStore = Record<string, Record<string, string>>; // type -> mapping
function readMappings(): MappingStore {
  try {
    return JSON.parse(localStorage.getItem(MAPPING_KEY) || "{}");
  } catch {
    return {};
  }
}
export function getSavedMapping(type: BronType): Record<string, string> | undefined {
  return readMappings()[type];
}
export function saveMapping(type: BronType, mapping: Record<string, string>) {
  const s = readMappings();
  s[type] = mapping;
  localStorage.setItem(MAPPING_KEY, JSON.stringify(s));
}

// ---- CSV parser (eenvoudig, ondersteunt , en ;) ----
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  // strip BOM
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
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
  const headers = split(lines[0]);
  const rows = lines.slice(1).map(split);
  return { headers, rows };
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
};

export function suggestMapping(type: Exclude<BronType, "niet_gebruiken">, headers: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const veld of VERPLICHTE_VELDEN[type]) {
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
