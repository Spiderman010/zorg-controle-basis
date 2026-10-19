import { describe, expect, it } from "vitest";
import type { Dataset, DirectHoursRecord, RevenueRecord } from "../types";
import {
  computeSollOmzet,
  sollOmzetCheck,
  type ProjectDefMetTarief,
} from "../sollomzet";
import { ALGEMEEN_PROJECT_ID } from "../projecten";
import { CORE_CHECK_IDS, runChecks, summarize } from "../checks";

const base = {
  dossier_id: "d1",
  period: "2026-06",
  source_file: "test.csv",
  import_status: "valid" as const,
};

function rev(amount: number, project_id?: string): RevenueRecord {
  return { ...base, account_code: "", account_name: "", revenue_type: "wlz", amount, project_id };
}
function dir(direct_hours: number, project_id?: string): DirectHoursRecord {
  return { ...base, employee_id: "m1", direct_hours, project_id };
}

const PROJECTEN: ProjectDefMetTarief[] = [
  { id: "p1", naam: "WLZ", tarief: 100 },
  { id: "p2", naam: "WMO", tarief: 80 },
];

describe("computeSollOmzet", () => {
  it("berekent soll per project en afwijking op totaal", () => {
    const ds: Dataset = {
      revenue: [rev(60000, "p1"), rev(33600, "p2")],
      direct_hours: [dir(600, "p1"), dir(400, "p2")],
    };
    const r = computeSollOmzet(ds, { projecten: PROJECTEN });
    expect(r.uitvoerbaar).toBe(true);
    expect(r.totaal_soll).toBe(600 * 100 + 400 * 80); // 92.000
    expect(r.totaal_ist).toBe(93600);
    expect(r.afwijking).toBeCloseTo((93600 - 92000) / 92000);
    const p2 = r.regels.find((x) => x.project_id === "p2")!;
    expect(p2.soll).toBe(32000);
    expect(p2.afwijking).toBeCloseTo(0.05);
  });

  it("standaardtarief dekt Algemeen en projecten zonder eigen tarief", () => {
    const ds: Dataset = {
      revenue: [rev(10500)],
      direct_hours: [dir(100)],
    };
    const r = computeSollOmzet(ds, { standaard_tarief: 100 });
    expect(r.uitvoerbaar).toBe(true);
    expect(r.totaal_soll).toBe(10000);
    expect(r.regels[0].project_id).toBe(ALGEMEEN_PROJECT_ID);
    expect(r.afwijking).toBeCloseTo(0.05);
  });

  it("niet uitvoerbaar zonder dekkend tarief, met uren zonder tarief in de melding", () => {
    const ds: Dataset = {
      revenue: [rev(1000, "p1"), rev(500)],
      direct_hours: [dir(10, "p1"), dir(5)],
    };
    // p1 heeft tarief, maar Algemeen (5 uren) niet en er is geen standaardtarief
    const r = computeSollOmzet(ds, { projecten: PROJECTEN });
    expect(r.uitvoerbaar).toBe(false);
    expect(r.uren_zonder_tarief).toBe(5);
    expect(r.reden_niet_uitvoerbaar).toContain("5");
  });

  it("niet uitvoerbaar zonder directe uren of zonder opbrengsten", () => {
    expect(computeSollOmzet({ revenue: [rev(100)] }, { standaard_tarief: 90 }).uitvoerbaar).toBe(false);
    expect(computeSollOmzet({ direct_hours: [dir(10)] }, { standaard_tarief: 90 }).uitvoerbaar).toBe(false);
  });

  it("negatieve correctie-uren zonder tarief maken de controle grijs (geen stille nettering)", () => {
    const ds: Dataset = {
      revenue: [rev(10000, "p1"), rev(500)],
      direct_hours: [dir(100, "p1"), dir(-5)],
    };
    // p1 heeft tarief; Algemeen heeft -5 correctie-uren zonder tarief.
    const r = computeSollOmzet(ds, { projecten: PROJECTEN });
    expect(r.uitvoerbaar).toBe(false);
    expect(r.uren_zonder_tarief).toBe(5);
    expect(r.reden_niet_uitvoerbaar).toContain("uurtarief ontbreekt");
  });

  it("negeert ongeldig tarief (0, negatief, NaN)", () => {
    const ds: Dataset = { revenue: [rev(100, "p1")], direct_hours: [dir(10, "p1")] };
    for (const t of [0, -5, NaN]) {
      const r = computeSollOmzet(ds, { projecten: [{ id: "p1", naam: "X", tarief: t }] });
      expect(r.uitvoerbaar).toBe(false);
    }
  });
});

describe("sollOmzetCheck (V1-C09)", () => {
  const ds = (istFactor: number): Dataset => ({
    revenue: [rev(10000 * istFactor)],
    direct_hours: [dir(100)],
  });
  const cfg = { standaard_tarief: 100 }; // soll = 10.000

  it("grijs zonder tarief; telt niet mee in de score", () => {
    const checks = runChecks({ revenue: [rev(100)], direct_hours: [dir(10)] });
    const c = checks.find((x) => x.id === "soll_omzet_check")!;
    expect(c.status).toBe("grijs");
    const s = summarize(checks);
    expect(s.total).toBe(10);
    expect(s.grijs).toBeGreaterThan(0);
  });

  it("groen binnen ±5%", () => {
    expect(sollOmzetCheck(ds(1.0), cfg).status).toBe("groen");
    expect(sollOmzetCheck(ds(1.05), cfg).status).toBe("groen");
    expect(sollOmzetCheck(ds(0.95), cfg).status).toBe("groen");
  });

  it("oranje tussen 5% en 10%, beide richtingen", () => {
    expect(sollOmzetCheck(ds(1.07), cfg).status).toBe("oranje");
    expect(sollOmzetCheck(ds(0.92), cfg).status).toBe("oranje");
  });

  it("rood boven 10%", () => {
    expect(sollOmzetCheck(ds(1.12), cfg).status).toBe("rood");
    expect(sollOmzetCheck(ds(0.85), cfg).status).toBe("rood");
  });

  it("staat in CORE_CHECK_IDS en telt mee zodra uitvoerbaar", () => {
    expect(CORE_CHECK_IDS).toContain("soll_omzet_check");
    const checks = runChecks(ds(1.0), { soll: cfg });
    const s = summarize(checks);
    const c = checks.find((x) => x.id === "soll_omzet_check")!;
    expect(c.status).toBe("groen");
    expect(s.total).toBe(10);
  });

  it("bestaande 8 controles veranderen niet door de soll-optie", () => {
    const dsx: Dataset = { revenue: [rev(100)], payroll: [{ ...base, payroll_component: "loon", amount: 70 }] };
    const zonder = runChecks(dsx).filter((c) => c.id !== "soll_omzet_check");
    const met = runChecks(dsx, { soll: { standaard_tarief: 100 } }).filter((c) => c.id !== "soll_omzet_check");
    expect(met).toEqual(zonder);
  });
});
