// Projectadministratie: toerekening van opbrengsten, inhuur en directe uren
// aan projecten (financieringsstroom of contract) binnen een dossier.
// Aparte module naast de kerncontroles: projectanalyses tellen NIET mee in de
// hoofdscore en kennen geen eigen drempels.
import type { Dataset } from "./types";
import { safeDiv } from "./calculations";
import type { Financieringsstroom } from "./financiering";

/** Vast pseudo-project voor regels zonder (geldige) projecttoewijzing. */
export const ALGEMEEN_PROJECT_ID = "algemeen";
export const ALGEMEEN_PROJECT_NAAM = "Algemeen (niet toegewezen)";

export interface ProjectDef {
  id: string;
  naam: string;
  /** Optionele koppeling aan een wettelijk kader. */
  stroom?: Financieringsstroom;
}

export interface ProjectAnalyse {
  project_id: string;
  naam: string;
  stroom?: Financieringsstroom;
  revenue: number;
  /** Aandeel in totale opbrengsten (0-1); undefined als totaal 0. */
  revenue_share?: number;
  external_hire: number;
  direct_hours: number;
  /** Aandeel in totale directe uren (0-1); undefined als totaal 0. */
  direct_hours_share?: number;
  /** Gerealiseerd tarief: opbrengsten / directe uren. */
  revenue_per_direct_hour?: number;
}

interface Bucket {
  revenue: number;
  external_hire: number;
  direct_hours: number;
}

/**
 * Verdeel opbrengsten, inhuur en directe uren over de projecten.
 * Regels zonder project_id — of met een project_id dat niet (meer) bestaat —
 * vallen in het pseudo-project "Algemeen", zodat de som over projecten altijd
 * gelijk is aan het dossiertotaal.
 */
export function computeProjectAnalyse(ds: Dataset, projecten: ProjectDef[]): ProjectAnalyse[] {
  const bekend = new Set(projecten.map((p) => p.id));
  const buckets = new Map<string, Bucket>();
  const bucket = (project_id: string | undefined): Bucket => {
    const key = project_id && bekend.has(project_id) ? project_id : ALGEMEEN_PROJECT_ID;
    let b = buckets.get(key);
    if (!b) {
      b = { revenue: 0, external_hire: 0, direct_hours: 0 };
      buckets.set(key, b);
    }
    return b;
  };

  for (const r of ds.revenue ?? []) {
    if (r.import_status === "invalid" || !Number.isFinite(r.amount)) continue;
    bucket(r.project_id).revenue += r.amount;
  }
  for (const r of ds.external_hire ?? []) {
    if (r.import_status === "invalid" || !Number.isFinite(r.amount)) continue;
    bucket(r.project_id).external_hire += r.amount;
  }
  for (const r of ds.direct_hours ?? []) {
    if (r.import_status === "invalid" || !Number.isFinite(r.direct_hours)) continue;
    bucket(r.project_id).direct_hours += r.direct_hours;
  }

  const totRevenue = [...buckets.values()].reduce((a, b) => a + b.revenue, 0);
  const totDirect = [...buckets.values()].reduce((a, b) => a + b.direct_hours, 0);

  const analyse = (id: string, naam: string, stroom?: Financieringsstroom): ProjectAnalyse | null => {
    const b = buckets.get(id);
    if (!b) return null;
    return {
      project_id: id,
      naam,
      stroom,
      revenue: b.revenue,
      revenue_share: totRevenue !== 0 ? b.revenue / totRevenue : undefined,
      external_hire: b.external_hire,
      direct_hours: b.direct_hours,
      direct_hours_share: totDirect !== 0 ? b.direct_hours / totDirect : undefined,
      revenue_per_direct_hour: safeDiv(b.revenue, b.direct_hours),
    };
  };

  // Dedupliceer op id en reserveer de Algemeen-sleutel, zodat de som over de
  // uitvoer altijd gelijk blijft aan het dossiertotaal — ook bij dubbele of
  // botsende project-ids uit een externe bron.
  const out: ProjectAnalyse[] = [];
  const gezien = new Set<string>([ALGEMEEN_PROJECT_ID]);
  for (const p of projecten) {
    if (gezien.has(p.id)) continue;
    gezien.add(p.id);
    const a = analyse(p.id, p.naam, p.stroom);
    if (a) out.push(a);
  }
  const alg = analyse(ALGEMEEN_PROJECT_ID, ALGEMEEN_PROJECT_NAAM);
  if (alg) out.push(alg);
  return out;
}
