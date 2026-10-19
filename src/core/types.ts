// Zorg Controle Basis — Core types
// Datamodel voor financiële verbandscontroles MKB-zorg.

export type ImportStatus = "valid" | "warning" | "invalid";
export type CheckStatus = "groen" | "oranje" | "rood" | "grijs";

/** Periode in formaat "YYYY-MM" of "YYYY" */
export type Period = string;

export interface BaseRecord {
  dossier_id: string;
  period: Period;
  source_file: string;
  import_status: ImportStatus;
  location?: string;
  /** Markeer expliciet als correctie/credit zodat negatieve bedragen toegestaan zijn */
  is_correction?: boolean;
}

export interface RevenueRecord extends BaseRecord {
  account_code: string;
  account_name: string;
  amount: number;
  /** Bv. "WLZ", "ZVW", "WMO", "PGB", "particulier" */
  revenue_type: string;
  /** Toerekening aan een project (financieringsstroom of contract); leeg = "Algemeen". */
  project_id?: string;
}

export interface PayrollCostRecord extends BaseRecord {
  payroll_component: string;
  amount: number;
  employee_id?: string;
  employee_name?: string;
  hours?: number;
  function_name?: string;
}

export interface ExternalHireRecord extends BaseRecord {
  vendor_name: string;
  amount: number;
  invoice_number?: string;
  account_code?: string;
  hire_type?: string;
  hours?: number;
  /** Toerekening aan een project; leeg = "Algemeen". */
  project_id?: string;
}

export interface PaidHoursRecord extends BaseRecord {
  employee_id: string;
  paid_hours: number;
  employee_name?: string;
  hour_type?: string;
  function_name?: string;
}

export interface DirectHoursRecord extends BaseRecord {
  employee_id: string;
  direct_hours: number;
  client_id?: string;
  activity_code?: string;
  activity_description?: string;
  /** Toerekening aan een project; leeg = "Algemeen". */
  project_id?: string;
}

export interface NonProductiveHoursRecord extends BaseRecord {
  employee_id: string;
  non_productive_hours: number;
  absence_type?: string;
}

/**
 * Gedeclareerde uren (declaratie of factuur), al omgerekend naar uren.
 * Wordt alleen gebruikt voor de aparte uren-verbandcontrole; telt niet mee in de hoofdscore.
 */
export interface DeclaredHoursRecord extends BaseRecord {
  /** In uren; negatief bij een correctie of creditnota. */
  declared_hours: number;
  /** Financieringsstroom zoals aangeleverd (vrije tekst). */
  stream?: string;
  /** Declareert deze stroom in uren? "nee" = niet vergelijkbaar (bijv. Wlz-verblijf); "onzeker" = nog niet vastgesteld. */
  in_hours: "ja" | "nee" | "onzeker";
  /** Toerekening aan een project; leeg = "Algemeen". */
  project_id?: string;
}

/** Container voor één dossier/periode dat gecontroleerd wordt. */
export interface Dataset {
  revenue?: RevenueRecord[];
  payroll?: PayrollCostRecord[];
  external_hire?: ExternalHireRecord[];
  paid_hours?: PaidHoursRecord[];
  direct_hours?: DirectHoursRecord[];
  declared_hours?: DeclaredHoursRecord[];
  non_productive_hours?: NonProductiveHoursRecord[];
  /** Optionele 'tweede bron' totalen voor aansluitcontroles (bv. uit grootboek vs. subadministratie) */
  secondary_totals?: {
    revenue_total?: number;
    payroll_total?: number;
    external_hire_total?: number;
    paid_hours_total?: number;
  };
}

export type CheckId =
  | "revenue_reconciliation"
  | "payroll_reconciliation"
  | "external_hire_reconciliation"
  | "personnel_cost_ratio"
  | "paid_hours_reconciliation"
  | "direct_hours_ratio"
  | "non_productive_hours_ratio"
  | "remaining_hours_analysis"
  | "soll_omzet_check"
  | "declared_hours_check";

export interface CheckResult {
  id: CheckId;
  label: string;
  status: CheckStatus;
  value?: number;
  message: string;
  details?: Record<string, number | string | undefined>;
}

export interface ValidationIssue {
  record_index: number;
  record_type: string;
  field?: string;
  message: string;
  severity: "warning" | "error";
}
