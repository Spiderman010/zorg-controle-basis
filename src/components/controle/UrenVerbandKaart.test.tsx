import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { UrenVerbandKaart } from "./UrenVerbandKaart";
import { computeUrenVerband, type Dataset } from "@/core";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const basis = { dossier_id: "d", period: "2026-09", source_file: "t", import_status: "valid" as const };
const projecten = [{ id: "A", naam: "Zvw-team", stroom: "zvw" as const }, { id: "B", naam: "Wmo-team", stroom: "wmo" as const }];

describe("UrenVerbandKaart", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  const toon = (ds: Dataset) => act(() => root.render(<UrenVerbandKaart resultaat={computeUrenVerband(ds, { projecten })} />));

  it("toont per kostenplaats uren, afwijking en status, en dat het in de hoofdscore meetelt", () => {
    toon({
      direct_hours: [{ ...basis, employee_id: "m", direct_hours: 300, project_id: "B" }, { ...basis, employee_id: "m", direct_hours: 421, project_id: "A" }],
      declared_hours: [{ ...basis, declared_hours: 330, in_hours: "ja", project_id: "B" }, { ...basis, declared_hours: 420, in_hours: "ja", project_id: "A" }],
    });
    const t = container.textContent ?? "";
    expect(t).toContain("Zvw-team");
    expect(t).toContain("+10%");
    expect(t).toContain("te veel gedeclareerd");
    expect(t).toContain("Telt mee in de hoofdscore");
    expect(container.querySelector('[data-status="Rood"]')).toBeTruthy();
  });

  it("legt uit waarom de controle grijs is", () => {
    toon({ direct_hours: [{ ...basis, employee_id: "m", direct_hours: 10 }] });
    expect(container.textContent).toContain("Niet uitvoerbaar: gedeclareerde uren ontbreekt");
  });
});
