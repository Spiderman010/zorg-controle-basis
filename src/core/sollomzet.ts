// Soll-omzetcontrole: verwachte omzet (directe uren × uurtarief) vergeleken
// met de verantwoorde zorgopbrengsten. Dit is de klassieke verbandscontrole
// met een vast verband als uitgangspunt.
//
// Tarieven komen per project (financieringsstroom of contract); het
// standaardtarief geldt als terugval voor projecten zonder eigen tarief en
// voor niet-toegewezen uren (pseudo-project "Algemeen"). Zonder dekkend
// tarief is de controle niet uitvoerbaar (grijs) — het bestaande patroon.
import type { CheckResult, CheckStatus, Dataset } from "./types";
import { safeDiv } from "./calculations";
import {
  ALGEMEEN_PROJECT_ID,
  computeProjectAnalyse,
  type ProjectDef,
} from "./projecten";

/** Tolerantieband op de relatieve afwijking |ist − soll| / soll. */
export const SOLL_TOLERANTIE_ORANJE = 0.05; // tot 5% groen
export const SOLL_TOLERANTIE_ROOD = 0.10; // tot 10% oranje, daarboven rood

export interface ProjectDefMetTarief extends ProjectDef {
  /** Uurtarief in euro's voor dit project. */
  tarief?: number;
}

export interface SollOmzetConfig {
  projecten?: ProjectDefMetTarief[];
  /** Terugvaltarief voor projecten zonder eigen tarief en voor "Algemeen". */
  standaard_tarief?: number;
}

export interface SollOmzetProjectRegel {
  project_id: string;
  naam: string;
  direct_hours: number;
  revenue: number;
  /** Toegepast uurtarief; undefined als er geen tarief beschikbaar is. */
  tarief?: number;
  /** direct_hours × tarief; undefined zonder tarief. */
  soll?: number;
  /** (revenue − soll) / soll; undefined zonder tarief of bij soll 0. */
  afwijking?: number;
}

export interface SollOmzetResultaat {
  regels: SollOmzetProjectRegel[];
  totaal_soll?: number;
  totaal_ist: number;
  /** (ist − soll) / soll over het totaal; undefined als niet uitvoerbaar. */
  afwijking?: number;
  /** Directe uren waarvoor geen tarief beschikbaar is. */
  uren_zonder_tarief: number;
  uitvoerbaar: boolean;
  /** Reden waarom de controle niet uitvoerbaar is (grijs). */
  reden_niet_uitvoerbaar?: string;
}

function geldigTarief(t: number | undefined): t is number {
  return t !== undefined && Number.isFinite(t) && t > 0;
}

export function computeSollOmzet(ds: Dataset, config: SollOmzetConfig = {}): SollOmzetResultaat {
  const projecten = config.projecten ?? [];
  const analyse = computeProjectAnalyse(ds, projecten);
  const tariefPerProject = new Map<string, number | undefined>(
    projecten.map((p) => [p.id, geldigTarief(p.tarief) ? p.tarief : undefined]),
  );
  const standaard = geldigTarief(config.standaard_tarief) ? config.standaard_tarief : undefined;

  const totaalIst = analyse.reduce((s, a) => s + a.revenue, 0);
  const regels: SollOmzetProjectRegel[] = analyse.map((a) => {
    const eigen = a.project_id === ALGEMEEN_PROJECT_ID ? undefined : tariefPerProject.get(a.project_id);
    const tarief = eigen ?? standaard;
    const soll = tarief !== undefined ? a.direct_hours * tarief : undefined;
    const afw = soll !== undefined ? safeDiv(a.revenue - soll, soll) : undefined;
    return {
      project_id: a.project_id,
      naam: a.naam,
      direct_hours: a.direct_hours,
      revenue: a.revenue,
      tarief,
      soll,
      afwijking: afw,
    };
  });

  // Absolute som: ook negatieve correctie-uren zonder tarief maken de
  // controle niet-uitvoerbaar (een getekende som zou kunnen wegvallen).
  const urenZonderTarief = regels
    .filter((r) => r.tarief === undefined)
    .reduce((s, r) => s + Math.abs(r.direct_hours), 0);
  const totaleUren = regels.reduce((s, r) => s + r.direct_hours, 0);

  if (!ds.direct_hours || ds.direct_hours.length === 0) {
    return {
      regels,
      totaal_ist: totaalIst,
      uren_zonder_tarief: urenZonderTarief,
      uitvoerbaar: false,
      reden_niet_uitvoerbaar: "directe uren ontbreekt",
    };
  }
  if (!ds.revenue || ds.revenue.length === 0) {
    return {
      regels,
      totaal_ist: totaalIst,
      uren_zonder_tarief: urenZonderTarief,
      uitvoerbaar: false,
      reden_niet_uitvoerbaar: "zorgopbrengsten ontbreekt",
    };
  }
  if (urenZonderTarief > 0 || totaleUren === 0) {
    return {
      regels,
      totaal_ist: totaalIst,
      uren_zonder_tarief: urenZonderTarief,
      uitvoerbaar: false,
      reden_niet_uitvoerbaar:
        totaleUren === 0
          ? "geen geldige directe uren"
          : `uurtarief ontbreekt voor ${urenZonderTarief.toLocaleString("nl-NL")} directe uren`,
    };
  }

  const totaalSoll = regels.reduce((s, r) => s + (r.soll ?? 0), 0);
  const afwijking = safeDiv(totaalIst - totaalSoll, totaalSoll);
  if (afwijking === undefined) {
    return {
      regels,
      totaal_soll: totaalSoll,
      totaal_ist: totaalIst,
      uren_zonder_tarief: 0,
      uitvoerbaar: false,
      reden_niet_uitvoerbaar: "soll-omzet is nul",
    };
  }

  return {
    regels,
    totaal_soll: totaalSoll,
    totaal_ist: totaalIst,
    afwijking,
    uren_zonder_tarief: 0,
    uitvoerbaar: true,
  };
}

/** Bouw het kerncontrole-resultaat (V1-C09) uit het soll-omzetresultaat. */
export function sollOmzetCheck(ds: Dataset, config: SollOmzetConfig = {}): CheckResult {
  const r = computeSollOmzet(ds, config);
  if (!r.uitvoerbaar) {
    return {
      id: "soll_omzet_check",
      label: "Soll-omzet (uren × tarief)",
      status: "grijs",
      message: `Niet uitvoerbaar – ${r.reden_niet_uitvoerbaar}`,
    };
  }
  const afw = r.afwijking!;
  const abs = Math.abs(afw);
  const status: CheckStatus =
    abs <= SOLL_TOLERANTIE_ORANJE ? "groen" : abs <= SOLL_TOLERANTIE_ROOD ? "oranje" : "rood";
  return {
    id: "soll_omzet_check",
    label: "Soll-omzet (uren × tarief)",
    status,
    value: afw,
    message: `Afwijking ${(afw * 100).toFixed(1)}% (soll € ${r.totaal_soll!.toFixed(0)}, verantwoord € ${r.totaal_ist.toFixed(0)})`,
    details: {
      soll: r.totaal_soll,
      ist: r.totaal_ist,
      afwijking: afw,
    },
  };
}
