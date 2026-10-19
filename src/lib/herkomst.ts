// Herkomst per bron: hoe de gegevens binnenkwamen en hoe sterk dat bewijs is.
// Alleen vastlegging en weergave; de berekeningen in src/core gebruiken dit niet.
// Geen persoonsgegevens: alleen manier, systeemnaam, exportdatum en een korte toelichting.

export type HerkomstManier = "zelf_opgehaald" | "klant_export" | "sjabloon" | "handmatig";

/**
 * Herkomst van een bronbestand. `manier` is optioneel in de opslag: bij een upload kan de
 * exportdatum al bekend zijn voordat de manier is gekozen. Zonder manier telt de herkomst als onbekend.
 */
export interface Herkomst {
  manier?: HerkomstManier;
  systeem?: string;
  /** JJJJ-MM-DD */
  export_datum?: string;
  toelichting?: string;
}

export type BewijsNiveau = "hoog" | "midden" | "laag" | "onbekend";

export const HERKOMST_MANIEREN: HerkomstManier[] = ["zelf_opgehaald", "klant_export", "sjabloon", "handmatig"];

export const HERKOMST_MANIER_LABEL: Record<HerkomstManier, string> = {
  zelf_opgehaald: "Zelf opgehaald uit het systeem",
  klant_export: "Export van de klant ontvangen",
  sjabloon: "Ingevuld sjabloon",
  handmatig: "Handmatig overgenomen",
};

export const BEWIJSNIVEAU_LABEL: Record<BewijsNiveau, string> = {
  hoog: "Hoog: zelf opgehaald",
  midden: "Midden: van de klant ontvangen",
  laag: "Laag: sjabloon of handmatig",
  onbekend: "Onbekend: herkomst niet vastgelegd",
};

/** Volgorde van sterk naar zwak; onbekend telt als zwakst. */
export const BEWIJSNIVEAUS: BewijsNiveau[] = ["hoog", "midden", "laag", "onbekend"];

export function bewijsniveau(h: Herkomst | undefined): BewijsNiveau {
  switch (h?.manier) {
    case "zelf_opgehaald":
      return "hoog";
    case "klant_export":
      return "midden";
    case "sjabloon":
    case "handmatig":
      return "laag";
    default:
      return "onbekend";
  }
}

/** Wijzigingsdatum van een bestand (File.lastModified, in ms) als JJJJ-MM-DD in lokale tijd. */
export function datumUitLastModified(ms: number | undefined): string | undefined {
  if (!ms || !Number.isFinite(ms)) return undefined;
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
