import { describe, it, expect } from "vitest";
import {
  validateDataset,
  computeMetrics,
  runChecks,
  summarize,
  type Dataset,
} from "../index";

const base = { dossier_id: "D1", period: "2025-01", source_file: "test.xlsx", import_status: "valid" as const };

function makeDataset(overrides: Partial<Dataset> = {}): Dataset {
  return {
    revenue: [
      { ...base, account_code: "8000", account_name: "WLZ", amount: 800_000, revenue_type: "WLZ" },
      { ...base, account_code: "8010", account_name: "ZVW", amount: 200_000, revenue_type: "ZVW" },
    ],
    payroll: [{ ...base, payroll_component: "bruto loon", amount: 600_000 }],
    external_hire: [{ ...base, vendor_name: "ZZP A", amount: 100_000 }],
    paid_hours: [{ ...base, employee_id: "E1", paid_hours: 10_000 }],
    direct_hours: [{ ...base, employee_id: "E1", direct_hours: 7_000 }],
    non_productive_hours: [{ ...base, employee_id: "E1", non_productive_hours: 1_500 }],
    secondary_totals: {
      revenue_total: 1_000_000,
      payroll_total: 600_000,
      external_hire_total: 100_000,
      paid_hours_total: 10_000,
    },
    ...overrides,
  };
}

describe("validation", () => {
  it("accepteert een geldige dataset zonder errors", () => {
    const issues = validateDataset(makeDataset()).filter((i) => i.severity === "error");
    expect(issues).toEqual([]);
  });

  it("vlagt ontbrekend dossier_id", () => {
    const ds = makeDataset({
      revenue: [{ ...base, dossier_id: "", account_code: "8000", account_name: "WLZ", amount: 1, revenue_type: "WLZ" }],
    });
    const issues = validateDataset(ds);
    expect(issues.some((i) => i.field === "dossier_id")).toBe(true);
  });

  it("vlagt ongeldige periode", () => {
    const ds = makeDataset({
      revenue: [{ ...base, period: "jan-2025", account_code: "8", account_name: "x", amount: 1, revenue_type: "WLZ" }],
    });
    expect(validateDataset(ds).some((i) => i.field === "period")).toBe(true);
  });

  it("waarschuwt bij negatief bedrag zonder is_correction", () => {
    const ds = makeDataset({
      revenue: [{ ...base, account_code: "8", account_name: "x", amount: -100, revenue_type: "WLZ" }],
    });
    const issues = validateDataset(ds);
    expect(issues.some((i) => i.severity === "warning" && i.field === "amount")).toBe(true);
  });

  it("staat negatief toe bij is_correction=true", () => {
    const ds = makeDataset({
      revenue: [{ ...base, is_correction: true, account_code: "8", account_name: "x", amount: -100, revenue_type: "WLZ" }],
    });
    const warn = validateDataset(ds).filter((i) => i.field === "amount");
    expect(warn).toEqual([]);
  });
});

describe("calculations", () => {
  it("berekent metrics correct", () => {
    const m = computeMetrics(makeDataset());
    expect(m.totals.revenue).toBe(1_000_000);
    expect(m.personnel_cost_ratio).toBeCloseTo(0.7, 5); // 700k / 1M
    expect(m.direct_hours_ratio).toBeCloseTo(0.7, 5);
    expect(m.non_productive_hours_ratio).toBeCloseTo(0.15, 5);
    expect(m.remaining_hours).toBe(1500); // 10000 - 7000 - 1500
    expect(m.remaining_hours_ratio).toBeCloseTo(0.15, 5);
    expect(m.avg_wage_per_hour).toBeCloseTo(60, 5); // 600k / 10k
    expect(m.remaining_hours_euro_impact).toBeCloseTo(90_000, 5);
  });

  it("crasht niet bij deler 0", () => {
    const ds = makeDataset({ revenue: [], paid_hours: [] });
    const m = computeMetrics(ds);
    expect(m.personnel_cost_ratio).toBeUndefined();
    expect(m.direct_hours_ratio).toBeUndefined();
    expect(m.remaining_hours_ratio).toBeUndefined();
  });

  it("negeert invalid records in totalen", () => {
    const ds = makeDataset({
      revenue: [
        { ...base, account_code: "8", account_name: "x", amount: 100, revenue_type: "WLZ" },
        { ...base, import_status: "invalid", account_code: "8", account_name: "x", amount: 999_999, revenue_type: "WLZ" },
      ],
    });
    expect(computeMetrics(ds).totals.revenue).toBe(100);
  });
});

describe("checks - statussen", () => {
  it("geeft groen bij gezonde dataset", () => {
    const results = runChecks(makeDataset());
    const ratio = results.find((r) => r.id === "personnel_cost_ratio")!;
    expect(ratio.status).toBe("groen"); // 70%
    const direct = results.find((r) => r.id === "direct_hours_ratio")!;
    expect(direct.status).toBe("groen"); // 70%
    const rest = results.find((r) => r.id === "remaining_hours_analysis")!;
    expect(rest.status).toBe("groen"); // 15% niet > 15%
  });

  it("oranje en rood drempels personeelslastenratio", () => {
    const orange = runChecks(makeDataset({
      payroll: [{ ...base, payroll_component: "loon", amount: 700_000 }], // 80%
    })).find((r) => r.id === "personnel_cost_ratio")!;
    expect(orange.status).toBe("oranje");

    const red = runChecks(makeDataset({
      payroll: [{ ...base, payroll_component: "loon", amount: 800_000 }], // 90%
    })).find((r) => r.id === "personnel_cost_ratio")!;
    expect(red.status).toBe("rood");
  });

  it("oranje en rood drempels directe urenratio (low)", () => {
    const orange = runChecks(makeDataset({
      direct_hours: [{ ...base, employee_id: "E1", direct_hours: 5_500 }], // 55%
    })).find((r) => r.id === "direct_hours_ratio")!;
    expect(orange.status).toBe("oranje");

    const red = runChecks(makeDataset({
      direct_hours: [{ ...base, employee_id: "E1", direct_hours: 4_000 }], // 40%
    })).find((r) => r.id === "direct_hours_ratio")!;
    expect(red.status).toBe("rood");
  });

  it("oranje en rood drempels resturenratio", () => {
    const orange = runChecks(makeDataset({
      direct_hours: [{ ...base, employee_id: "E1", direct_hours: 6_500 }],
      non_productive_hours: [{ ...base, employee_id: "E1", non_productive_hours: 1_500 }],
    })).find((r) => r.id === "remaining_hours_analysis")!;
    expect(orange.status).toBe("oranje"); // resturen 2000/10000 = 20%

    const red = runChecks(makeDataset({
      direct_hours: [{ ...base, employee_id: "E1", direct_hours: 5_000 }],
      non_productive_hours: [{ ...base, employee_id: "E1", non_productive_hours: 1_000 }],
    })).find((r) => r.id === "remaining_hours_analysis")!;
    expect(red.status).toBe("rood"); // 4000/10000 = 40%
  });
});

describe("checks - grijs bij ontbrekende bronnen", () => {
  it("zorgopbrengsten aansluiting grijs zonder tweede bron", () => {
    const ds = makeDataset({ secondary_totals: {} });
    const r = runChecks(ds).find((x) => x.id === "revenue_reconciliation")!;
    expect(r.status).toBe("grijs");
    expect(r.message).toMatch(/^Niet uitvoerbaar – /);
  });

  it("personeelskosten aansluiting grijs zonder primaire bron", () => {
    const ds = makeDataset({ payroll: [] });
    const r = runChecks(ds).find((x) => x.id === "payroll_reconciliation")!;
    expect(r.status).toBe("grijs");
  });

  it("betaalde uren aansluiting grijs zonder bron", () => {
    const ds = makeDataset({ paid_hours: [] });
    const r = runChecks(ds).find((x) => x.id === "paid_hours_reconciliation")!;
    expect(r.status).toBe("grijs");
  });

  it("ratio's worden grijs bij deler 0 zonder crash", () => {
    const ds = makeDataset({ revenue: [], paid_hours: [] });
    const results = runChecks(ds);
    expect(results.find((r) => r.id === "personnel_cost_ratio")!.status).toBe("grijs");
    expect(results.find((r) => r.id === "direct_hours_ratio")!.status).toBe("grijs");
    expect(results.find((r) => r.id === "remaining_hours_analysis")!.status).toBe("grijs");
  });
});

describe("exacte drempelscenario's (acceptatiecriteria)", () => {
  // Helpers: maak datasets die exact de gewenste ratio produceren.
  // Basis: revenue 1.000.000, paid_hours 10.000.
  const mkPersonnelRatio = (pct: number) => makeDataset({
    payroll: [{ ...base, payroll_component: "loon", amount: pct * 1_000_000 - 100_000 }],
    // external_hire blijft 100_000 → (payroll + 100k) / 1M = pct
  });
  const mkDirectRatio = (pct: number) => makeDataset({
    direct_hours: [{ ...base, employee_id: "E1", direct_hours: pct * 10_000 }],
  });
  const mkRemainingRatio = (pct: number) => makeDataset({
    // resturen = 10000 - direct - 1500 = pct*10000  ⇒ direct = 8500 - pct*10000
    direct_hours: [{ ...base, employee_id: "E1", direct_hours: 8_500 - pct * 10_000 }],
  });

  const statusOf = (ds: Dataset, id: string) =>
    runChecks(ds).find((r) => r.id === id)!.status;

  it("personeelslastenratio: 70% groen, 80% oranje, 90% rood", () => {
    expect(statusOf(mkPersonnelRatio(0.70), "personnel_cost_ratio")).toBe("groen");
    expect(statusOf(mkPersonnelRatio(0.80), "personnel_cost_ratio")).toBe("oranje");
    expect(statusOf(mkPersonnelRatio(0.90), "personnel_cost_ratio")).toBe("rood");
  });

  it("directe urenratio: 70% groen, 55% oranje, 45% rood", () => {
    expect(statusOf(mkDirectRatio(0.70), "direct_hours_ratio")).toBe("groen");
    expect(statusOf(mkDirectRatio(0.55), "direct_hours_ratio")).toBe("oranje");
    expect(statusOf(mkDirectRatio(0.45), "direct_hours_ratio")).toBe("rood");
  });

  it("resturenratio: 10% groen, 20% oranje, 30% rood", () => {
    expect(statusOf(mkRemainingRatio(0.10), "remaining_hours_analysis")).toBe("groen");
    expect(statusOf(mkRemainingRatio(0.20), "remaining_hours_analysis")).toBe("oranje");
    expect(statusOf(mkRemainingRatio(0.30), "remaining_hours_analysis")).toBe("rood");
  });

  it("deling door nul crasht niet en geeft grijs", () => {
    const ds = makeDataset({ revenue: [], paid_hours: [], direct_hours: [], non_productive_hours: [] });
    expect(() => runChecks(ds)).not.toThrow();
    expect(statusOf(ds, "personnel_cost_ratio")).toBe("grijs");
    expect(statusOf(ds, "direct_hours_ratio")).toBe("grijs");
    expect(statusOf(ds, "remaining_hours_analysis")).toBe("grijs");
  });

  it("ontbrekende tweede bron geeft exacte melding", () => {
    const ds = makeDataset({ secondary_totals: {} });
    const r = runChecks(ds).find((x) => x.id === "revenue_reconciliation")!;
    expect(r.status).toBe("grijs");
    expect(r.message).toBe("Niet uitvoerbaar – tweede bron zorgopbrengsten ontbreekt");
  });
});

describe("summarize", () => {
  it("rekent grijze controles niet mee in score", () => {
    const ds = makeDataset({ secondary_totals: {} }); // 3 aansluitingen worden grijs
    const results = runChecks(ds);
    const s = summarize(results);
    expect(s.grijs).toBeGreaterThan(0);
    const scored = s.groen + s.oranje + s.rood;
    expect(s.score).toBeCloseTo((s.groen + 0.5 * s.oranje) / scored, 5);
  });
});
