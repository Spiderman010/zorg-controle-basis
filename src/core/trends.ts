// Aanvullende verbandscontroles (trend) — vergelijken huidige periode met vorige periode.
// Verandert de bestaande kerncontroles niet.

import type { Dataset, CheckStatus } from "./types";
import { computeTotals } from "./calculations";

export type TrendCheckId =
  | "trend_direct_vs_revenue"
  | "trend_payroll_vs_direct"
  | "trend_hire_vs_direct"
  | "trend_revenue_vs_capacity";

export interface TrendCheckResult {
  id: TrendCheckId;
  code: string;
  label: string;
  status: CheckStatus;
  message: string;
  details?: Record<string, number | string | undefined>;
}

const GREY = "Niet uitvoerbaar – vorige periode ontbreekt";

interface PeriodeDataset {
  label: string; // bv. "2025-01"
  dataset: Dataset;
}

/** Bepaal richting: stijgt (>tol), daalt (<-tol), gelijk. tol = relatieve tolerantie 1%. */
function richting(huidig: number, vorig: number, tol = 0.01): "stijgt" | "daalt" | "gelijk" {
  if (vorig === 0) {
    if (huidig > 0) return "stijgt";
    if (huidig < 0) return "daalt";
    return "gelijk";
  }
  const delta = (huidig - vorig) / Math.abs(vorig);
  if (delta > tol) return "stijgt";
  if (delta < -tol) return "daalt";
  return "gelijk";
}

function pct(huidig: number, vorig: number): string {
  if (vorig === 0) return huidig === 0 ? "0%" : "n.v.t.";
  return `${(((huidig - vorig) / Math.abs(vorig)) * 100).toFixed(1)}%`;
}

export function runTrendChecks(huidig: PeriodeDataset, vorig?: PeriodeDataset): TrendCheckResult[] {
  const results: TrendCheckResult[] = [];

  if (!vorig) {
    const grey = (id: TrendCheckId, code: string, label: string): TrendCheckResult => ({
      id, code, label, status: "grijs", message: GREY,
    });
    return [
      grey("trend_direct_vs_revenue", "V2-T01", "Directe uren vs. zorgopbrengsten (trend)"),
      grey("trend_payroll_vs_direct", "V2-T02", "Personeelskosten vs. directe uren (trend)"),
      grey("trend_hire_vs_direct", "V2-T03", "Inhuur vs. directe uren (trend)"),
      grey("trend_revenue_vs_capacity", "V2-T04", "Zorgopbrengsten vs. capaciteit (trend)"),
    ];
  }

  const h = computeTotals(huidig.dataset);
  const v = computeTotals(vorig.dataset);

  // T01 — Directe uren stijgen, opbrengsten dalen of gelijk
  {
    const rd = richting(h.direct_hours, v.direct_hours);
    const rr = richting(h.revenue, v.revenue);
    let status: CheckStatus = "groen";
    let message = `Directe uren ${pct(h.direct_hours, v.direct_hours)}, opbrengsten ${pct(h.revenue, v.revenue)}.`;
    if (h.direct_hours === 0 && v.direct_hours === 0) {
      status = "grijs"; message = "Geen directe uren in beide periodes.";
    } else if (rd === "stijgt" && (rr === "daalt" || rr === "gelijk")) {
      status = "oranje";
      message = `Signaal: directe uren stijgen (${pct(h.direct_hours, v.direct_hours)}) terwijl opbrengsten ${rr === "daalt" ? "dalen" : "gelijk blijven"} (${pct(h.revenue, v.revenue)}).`;
    }
    results.push({
      id: "trend_direct_vs_revenue", code: "V2-T01",
      label: "Directe uren vs. zorgopbrengsten (trend)",
      status, message,
      details: { directe_uren_huidig: h.direct_hours, directe_uren_vorig: v.direct_hours, opbrengsten_huidig: h.revenue, opbrengsten_vorig: v.revenue },
    });
  }

  // T02 — Personeelskosten stijgen, directe uren dalen
  {
    const rp = richting(h.payroll, v.payroll);
    const rd = richting(h.direct_hours, v.direct_hours);
    let status: CheckStatus = "groen";
    let message = `Personeelskosten ${pct(h.payroll, v.payroll)}, directe uren ${pct(h.direct_hours, v.direct_hours)}.`;
    if (h.payroll === 0 && v.payroll === 0) {
      status = "grijs"; message = "Geen personeelskosten in beide periodes.";
    } else if (rp === "stijgt" && rd === "daalt") {
      status = "rood";
      message = `Signaal: personeelskosten stijgen (${pct(h.payroll, v.payroll)}) terwijl directe uren dalen (${pct(h.direct_hours, v.direct_hours)}).`;
    }
    results.push({
      id: "trend_payroll_vs_direct", code: "V2-T02",
      label: "Personeelskosten vs. directe uren (trend)",
      status, message,
      details: { personeelskosten_huidig: h.payroll, personeelskosten_vorig: v.payroll, directe_uren_huidig: h.direct_hours, directe_uren_vorig: v.direct_hours },
    });
  }

  // T03 — Inhuur stijgt, directe uren gelijk of dalen
  {
    const ri = richting(h.external_hire, v.external_hire);
    const rd = richting(h.direct_hours, v.direct_hours);
    let status: CheckStatus = "groen";
    let message = `Inhuur ${pct(h.external_hire, v.external_hire)}, directe uren ${pct(h.direct_hours, v.direct_hours)}.`;
    if (h.external_hire === 0 && v.external_hire === 0) {
      status = "grijs"; message = "Geen inhuur in beide periodes.";
    } else if (ri === "stijgt" && (rd === "gelijk" || rd === "daalt")) {
      status = "oranje";
      message = `Signaal: inhuur stijgt (${pct(h.external_hire, v.external_hire)}) zonder evenredige stijging van directe uren (${pct(h.direct_hours, v.direct_hours)}).`;
    }
    results.push({
      id: "trend_hire_vs_direct", code: "V2-T03",
      label: "Inhuur vs. directe uren (trend)",
      status, message,
      details: { inhuur_huidig: h.external_hire, inhuur_vorig: v.external_hire, directe_uren_huidig: h.direct_hours, directe_uren_vorig: v.direct_hours },
    });
  }

  // T04 — Opbrengsten stijgen, capaciteit (betaalde uren + inhuur) niet
  {
    const rr = richting(h.revenue, v.revenue);
    const rb = richting(h.paid_hours, v.paid_hours);
    const ri = richting(h.external_hire, v.external_hire);
    let status: CheckStatus = "groen";
    let message = `Opbrengsten ${pct(h.revenue, v.revenue)}, betaalde uren ${pct(h.paid_hours, v.paid_hours)}, inhuur ${pct(h.external_hire, v.external_hire)}.`;
    if (h.revenue === 0 && v.revenue === 0) {
      status = "grijs"; message = "Geen opbrengsten in beide periodes.";
    } else if (rr === "stijgt" && rb !== "stijgt" && ri !== "stijgt") {
      status = "oranje";
      message = `Signaal: opbrengsten stijgen (${pct(h.revenue, v.revenue)}) terwijl betaalde uren en inhuur niet stijgen.`;
    }
    results.push({
      id: "trend_revenue_vs_capacity", code: "V2-T04",
      label: "Zorgopbrengsten vs. capaciteit (trend)",
      status, message,
      details: { opbrengsten_huidig: h.revenue, opbrengsten_vorig: v.revenue, betaalde_uren_huidig: h.paid_hours, betaalde_uren_vorig: v.paid_hours, inhuur_huidig: h.external_hire, inhuur_vorig: v.external_hire },
    });
  }

  return results;
}

/** Splits een dataset in periodes op basis van het period-veld van de records. */
export function splitByPeriod(ds: Dataset): Map<string, Dataset> {
  const map = new Map<string, Dataset>();
  const ensure = (p: string): Dataset => {
    if (!map.has(p)) map.set(p, {});
    return map.get(p)!;
  };
  (ds.revenue ?? []).forEach((r) => { (ensure(r.period).revenue ||= []).push(r); });
  (ds.payroll ?? []).forEach((r) => { (ensure(r.period).payroll ||= []).push(r); });
  (ds.external_hire ?? []).forEach((r) => { (ensure(r.period).external_hire ||= []).push(r); });
  (ds.paid_hours ?? []).forEach((r) => { (ensure(r.period).paid_hours ||= []).push(r); });
  (ds.direct_hours ?? []).forEach((r) => { (ensure(r.period).direct_hours ||= []).push(r); });
  (ds.non_productive_hours ?? []).forEach((r) => { (ensure(r.period).non_productive_hours ||= []).push(r); });
  return map;
}

/** Pak laatste twee periodes (gesorteerd op label) en voer trendcontroles uit. */
export function runTrendChecksFromDataset(ds: Dataset): TrendCheckResult[] {
  const map = splitByPeriod(ds);
  const periodes = Array.from(map.keys()).filter(Boolean).sort();
  if (periodes.length < 2) {
    const huidig = periodes[0] ? { label: periodes[0], dataset: map.get(periodes[0])! } : { label: "", dataset: ds };
    return runTrendChecks(huidig, undefined);
  }
  const vorigLabel = periodes[periodes.length - 2];
  const huidigLabel = periodes[periodes.length - 1];
  return runTrendChecks(
    { label: huidigLabel, dataset: map.get(huidigLabel)! },
    { label: vorigLabel, dataset: map.get(vorigLabel)! },
  );
}
