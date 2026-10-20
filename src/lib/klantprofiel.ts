// Aanleverprofiel per klant: welke systemen de klant gebruikt, hoe de gegevens meestal binnenkomen
// en hoe vaak. Opgeslagen per bedrijfsnaam (kleine letters, getrimd), net als de kolomkeuze.
// Geen persoonsgegevens: alleen systeemnamen, een manier, een frequentie en een korte notitie.
import type { Herkomst, HerkomstManier } from "./herkomst";

export const KLANTPROFIEL_KEY = "zcb.klantprofielen.v1";

export type Aanleverfrequentie = "maand" | "kwartaal" | "jaar" | "wisselend";

export const FREQUENTIE_LABEL: Record<Aanleverfrequentie, string> = {
  maand: "Per maand",
  kwartaal: "Per kwartaal",
  jaar: "Per jaar",
  wisselend: "Wisselend",
};

export interface Klantprofiel {
  systemen: string[];
  standaard_manier?: HerkomstManier;
  frequentie?: Aanleverfrequentie;
  notitie?: string;
}

export type KlantprofielStore = Record<string, Klantprofiel>;

/** Sleutel per klant: bedrijfsnaam in kleine letters en getrimd. */
export function klantSleutel(bedrijfsnaam: string): string {
  return (bedrijfsnaam || "").trim().toLowerCase();
}

export function listKlantprofielen(): KlantprofielStore {
  try {
    const raw = JSON.parse(localStorage.getItem(KLANTPROFIEL_KEY) || "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as KlantprofielStore) : {};
  } catch {
    return {};
  }
}

function schrijf(store: KlantprofielStore) {
  localStorage.setItem(KLANTPROFIEL_KEY, JSON.stringify(store));
}

export function getKlantprofiel(bedrijfsnaam: string | undefined): Klantprofiel | undefined {
  const k = klantSleutel(bedrijfsnaam ?? "");
  if (!k) return undefined;
  return listKlantprofielen()[k];
}

export function saveKlantprofiel(bedrijfsnaam: string, profiel: Klantprofiel) {
  const k = klantSleutel(bedrijfsnaam);
  if (!k) return;
  const store = listKlantprofielen();
  store[k] = profiel;
  schrijf(store);
}

export function deleteKlantprofiel(bedrijfsnaam: string) {
  const store = listKlantprofielen();
  delete store[klantSleutel(bedrijfsnaam)];
  schrijf(store);
}

/** Schrijft een volledige set profielen terug (voor het terugzetten van een back-up). */
export function schrijfKlantprofielen(store: KlantprofielStore) {
  schrijf(store);
}

/** "Nedap Ons, AFAS" -> ["Nedap Ons", "AFAS"] */
export function parseSystemen(tekst: string): string[] {
  return tekst
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Herkomst om voor te vullen bij een nieuwe upload: standaard manier en eerste systeem uit het profiel. */
export function herkomstVoorUpload(profiel: Klantprofiel | undefined, exportDatum: string | undefined): Herkomst | undefined {
  const h: Herkomst = {};
  if (profiel?.standaard_manier) h.manier = profiel.standaard_manier;
  if (profiel?.systemen?.[0]) h.systeem = profiel.systemen[0];
  if (exportDatum) h.export_datum = exportDatum;
  return Object.keys(h).length > 0 ? h : undefined;
}
