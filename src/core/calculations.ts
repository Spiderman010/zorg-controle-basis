import type { Dataset } from "./types";
import { sumValid } from "./validation";

export interface Totals {
  revenue: number;
  payroll: number;
  external_hire: number;
  paid_hours: number;
  direct_hours: number;
  non_productive_hours: number;
}

export function computeTotals(ds: Dataset): Totals {
  return {
    revenue: sumValid(ds.revenue, (r) => r.amount),
    payroll: sumValid(ds.payroll, (r) => r.amount),
    external_hire: sumValid(ds.external_hire, (r) => r.amount),
    paid_hours: sumValid(ds.paid_hours, (r) => r.paid_hours),
    direct_hours: sumValid(ds.direct_hours, (r) => r.direct_hours),
    non_productive_hours: sumValid(ds.non_productive_hours, (r) => r.non_productive_hours),
  };
}

/** Veilige deling: undefined als deler 0/ongeldig. */
export function safeDiv(num: number, den: number): number | undefined {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return undefined;
  return num / den;
}

export interface DerivedMetrics {
  totals: Totals;
  personnel_cost_ratio?: number;        // (payroll + external_hire) / revenue
  direct_hours_ratio?: number;          // direct / paid
  non_productive_hours_ratio?: number;  // non-productive / paid
  remaining_hours: number;              // paid - direct - non_productive
  remaining_hours_ratio?: number;       // remaining / paid
  avg_wage_per_hour?: number;           // payroll / paid_hours
  remaining_hours_euro_impact?: number; // remaining * avg_wage_per_hour
}

export function computeMetrics(ds: Dataset): DerivedMetrics {
  const totals = computeTotals(ds);
  const remaining = totals.paid_hours - totals.direct_hours - totals.non_productive_hours;
  const avgWage = safeDiv(totals.payroll, totals.paid_hours);

  return {
    totals,
    personnel_cost_ratio: safeDiv(totals.payroll + totals.external_hire, totals.revenue),
    direct_hours_ratio: safeDiv(totals.direct_hours, totals.paid_hours),
    non_productive_hours_ratio: safeDiv(totals.non_productive_hours, totals.paid_hours),
    remaining_hours: remaining,
    remaining_hours_ratio: safeDiv(remaining, totals.paid_hours),
    avg_wage_per_hour: avgWage,
    remaining_hours_euro_impact: avgWage !== undefined ? remaining * avgWage : undefined,
  };
}
