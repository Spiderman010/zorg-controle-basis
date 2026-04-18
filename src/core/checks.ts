import type { Dataset, CheckResult, CheckStatus, CheckId } from "./types";
import { computeMetrics } from "./calculations";

const GREY_MSG = (source: string) => `Niet uitvoerbaar – ${source} ontbreekt`;

function hasRecords(arr: unknown[] | undefined): boolean {
  return Array.isArray(arr) && arr.length > 0;
}

/** Status op basis van waarde + drempels (oranje, rood). Richting "high" of "low". */
function thresholdStatus(
  value: number | undefined,
  orange: number,
  red: number,
  direction: "high" | "low"
): CheckStatus {
  if (value === undefined || !Number.isFinite(value)) return "grijs";
  if (direction === "high") {
    if (value > red) return "rood";
    if (value > orange) return "oranje";
    return "groen";
  } else {
    if (value < red) return "rood";
    if (value < orange) return "oranje";
    return "groen";
  }
}

function reconciliation(
  id: CheckId,
  label: string,
  primaryAvailable: boolean,
  primaryTotal: number,
  secondary: number | undefined,
  primarySource: string,
  secondarySource: string,
  toleranceAbs = 0.01
): CheckResult {
  if (!primaryAvailable) return { id, label, status: "grijs", message: GREY_MSG(primarySource) };
  if (secondary === undefined) return { id, label, status: "grijs", message: GREY_MSG(secondarySource) };
  const diff = primaryTotal - secondary;
  const status: CheckStatus = Math.abs(diff) <= toleranceAbs ? "groen" : "oranje";
  return {
    id,
    label,
    status,
    value: diff,
    message: status === "groen" ? "Aansluiting in orde" : `Verschil: ${diff.toFixed(2)}`,
    details: { primary: primaryTotal, secondary, diff },
  };
}

export function runChecks(ds: Dataset): CheckResult[] {
  const m = computeMetrics(ds);
  const sec = ds.secondary_totals ?? {};

  const results: CheckResult[] = [];

  // 1. Zorgopbrengsten aansluiting
  results.push(
    reconciliation(
      "revenue_reconciliation",
      "Zorgopbrengsten aansluiting",
      hasRecords(ds.revenue),
      m.totals.revenue,
      sec.revenue_total,
      "zorgopbrengsten",
      "tweede bron zorgopbrengsten"
    )
  );

  // 2. Personeelskosten aansluiting
  results.push(
    reconciliation(
      "payroll_reconciliation",
      "Personeelskosten aansluiting",
      hasRecords(ds.payroll),
      m.totals.payroll,
      sec.payroll_total,
      "personeelskosten",
      "tweede bron personeelskosten"
    )
  );

  // 3. Inhuur aansluiting
  results.push(
    reconciliation(
      "external_hire_reconciliation",
      "Inhuur aansluiting",
      hasRecords(ds.external_hire),
      m.totals.external_hire,
      sec.external_hire_total,
      "inhuur",
      "tweede bron inhuur"
    )
  );

  // 4. Totale personeelslastenratio (>75% oranje, >85% rood) — als ratio
  {
    const v = m.personnel_cost_ratio;
    let status: CheckStatus;
    let message: string;
    if (!hasRecords(ds.revenue)) {
      status = "grijs"; message = GREY_MSG("zorgopbrengsten");
    } else if (!hasRecords(ds.payroll) && !hasRecords(ds.external_hire)) {
      status = "grijs"; message = GREY_MSG("personeelskosten of inhuur");
    } else if (v === undefined) {
      status = "grijs"; message = GREY_MSG("geldige zorgopbrengsten");
    } else {
      status = thresholdStatus(v, 0.75, 0.85, "high");
      message = `Personeelslastenratio: ${(v * 100).toFixed(1)}%`;
    }
    results.push({ id: "personnel_cost_ratio", label: "Totale personeelslastenratio", status, value: v, message });
  }

  // 5. Betaalde uren aansluiting
  results.push(
    reconciliation(
      "paid_hours_reconciliation",
      "Betaalde uren aansluiting",
      hasRecords(ds.paid_hours),
      m.totals.paid_hours,
      sec.paid_hours_total,
      "betaalde uren",
      "tweede bron betaalde uren"
    )
  );

  // 6. Directe urenratio (<60% oranje, <50% rood)
  {
    const v = m.direct_hours_ratio;
    let status: CheckStatus;
    let message: string;
    if (!hasRecords(ds.paid_hours)) {
      status = "grijs"; message = GREY_MSG("betaalde uren");
    } else if (!hasRecords(ds.direct_hours)) {
      status = "grijs"; message = GREY_MSG("directe uren");
    } else if (v === undefined) {
      status = "grijs"; message = GREY_MSG("geldige betaalde uren");
    } else {
      status = thresholdStatus(v, 0.60, 0.50, "low");
      message = `Directe urenratio: ${(v * 100).toFixed(1)}%`;
    }
    results.push({ id: "direct_hours_ratio", label: "Directe urenratio", status, value: v, message });
  }

  // 7. Niet-productieve urenratio (geen drempel gespecificeerd; toon waarde)
  {
    const v = m.non_productive_hours_ratio;
    let status: CheckStatus = "groen";
    let message: string;
    if (!hasRecords(ds.paid_hours)) {
      status = "grijs"; message = GREY_MSG("betaalde uren");
    } else if (!hasRecords(ds.non_productive_hours)) {
      status = "grijs"; message = GREY_MSG("niet-productieve uren");
    } else if (v === undefined) {
      status = "grijs"; message = GREY_MSG("geldige betaalde uren");
    } else {
      message = `Niet-productieve urenratio: ${(v * 100).toFixed(1)}%`;
    }
    results.push({ id: "non_productive_hours_ratio", label: "Niet-productieve urenratio", status, value: v, message: message! });
  }

  // 8. Resturenanalyse (>15% oranje, >25% rood)
  {
    const v = m.remaining_hours_ratio;
    let status: CheckStatus;
    let message: string;
    if (!hasRecords(ds.paid_hours)) {
      status = "grijs"; message = GREY_MSG("betaalde uren");
    } else if (!hasRecords(ds.direct_hours) && !hasRecords(ds.non_productive_hours)) {
      status = "grijs"; message = GREY_MSG("directe of niet-productieve uren");
    } else if (v === undefined) {
      status = "grijs"; message = GREY_MSG("geldige betaalde uren");
    } else {
      status = thresholdStatus(v, 0.15, 0.25, "high");
      message = `Resturenratio: ${(v * 100).toFixed(1)}% (${m.remaining_hours.toFixed(1)} uur` +
        (m.remaining_hours_euro_impact !== undefined ? `, € ${m.remaining_hours_euro_impact.toFixed(0)}` : "") + ")";
    }
    results.push({
      id: "remaining_hours_analysis",
      label: "Resturenanalyse",
      status,
      value: v,
      message,
      details: {
        remaining_hours: m.remaining_hours,
        avg_wage_per_hour: m.avg_wage_per_hour,
        euro_impact: m.remaining_hours_euro_impact,
      },
    });
  }

  return results;
}

/** De 8 kerncontroles die meetellen in de hoofdscore. Trendcontroles tellen niet mee. */
export const CORE_CHECK_IDS: CheckId[] = [
  "revenue_reconciliation",
  "payroll_reconciliation",
  "external_hire_reconciliation",
  "personnel_cost_ratio",
  "paid_hours_reconciliation",
  "direct_hours_ratio",
  "non_productive_hours_ratio",
  "remaining_hours_analysis",
];

/** Gewichten per status. Grijs telt niet mee. */
export const SCORE_WEIGHTS = { groen: 1, oranje: 0.5, rood: 0 } as const;

export const SCORE_FORMULE =
  "score = (groen × 1 + oranje × 0,5 + rood × 0) / (groen + oranje + rood); grijs telt niet mee";

export interface ScoreSummary {
  /** Totaal aantal controles in input */
  total: number;
  groen: number;
  oranje: number;
  rood: number;
  grijs: number;
  /** Aantal uitvoerbare controles (groen+oranje+rood) — noemer van de score */
  uitvoerbaar: number;
  /** Teller: groen × 1 + oranje × 0,5 + rood × 0 */
  teller: number;
  /** Score 0-1 op uitvoerbare controles. undefined als er geen uitvoerbare zijn. */
  score?: number;
  /** Score in procenten (0-100). undefined als er geen uitvoerbare zijn. */
  scorePercent?: number;
  /** Menselijk leesbare formule */
  formule: string;
}

/**
 * Bereken de hoofdscore.
 * - groen = 1, oranje = 0,5, rood = 0
 * - grijs telt niet mee in teller of noemer
 * - input wordt gefilterd op kerncontroles; trendcontroles tellen niet mee
 */
export function summarize(results: CheckResult[]): ScoreSummary {
  const coreSet = new Set<string>(CORE_CHECK_IDS);
  const core = results.filter((r) => coreSet.has(r.id));
  const counts = { groen: 0, oranje: 0, rood: 0, grijs: 0 };
  for (const r of core) counts[r.status]++;
  const uitvoerbaar = counts.groen + counts.oranje + counts.rood;
  const teller =
    counts.groen * SCORE_WEIGHTS.groen +
    counts.oranje * SCORE_WEIGHTS.oranje +
    counts.rood * SCORE_WEIGHTS.rood;
  const score = uitvoerbaar === 0 ? undefined : teller / uitvoerbaar;
  return {
    total: core.length,
    ...counts,
    uitvoerbaar,
    teller,
    score,
    scorePercent: score === undefined ? undefined : score * 100,
    formule: SCORE_FORMULE,
  };
}
