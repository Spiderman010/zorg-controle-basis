import type {
  Dataset,
  ValidationIssue,
  RevenueRecord,
  PayrollCostRecord,
  ExternalHireRecord,
  PaidHoursRecord,
  DirectHoursRecord,
  NonProductiveHoursRecord,
  BaseRecord,
} from "./types";

const PERIOD_RE = /^\d{4}(-(0[1-9]|1[0-2]))?$/;

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function checkBase(
  rec: BaseRecord,
  index: number,
  type: string,
  issues: ValidationIssue[]
) {
  if (!rec.dossier_id || String(rec.dossier_id).trim() === "") {
    issues.push({ record_index: index, record_type: type, field: "dossier_id", message: "dossier_id ontbreekt", severity: "error" });
  }
  if (!rec.period || !PERIOD_RE.test(rec.period)) {
    issues.push({ record_index: index, record_type: type, field: "period", message: "ongeldige periode (verwacht YYYY of YYYY-MM)", severity: "error" });
  }
  if (!rec.source_file) {
    issues.push({ record_index: index, record_type: type, field: "source_file", message: "source_file ontbreekt", severity: "error" });
  }
  if (!rec.import_status) {
    issues.push({ record_index: index, record_type: type, field: "import_status", message: "import_status ontbreekt", severity: "error" });
  }
}

function checkAmount(
  rec: BaseRecord & { amount?: number },
  index: number,
  type: string,
  issues: ValidationIssue[]
) {
  if (!isNum(rec.amount)) {
    issues.push({ record_index: index, record_type: type, field: "amount", message: "amount is niet numeriek", severity: "error" });
    return;
  }
  if (rec.amount < 0 && !rec.is_correction) {
    issues.push({ record_index: index, record_type: type, field: "amount", message: "negatief bedrag zonder is_correction=true", severity: "warning" });
  }
}

function checkHours(
  rec: BaseRecord,
  index: number,
  type: string,
  field: string,
  value: unknown,
  issues: ValidationIssue[]
) {
  if (!isNum(value)) {
    issues.push({ record_index: index, record_type: type, field, message: `${field} is niet numeriek`, severity: "error" });
    return;
  }
  if ((value as number) < 0 && !rec.is_correction) {
    issues.push({ record_index: index, record_type: type, field, message: `negatieve uren zonder is_correction=true`, severity: "warning" });
  }
}

export function validateDataset(ds: Dataset): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  (ds.revenue ?? []).forEach((r, i) => {
    checkBase(r, i, "RevenueRecord", issues);
    checkAmount(r, i, "RevenueRecord", issues);
    if (!r.account_code) issues.push({ record_index: i, record_type: "RevenueRecord", field: "account_code", message: "account_code ontbreekt", severity: "error" });
    if (!r.revenue_type) issues.push({ record_index: i, record_type: "RevenueRecord", field: "revenue_type", message: "revenue_type ontbreekt", severity: "error" });
  });

  (ds.payroll ?? []).forEach((r, i) => {
    checkBase(r, i, "PayrollCostRecord", issues);
    checkAmount(r, i, "PayrollCostRecord", issues);
    if (!r.payroll_component) issues.push({ record_index: i, record_type: "PayrollCostRecord", field: "payroll_component", message: "payroll_component ontbreekt", severity: "error" });
    if (r.hours !== undefined) checkHours(r, i, "PayrollCostRecord", "hours", r.hours, issues);
  });

  (ds.external_hire ?? []).forEach((r, i) => {
    checkBase(r, i, "ExternalHireRecord", issues);
    checkAmount(r, i, "ExternalHireRecord", issues);
    if (!r.vendor_name) issues.push({ record_index: i, record_type: "ExternalHireRecord", field: "vendor_name", message: "vendor_name ontbreekt", severity: "error" });
    if (r.hours !== undefined) checkHours(r, i, "ExternalHireRecord", "hours", r.hours, issues);
  });

  (ds.paid_hours ?? []).forEach((r, i) => {
    checkBase(r, i, "PaidHoursRecord", issues);
    if (!r.employee_id) issues.push({ record_index: i, record_type: "PaidHoursRecord", field: "employee_id", message: "employee_id ontbreekt", severity: "error" });
    checkHours(r, i, "PaidHoursRecord", "paid_hours", r.paid_hours, issues);
  });

  (ds.direct_hours ?? []).forEach((r, i) => {
    checkBase(r, i, "DirectHoursRecord", issues);
    if (!r.employee_id) issues.push({ record_index: i, record_type: "DirectHoursRecord", field: "employee_id", message: "employee_id ontbreekt", severity: "error" });
    checkHours(r, i, "DirectHoursRecord", "direct_hours", r.direct_hours, issues);
  });

  (ds.non_productive_hours ?? []).forEach((r, i) => {
    checkBase(r, i, "NonProductiveHoursRecord", issues);
    if (!r.employee_id) issues.push({ record_index: i, record_type: "NonProductiveHoursRecord", field: "employee_id", message: "employee_id ontbreekt", severity: "error" });
    checkHours(r, i, "NonProductiveHoursRecord", "non_productive_hours", r.non_productive_hours, issues);
  });

  return issues;
}

/** Som met automatische negeer-modus voor 'invalid' records. */
export function sumValid<T extends BaseRecord>(
  records: T[] | undefined,
  pick: (r: T) => number
): number {
  if (!records) return 0;
  return records
    .filter((r) => r.import_status !== "invalid")
    .reduce((acc, r) => acc + (Number.isFinite(pick(r)) ? pick(r) : 0), 0);
}

// Re-exports
export type { RevenueRecord, PayrollCostRecord, ExternalHireRecord, PaidHoursRecord, DirectHoursRecord, NonProductiveHoursRecord };
