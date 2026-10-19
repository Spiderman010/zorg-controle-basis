// Weergave van de herkomst in het rapport en onder de Uren-controle. Puur; verandert geen berekening.
import { BRON_LABELS, type BronBestand, type BronType } from "./bronnen";
import {
  BEWIJSNIVEAU_LABEL,
  BEWIJSNIVEAUS,
  HERKOMST_MANIER_LABEL,
  bewijsniveau,
  datumNL,
  telPerNiveau,
  type BewijsNiveau,
  type HerkomstManier,
} from "./herkomst";

const bruikbaar = (bronnen: BronBestand[]) => bronnen.filter((b) => !b.fout && b.type !== "niet_gebruiken");

const meervoud = (n: number, een: string, meer: string) => `${n} ${n === 1 ? een : meer}`;

const ZIN_PER_NIVEAU: Record<BewijsNiveau, (n: number) => string> = {
  hoog: (n) => `${meervoud(n, "bron", "bronnen")} zelf opgehaald`,
  midden: (n) => meervoud(n, "export van de klant", "exports van de klant"),
  laag: (n) => `${meervoud(n, "bron", "bronnen")} via sjabloon of handmatig`,
  onbekend: (n) => `${n} zonder vastgelegde herkomst`,
};

/** Bijvoorbeeld "3 bronnen zelf opgehaald, 1 export van de klant, 1 zonder vastgelegde herkomst". */
export function herkomstSamenvatting(bronnen: BronBestand[]): string {
  const telling = telPerNiveau(bronnen);
  const delen = BEWIJSNIVEAUS.filter((n) => telling[n] > 0).map((n) => ZIN_PER_NIVEAU[n](telling[n]));
  return delen.length > 0 ? delen.join(", ") : "Geen bronnen ingelezen";
}

export interface HerkomstRij {
  id: string;
  bestand: string;
  type: string;
  manier: string;
  systeem: string;
  exportdatum: string;
  niveau: string;
}

/** Eén regel per bruikbare bron voor de tabel "Herkomst van de gegevens". */
export function herkomstRijen(bronnen: BronBestand[]): HerkomstRij[] {
  return bruikbaar(bronnen).map((b) => ({
    id: b.id,
    bestand: b.bestandsnaam,
    type: BRON_LABELS[b.type],
    manier: b.herkomst?.manier ? HERKOMST_MANIER_LABEL[b.herkomst.manier] : "Niet vastgelegd",
    systeem: b.herkomst?.systeem || "-",
    exportdatum: datumNL(b.herkomst?.export_datum) ?? "-",
    niveau: BEWIJSNIVEAU_LABEL[bewijsniveau(b.herkomst)],
  }));
}

const NIVEAU_KORT: Record<Exclude<BewijsNiveau, "onbekend">, string> = { hoog: "Hoog", midden: "Midden", laag: "Laag" };

const MANIER_KORT: Record<HerkomstManier, string> = {
  zelf_opgehaald: "zelf opgehaald",
  klant_export: "van de klant ontvangen",
  sjabloon: "ingevuld sjabloon",
  handmatig: "handmatig overgenomen",
};

/** Herkomst van één brontype; bij meerdere bronnen telt de zwakste (laagste niveau). */
function herkomstVanType(bronnen: BronBestand[], type: BronType): string {
  const van = bruikbaar(bronnen).filter((b) => b.type === type);
  if (van.length === 0) return "geen bron";
  const rang = (b: BronBestand) => BEWIJSNIVEAUS.indexOf(bewijsniveau(b.herkomst));
  const zwakst = van.reduce((z, b) => (rang(b) > rang(z) ? b : z));
  const niveau = bewijsniveau(zwakst.herkomst);
  const h = zwakst.herkomst;
  if (niveau === "onbekend" || !h?.manier) return "Herkomst niet vastgelegd";
  const systeem = h.systeem ? ` uit ${h.systeem}` : "";
  const datum = datumNL(h.export_datum);
  return `${NIVEAU_KORT[niveau]}, ${MANIER_KORT[h.manier]}${systeem}${datum ? `, ${datum}` : ""}`;
}

/** Regel onder de kaart Uren-controle met het bewijsniveau van de gedeclareerde en de directe uren. */
export function urenHerkomstRegel(bronnen: BronBestand[]): string {
  return `Gedeclareerde uren: ${herkomstVanType(bronnen, "gedeclareerde_uren")}. Directe uren: ${herkomstVanType(bronnen, "directe_uren")}.`;
}
