// Verbandcontrole gedeclareerde uren tegen gewerkte directe uren, per project (kostenplaats).
// Kerncontrole V1-C10: telt mee in de hoofdscore via `urenVerbandCheck`. De eindstatus is de slechtste
// status over de vergelijkbare kostenplaatsen (conservatief). Zonder gedeclareerde of directe uren is de
// controle grijs en telt dan niet mee. Statussen: groen, oranje, rood of grijs (niet vergelijkbaar).
//
// De richting is niet symmetrisch. Meer gedeclareerd dan gewerkt is het grootste risico
// (terugvordering) en wordt strenger beoordeeld dan minder gedeclareerd (gemiste omzet).
// De drempels zijn een voorstel en per financieringsstroom in te stellen.
import type { CheckResult, CheckStatus, Dataset } from "./types";
import { ALGEMEEN_PROJECT_ID, ALGEMEEN_PROJECT_NAAM, type ProjectDef } from "./projecten";
import type { Financieringsstroom } from "./financiering";

/** Relatieve afwijking (gedeclareerd - gewerkt) / gewerkt. */
export interface UrenVerbandDrempels {
  /** Meer gedeclareerd dan gewerkt: oranje boven `oranje`, rood boven `rood`. */
  teVeel: { oranje: number; rood: number };
  /** Minder gedeclareerd dan gewerkt: oranje boven `oranje`, rood boven `rood` (absolute waarde). */
  teWeinig: { oranje: number; rood: number };
}

export const URENVERBAND_DREMPELS: UrenVerbandDrempels = {
  teVeel: { oranje: 0.01, rood: 0.03 },
  teWeinig: { oranje: 0.05, rood: 0.15 },
};

export interface UrenVerbandConfig {
  projecten?: ProjectDef[];
  drempels?: UrenVerbandDrempels;
  /** Afwijkende drempels per financieringsstroom van het project. */
  drempels_per_stroom?: Partial<Record<Financieringsstroom, UrenVerbandDrempels>>;
}

export interface UrenVerbandRegel {
  project_id: string;
  naam: string;
  stroom?: Financieringsstroom;
  declared_hours: number;
  worked_hours: number;
  /** (gedeclareerd - gewerkt) / gewerkt; leeg als niet te berekenen. */
  afwijking?: number;
  status: CheckStatus;
  reden: string;
  /** Wlz zonder verblijf: nog niet vastgesteld of dit in uren wordt gedeclareerd. */
  onzeker: boolean;
}

export interface UrenVerbandResultaat {
  /** "project" = per kostenplaats vergeleken; "totaal" = alleen het totaal, want de uren zijn niet (aan beide kanten) gekoppeld. */
  niveau: "project" | "totaal";
  regels: UrenVerbandRegel[];
  /** Som over de vergelijkbare regels (grijs telt niet mee). */
  totaal_declared: number;
  totaal_worked: number;
  /** Slechtste status over de vergelijkbare regels; grijs als er niets te vergelijken is. */
  status: CheckStatus;
  uitvoerbaar: boolean;
  reden_niet_uitvoerbaar?: string;
  aantal: Record<CheckStatus, number>;
}

const EPS = 1e-9;
const RANG: Record<CheckStatus, number> = { grijs: 0, groen: 1, oranje: 2, rood: 3 };

function beoordeel(declared: number, worked: number, d: UrenVerbandDrempels): { afwijking?: number; status: CheckStatus; reden: string } {
  if (worked === 0 && declared === 0) return { status: "groen", reden: "geen uren aan beide kanten" };
  if (worked <= 0 && declared > 0) return { status: "rood", reden: "gedeclareerd zonder gewerkte directe uren" };
  if (declared <= 0 && worked > 0) return { status: "oranje", reden: "gewerkt zonder declaratie" };
  const afw = (declared - worked) / worked;
  if (afw > 0) {
    if (afw > d.teVeel.rood + EPS) return { afwijking: afw, status: "rood", reden: "te veel gedeclareerd" };
    if (afw > d.teVeel.oranje + EPS) return { afwijking: afw, status: "oranje", reden: "iets te veel gedeclareerd" };
    return { afwijking: afw, status: "groen", reden: "binnen marge" };
  }
  const a = -afw;
  if (a > d.teWeinig.rood + EPS) return { afwijking: afw, status: "rood", reden: "veel te weinig gedeclareerd" };
  if (a > d.teWeinig.oranje + EPS) return { afwijking: afw, status: "oranje", reden: "te weinig gedeclareerd" };
  return { afwijking: afw, status: "groen", reden: "binnen marge" };
}

interface Bucket {
  declared: number;
  worked: number;
  nee: number; // aantal regels van een stroom die niet in uren declareert
  zonderNee: number; // aantal regels die wel in uren declareren
  onzeker: boolean;
}

export function computeUrenVerband(ds: Dataset, config: UrenVerbandConfig = {}): UrenVerbandResultaat {
  const projecten = config.projecten ?? [];
  const bekend = new Map(projecten.map((p) => [p.id, p]));
  const standaard = config.drempels ?? URENVERBAND_DREMPELS;

  const leeg = (reden: string): UrenVerbandResultaat => ({
    niveau: "project",
    regels: [],
    totaal_declared: 0,
    totaal_worked: 0,
    status: "grijs",
    uitvoerbaar: false,
    reden_niet_uitvoerbaar: reden,
    aantal: { groen: 0, oranje: 0, rood: 0, grijs: 0 },
  });
  if (!ds.declared_hours || ds.declared_hours.length === 0) return leeg("gedeclareerde uren ontbreekt");
  if (!ds.direct_hours || ds.direct_hours.length === 0) return leeg("directe uren ontbreekt");

  const buckets = new Map<string, Bucket>();
  const bucket = (project_id: string | undefined): [string, Bucket] => {
    const key = project_id && bekend.has(project_id) ? project_id : ALGEMEEN_PROJECT_ID;
    let b = buckets.get(key);
    if (!b) {
      b = { declared: 0, worked: 0, nee: 0, zonderNee: 0, onzeker: false };
      buckets.set(key, b);
    }
    return [key, b];
  };

  for (const r of ds.direct_hours) {
    if (r.import_status === "invalid" || !Number.isFinite(r.direct_hours)) continue;
    bucket(r.project_id)[1].worked += r.direct_hours;
  }
  for (const r of ds.declared_hours) {
    if (r.import_status === "invalid" || !Number.isFinite(r.declared_hours)) continue;
    const b = bucket(r.project_id)[1];
    if (r.in_hours === "nee") {
      b.nee += 1;
      continue;
    }
    b.zonderNee += 1;
    b.declared += r.declared_hours;
    if (r.in_hours === "onzeker") b.onzeker = true;
  }

  const metProject = (k: string) => k !== ALGEMEEN_PROJECT_ID;
  const geenWerk = [...buckets].every(([k, b]) => !metProject(k) || b.worked === 0);
  const geenDecl = [...buckets].every(([k, b]) => !metProject(k) || (b.declared === 0 && b.zonderNee === 0));
  const niveau: "project" | "totaal" = geenWerk || geenDecl ? "totaal" : "project";

  const drempelsVoor = (stroom?: Financieringsstroom) => (stroom && config.drempels_per_stroom?.[stroom]) || standaard;
  const regels: UrenVerbandRegel[] = [];

  if (niveau === "totaal") {
    const sum = [...buckets.values()].reduce(
      (a, b) => ({ declared: a.declared + b.declared, worked: a.worked + b.worked, nee: a.nee + b.nee, onzeker: a.onzeker || b.onzeker }),
      { declared: 0, worked: 0, nee: 0, onzeker: false },
    );
    const bo = beoordeel(sum.declared, sum.worked, standaard);
    const extra = sum.nee > 0 ? " Let op: bevat uren van een stroom die niet in uren declareert; het totaal is daardoor onzeker." : "";
    regels.push({
      project_id: "totaal",
      naam: "Totaal",
      declared_hours: sum.declared,
      worked_hours: sum.worked,
      afwijking: bo.afwijking,
      status: bo.status,
      reden: `${bo.reden}. Niet per kostenplaats vergeleken: koppel de uren aan kostenplaatsen.${extra}`,
      onzeker: sum.onzeker || sum.nee > 0,
    });
  } else {
    const volgorde = [...projecten.map((p) => p.id), ALGEMEEN_PROJECT_ID].filter((id) => buckets.has(id));
    for (const id of volgorde) {
      const b = buckets.get(id)!;
      const p = bekend.get(id);
      const naam = p?.naam ?? ALGEMEEN_PROJECT_NAAM;
      if (b.nee > 0 && b.zonderNee === 0) {
        regels.push({ project_id: id, naam, stroom: p?.stroom, declared_hours: 0, worked_hours: b.worked, status: "grijs", reden: "stroom declareert niet in uren (bijvoorbeeld Wlz-verblijf)", onzeker: false });
        continue;
      }
      const bo = beoordeel(b.declared, b.worked, drempelsVoor(p?.stroom));
      regels.push({
        project_id: id,
        naam,
        stroom: p?.stroom,
        declared_hours: b.declared,
        worked_hours: b.worked,
        afwijking: bo.afwijking,
        status: bo.status,
        reden: b.onzeker ? `${bo.reden} (Wlz: onzeker of dit in uren wordt gedeclareerd)` : bo.reden,
        onzeker: b.onzeker,
      });
    }
  }

  const vergelijkbaar = regels.filter((r) => r.status !== "grijs");
  const aantal: Record<CheckStatus, number> = { groen: 0, oranje: 0, rood: 0, grijs: 0 };
  for (const r of regels) aantal[r.status] += 1;
  const status = vergelijkbaar.reduce<CheckStatus>((w, r) => (RANG[r.status] > RANG[w] ? r.status : w), "grijs");
  return {
    niveau,
    regels,
    totaal_declared: vergelijkbaar.reduce((s, r) => s + r.declared_hours, 0),
    totaal_worked: vergelijkbaar.reduce((s, r) => s + r.worked_hours, 0),
    status,
    uitvoerbaar: vergelijkbaar.length > 0,
    reden_niet_uitvoerbaar: vergelijkbaar.length > 0 ? undefined : "geen vergelijkbare regels",
    aantal,
  };
}

/** Kerncontrole V1-C10 voor de hoofdscore. Grijs als er niets te vergelijken valt. */
export function urenVerbandCheck(ds: Dataset, config: UrenVerbandConfig = {}): CheckResult {
  const r = computeUrenVerband(ds, config);
  const label = "Gedeclareerde tegen gewerkte uren";
  if (!r.uitvoerbaar) {
    return { id: "declared_hours_check", label, status: "grijs", message: `Niet uitvoerbaar – ${r.reden_niet_uitvoerbaar}` };
  }
  const afw = r.totaal_worked > 0 ? (r.totaal_declared - r.totaal_worked) / r.totaal_worked : undefined;
  const pct = afw === undefined ? "" : ` (${afw > 0 ? "+" : ""}${(afw * 100).toFixed(1)}%)`;
  const uren = `gedeclareerd ${r.totaal_declared.toFixed(0)} uur tegen ${r.totaal_worked.toFixed(0)} uur gewerkt${pct}`;
  const vergelijkbaar = r.aantal.groen + r.aantal.oranje + r.aantal.rood;
  const message =
    r.niveau === "totaal"
      ? `Alleen het totaal vergeleken (uren niet per kostenplaats gekoppeld): ${uren}`
      : `${vergelijkbaar} kostenplaats(en) vergeleken: ${r.aantal.rood} rood, ${r.aantal.oranje} oranje, ${r.aantal.groen} groen` +
        `${r.aantal.grijs > 0 ? `, ${r.aantal.grijs} niet vergelijkbaar` : ""}. Totaal ${uren}`;
  return {
    id: "declared_hours_check",
    label,
    status: r.status,
    value: afw,
    message,
    details: {
      declared: r.totaal_declared,
      worked: r.totaal_worked,
      rood: r.aantal.rood,
      oranje: r.aantal.oranje,
      groen: r.aantal.groen,
      grijs: r.aantal.grijs,
    },
  };
}
