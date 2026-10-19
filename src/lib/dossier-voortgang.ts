// Wat ontbreekt nog per dossier, en wat is de volgende stap. Puur: krijgt de bronnen binnen,
// leest zelf niets uit de opslag. Gebruikt de bestaande validatie (valideerBron).
import { ALLE_BRONTYPEN, BRON_LABELS, valideerBron, type BronBestand, type BronType } from "./bronnen";

export type BronTypeZonderNiet = Exclude<BronType, "niet_gebruiken">;

export type BronVoortgangStatus = "ontbreekt" | "niet_bevestigd" | "koppeling_onvolledig" | "compleet";

/** Wat een brontype oplevert: dezelfde controles als in het scherm Controle. */
export const BRON_LEVERT: Record<BronTypeZonderNiet, string> = {
  zorgopbrengsten: "Omzet-aansluiting, soll-omzet en verhoudingen",
  personeelskosten: "Personeelslasten en aansluiting",
  inhuur: "Inhuur-aansluiting en verhoudingen",
  betaalde_uren: "Betaalde-uren-controles en aansluiting",
  directe_uren: "Directe-uren-verhouding en uren-verband",
  gedeclareerde_uren: "Uren-controle (met directe uren en kostenplaatsen)",
  niet_productieve_uren: "Niet-productieve-uren-verhouding",
};

/** Brontypen die uren bevatten en per regel aan een kostenplaats gekoppeld moeten zijn. */
const UREN_MET_KOSTENPLAATS: BronTypeZonderNiet[] = ["directe_uren", "gedeclareerde_uren"];

/** Basisbronnen: zonder deze twee is er nog geen zinvolle controle. */
const BASIS: BronTypeZonderNiet[] = ["zorgopbrengsten", "personeelskosten"];

export interface BronVoortgang {
  type: BronTypeZonderNiet;
  label: string;
  status: BronVoortgangStatus;
  levert: string;
  toelichting: string;
  bestandsnamen: string[];
}

export interface VolgendeStap {
  tekst: string;
  route: string;
}

export interface DossierVoortgang {
  bronnen: BronVoortgang[];
  volgendeStap: VolgendeStap;
  /** True als de volgende stap "bekijk de controle" is. */
  klaar: boolean;
}

const TOELICHTING: Record<BronVoortgangStatus, string> = {
  ontbreekt: "Nog niet geüpload.",
  niet_bevestigd: "Geüpload, maar het type is nog niet bevestigd.",
  koppeling_onvolledig: "Bevestigd, maar de kolommen of de kostenplaatsen zijn nog niet compleet.",
  compleet: "Gekoppeld en klaar voor de controle.",
};

const route = (dossierId: string, tab?: string, deel = "bronnen") =>
  tab ? `/dossiers/${dossierId}/${deel}?tab=${tab}` : `/dossiers/${dossierId}/${deel}`;

export function voortgangDossier(bronnen: BronBestand[], dossierId: string): DossierVoortgang {
  const bruikbaar = bronnen.filter((b) => b.type !== "niet_gebruiken" && !b.fout);

  const regels = ALLE_BRONTYPEN.map((type) => {
    const van = bruikbaar.filter((b) => b.type === type);
    const bestandsnamen = van.map((b) => b.bestandsnaam);
    let status: BronVoortgangStatus = "compleet";
    let kolommen = false;
    let uren = false;
    if (van.length === 0) {
      status = "ontbreekt";
    } else if (van.some((b) => !b.type_bevestigd)) {
      status = "niet_bevestigd";
    } else {
      kolommen = van.some((b) => valideerBron(b).fouten.length > 0);
      uren = UREN_MET_KOSTENPLAATS.includes(type) && van.some((b) => b.rijen.some((_, i) => !b.projecttoewijzingen?.[i]));
      if (kolommen || uren) status = "koppeling_onvolledig";
    }
    return {
      rij: { type, label: BRON_LABELS[type], status, levert: BRON_LEVERT[type], toelichting: TOELICHTING[status], bestandsnamen },
      eerste: van.find((b) => !b.type_bevestigd) ?? van.find((b) => kolommen && valideerBron(b).fouten.length > 0),
      kolommen,
      uren,
    };
  });

  const volgendeStap = bepaalVolgendeStap(regels, dossierId);
  return { bronnen: regels.map((r) => r.rij), volgendeStap, klaar: volgendeStap.route.endsWith("/controle") };
}

function bepaalVolgendeStap(
  regels: { rij: BronVoortgang; eerste?: BronBestand; kolommen: boolean; uren: boolean }[],
  dossierId: string,
): VolgendeStap {
  // 1. Ontbrekende basisbronnen
  const ontbrekendeBasis = BASIS.find((t) => regels.find((r) => r.rij.type === t)?.rij.status === "ontbreekt");
  if (ontbrekendeBasis) {
    return { tekst: `Upload de ${BRON_LABELS[ontbrekendeBasis].toLowerCase()}.`, route: route(dossierId, "upload") };
  }
  // 2. Type bevestigen
  const nietBevestigd = regels.find((r) => r.rij.status === "niet_bevestigd");
  if (nietBevestigd) {
    const naam = nietBevestigd.rij.bestandsnamen[0];
    return { tekst: `Bevestig het type van ${naam}.`, route: route(dossierId, "upload") };
  }
  // 3. Kolommen koppelen
  const kolommen = regels.find((r) => r.kolommen && r.eerste);
  if (kolommen) {
    return { tekst: `Koppel de kolommen van ${kolommen.eerste!.bestandsnaam}.`, route: route(dossierId, "mapping") };
  }
  // 4. Uren aan kostenplaatsen koppelen
  if (regels.some((r) => r.uren)) {
    return { tekst: "Koppel de uren aan kostenplaatsen.", route: route(dossierId, "classificatie") };
  }
  // 5. Controle bekijken
  return { tekst: "Bekijk de controle.", route: route(dossierId, undefined, "controle") };
}
