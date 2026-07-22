// Financieringsstromen (wettelijke kaders) voor zorgopbrengsten.
// Aparte module naast de bestaande kerncontroles: de financieringsmix en het
// bijbehorende signaal tellen NIET mee in de hoofdscore.
import type { CheckStatus, Dataset } from "./types";

export type Financieringsstroom =
  | "wlz"
  | "zvw"
  | "wmo"
  | "jeugdwet"
  | "pgb"
  | "onderaanneming"
  | "overig"
  | "onbekend";

export const STROOM_LABELS: Record<Financieringsstroom, string> = {
  wlz: "WLZ",
  zvw: "ZVW",
  wmo: "WMO",
  jeugdwet: "Jeugdwet",
  pgb: "PGB",
  onderaanneming: "Onderaanneming",
  overig: "Overig",
  onbekend: "Onbekend",
};

/** Volgorde voor weergave in de mix. */
export const STROOM_VOLGORDE: Financieringsstroom[] = [
  "wlz",
  "zvw",
  "wmo",
  "jeugdwet",
  "pgb",
  "onderaanneming",
  "overig",
  "onbekend",
];

/**
 * Normaliseer een expliciet gemapte kolomwaarde naar een financieringsstroom.
 * Retourneert null als de waarde leeg of niet herkenbaar is.
 */
export function normalizeStroom(raw: string | undefined): Financieringsstroom | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s.length === 0) return null;
  if (/pgb|persoonsgebonden/.test(s)) return "pgb";
  if (/wlz|langdurige zorg/.test(s)) return "wlz";
  if (/zvw|zorgverzekeringswet|wijkverpleging|verzekeraar/.test(s)) return "zvw";
  if (/jeugd/.test(s)) return "jeugdwet";
  if (/wmo|maatschappelijke ondersteuning|gemeente/.test(s)) return "wmo";
  if (/onderaannem|hoofdaannem/.test(s)) return "onderaanneming";
  if (/overig|particulier|priv|anders/.test(s)) return "overig";
  return null;
}

/**
 * Herken de financieringsstroom uit vrije tekst (bv. grootboekrekening-naam)
 * als er geen expliciete kolom is gemapt. PGB vóór WLZ zodat "WLZ PGB" als
 * PGB telt (het risicoprofiel van PGB is leidend).
 */
export function detectStroom(text: string | undefined): Financieringsstroom | null {
  return normalizeStroom(text);
}

export interface StroomBedrag {
  stroom: Financieringsstroom;
  label: string;
  amount: number;
  /** Aandeel in totaal (0-1); undefined als totaal 0 is. */
  share?: number;
}

export interface FinancieringsMix {
  entries: StroomBedrag[];
  totaal: number;
  /** Aantal onderscheiden wettelijke kaders, exclusief "overig" en "onbekend". */
  aantalKaders: number;
  /** Bedrag dat niet aan een stroom toegewezen kon worden. */
  onbekendBedrag: number;
}

/** Bereken de opbrengstverdeling per financieringsstroom uit de dataset. */
export function computeFinancieringsMix(ds: Dataset): FinancieringsMix {
  const perStroom = new Map<Financieringsstroom, number>();
  for (const r of ds.revenue ?? []) {
    if (r.import_status === "invalid" || !Number.isFinite(r.amount)) continue;
    const stroom = normalizeStroom(r.revenue_type) ?? "onbekend";
    perStroom.set(stroom, (perStroom.get(stroom) ?? 0) + r.amount);
  }
  const totaal = [...perStroom.values()].reduce((a, b) => a + b, 0);
  const entries: StroomBedrag[] = STROOM_VOLGORDE.filter((s) => perStroom.has(s)).map((s) => {
    const amount = perStroom.get(s)!;
    return {
      stroom: s,
      label: STROOM_LABELS[s],
      amount,
      share: totaal !== 0 ? amount / totaal : undefined,
    };
  });
  const kaders: Financieringsstroom[] = ["wlz", "zvw", "wmo", "jeugdwet", "pgb", "onderaanneming"];
  return {
    entries,
    totaal,
    aantalKaders: kaders.filter((s) => (perStroom.get(s) ?? 0) !== 0).length,
    onbekendBedrag: perStroom.get("onbekend") ?? 0,
  };
}

export interface FinancieringsSignaal {
  /** Informatief signaal: telt niet mee in de hoofdscore, wordt nooit rood. */
  status: CheckStatus;
  message: string;
}

/**
 * Signaal "meerdere wettelijke kaders actief".
 * Zorg leveren vanuit meerdere wetten (Wlz, Zvw, Wmo, Jeugdwet, PGB) is een
 * erkende risico-indicator (IKZ): per kader gelden andere controleregimes.
 * - geen opbrengsten of alles onbekend -> grijs
 * - 0 of 1 kader -> groen
 * - 2 of meer kaders -> oranje (informatief, nooit rood)
 */
export function financieringsSignaal(mix: FinancieringsMix): FinancieringsSignaal {
  if (mix.entries.length === 0) {
    return { status: "grijs", message: "Niet uitvoerbaar – zorgopbrengsten ontbreekt" };
  }
  if (mix.aantalKaders === 0) {
    return {
      status: "grijs",
      message: "Financieringsstroom niet herkend; koppel een kolom of gebruik herkenbare categorieën (WLZ, ZVW, WMO, Jeugdwet, PGB).",
    };
  }
  const actief = mix.entries
    .filter((e) => e.stroom !== "onbekend" && e.stroom !== "overig" && e.amount !== 0)
    .map((e) => e.label)
    .join(", ");
  if (mix.aantalKaders === 1) {
    return { status: "groen", message: `Eén wettelijk kader actief (${actief}).` };
  }
  return {
    status: "oranje",
    message: `${mix.aantalKaders} wettelijke kaders actief (${actief}). Meerdere kaders is een erkende risico-indicator: per kader geldt een ander controleregime.`,
  };
}
