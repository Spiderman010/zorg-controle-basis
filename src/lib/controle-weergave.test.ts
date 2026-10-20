import { describe, it, expect } from "vitest";
import { resturenTonen } from "./controle-weergave";
import { computeMetrics, type Dataset } from "@/core";

// Fictief: "Zorg Voorbeeld BV", september 2026.
const basis = { dossier_id: "vb", period: "2026-09", source_file: "t", import_status: "valid" as const };

describe("resturen-tegels (Zorg Voorbeeld BV)", () => {
  it("zonder betaalde uren is er geen getal om te tonen", () => {
    const ds: Dataset = {
      direct_hours: [{ ...basis, employee_id: "m", direct_hours: 421, project_id: "A" }],
    };
    expect(resturenTonen(ds)).toBeNull();
  });

  it("met betaalde uren van 0 is er ook geen getal om te tonen", () => {
    const ds: Dataset = {
      paid_hours: [{ ...basis, employee_id: "m", paid_hours: 0 }],
      direct_hours: [{ ...basis, employee_id: "m", direct_hours: 421, project_id: "A" }],
    };
    expect(resturenTonen(ds)).toBeNull();
  });

  it("met betaalde uren geeft het de resturen die de berekening ook gebruikt", () => {
    const ds: Dataset = {
      paid_hours: [{ ...basis, employee_id: "m", paid_hours: 500 }],
      direct_hours: [{ ...basis, employee_id: "m", direct_hours: 421, project_id: "A" }],
    };
    expect(resturenTonen(ds)).toBe(computeMetrics(ds).remaining_hours);
    expect(resturenTonen(ds)).toBe(79);
  });
});
