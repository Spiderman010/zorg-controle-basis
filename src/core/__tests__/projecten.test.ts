import { describe, expect, it } from "vitest";
import type { Dataset, DirectHoursRecord, ExternalHireRecord, RevenueRecord } from "../types";
import {
  ALGEMEEN_PROJECT_ID,
  computeProjectAnalyse,
  type ProjectDef,
} from "../projecten";
import { runChecks, summarize } from "../checks";

const base = {
  dossier_id: "d1",
  period: "2026-06",
  source_file: "test.csv",
  import_status: "valid" as const,
};

function rev(amount: number, project_id?: string): RevenueRecord {
  return { ...base, account_code: "", account_name: "", revenue_type: "wlz", amount, project_id };
}
function hire(amount: number, project_id?: string): ExternalHireRecord {
  return { ...base, vendor_name: "zzp", amount, project_id };
}
function dir(direct_hours: number, project_id?: string): DirectHoursRecord {
  return { ...base, employee_id: "m1", direct_hours, project_id };
}

const PROJECTEN: ProjectDef[] = [
  { id: "p1", naam: "WLZ zorgkantoor", stroom: "wlz" },
  { id: "p2", naam: "WMO gemeente" },
];

describe("computeProjectAnalyse", () => {
  it("verdeelt opbrengsten, inhuur en uren per project met aandelen", () => {
    const ds: Dataset = {
      revenue: [rev(60000, "p1"), rev(40000, "p2")],
      external_hire: [hire(5000, "p1")],
      direct_hours: [dir(600, "p1"), dir(400, "p2")],
    };
    const a = computeProjectAnalyse(ds, PROJECTEN);
    expect(a).toHaveLength(2);
    const p1 = a.find((x) => x.project_id === "p1")!;
    expect(p1.naam).toBe("WLZ zorgkantoor");
    expect(p1.stroom).toBe("wlz");
    expect(p1.revenue).toBe(60000);
    expect(p1.revenue_share).toBeCloseTo(0.6);
    expect(p1.external_hire).toBe(5000);
    expect(p1.direct_hours).toBe(600);
    expect(p1.direct_hours_share).toBeCloseTo(0.6);
    expect(p1.revenue_per_direct_hour).toBeCloseTo(100);
  });

  it("niet-toegewezen en onbekende project_id's vallen onder Algemeen", () => {
    const ds: Dataset = {
      revenue: [rev(100, "p1"), rev(50), rev(25, "verwijderd-project")],
    };
    const a = computeProjectAnalyse(ds, PROJECTEN);
    const alg = a.find((x) => x.project_id === ALGEMEEN_PROJECT_ID)!;
    expect(alg.revenue).toBe(75);
    // Som over projecten == dossiertotaal
    expect(a.reduce((s, x) => s + x.revenue, 0)).toBe(175);
  });

  it("Algemeen staat als laatste; projecten volgen definitievolgorde", () => {
    const ds: Dataset = { revenue: [rev(10), rev(20, "p2"), rev(30, "p1")] };
    const a = computeProjectAnalyse(ds, PROJECTEN);
    expect(a.map((x) => x.project_id)).toEqual(["p1", "p2", ALGEMEEN_PROJECT_ID]);
  });

  it("projecten zonder data verschijnen niet", () => {
    const ds: Dataset = { revenue: [rev(100, "p1")] };
    const a = computeProjectAnalyse(ds, PROJECTEN);
    expect(a.map((x) => x.project_id)).toEqual(["p1"]);
  });

  it("deling door nul: opbrengst per uur undefined zonder directe uren", () => {
    const ds: Dataset = { revenue: [rev(100, "p1")] };
    const a = computeProjectAnalyse(ds, PROJECTEN);
    expect(a[0].revenue_per_direct_hour).toBeUndefined();
  });

  it("aandelen undefined als totaal 0 (geen deling door nul)", () => {
    const ds: Dataset = { revenue: [rev(100, "p1"), rev(-100, "p2")] };
    const a = computeProjectAnalyse(ds, PROJECTEN);
    for (const x of a) expect(x.revenue_share).toBeUndefined();
  });

  it("negeert invalid records", () => {
    const bad: RevenueRecord = { ...rev(999, "p1"), import_status: "invalid" };
    const a = computeProjectAnalyse({ revenue: [bad] }, PROJECTEN);
    expect(a).toHaveLength(0);
  });

  it("lege dataset geeft lege analyse", () => {
    expect(computeProjectAnalyse({}, PROJECTEN)).toHaveLength(0);
    expect(computeProjectAnalyse({}, [])).toHaveLength(0);
  });

  it("dubbele project-id telt maar één keer mee; som blijft dossiertotaal", () => {
    const ds: Dataset = { revenue: [rev(100, "p1")] };
    const dubbel: ProjectDef[] = [
      { id: "p1", naam: "A" },
      { id: "p1", naam: "B" },
    ];
    const a = computeProjectAnalyse(ds, dubbel);
    expect(a).toHaveLength(1);
    expect(a[0].naam).toBe("A");
    expect(a.reduce((s, x) => s + x.revenue, 0)).toBe(100);
  });

  it("project-id 'algemeen' botst niet met het pseudo-project; som blijft dossiertotaal", () => {
    const ds: Dataset = { revenue: [rev(100, ALGEMEEN_PROJECT_ID), rev(50)] };
    const botsend: ProjectDef[] = [{ id: ALGEMEEN_PROJECT_ID, naam: "X" }];
    const a = computeProjectAnalyse(ds, botsend);
    expect(a).toHaveLength(1);
    expect(a[0].project_id).toBe(ALGEMEEN_PROJECT_ID);
    expect(a[0].revenue).toBe(150);
    expect(a.reduce((s, x) => s + x.revenue, 0)).toBe(150);
  });

  it("beïnvloedt de hoofdscore niet", () => {
    const ds: Dataset = { revenue: [rev(100, "p1"), rev(50)] };
    const zonder = summarize(runChecks(ds));
    computeProjectAnalyse(ds, PROJECTEN);
    const met = summarize(runChecks(ds));
    expect(met).toEqual(zonder);
    expect(met.total).toBe(8);
  });
});
