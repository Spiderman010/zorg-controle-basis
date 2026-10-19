import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { UrenVerbandKaart } from "./UrenVerbandKaart";
import { computeUrenVerband, type Dataset } from "@/core";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const basis = { dossier_id: "d", period: "2026-09", source_file: "t", import_status: "valid" as const };
const projecten = [{ id: "A", naam: "Zvw-team", stroom: "zvw" as const }, { id: "B", naam: "Wmo-team", stroom: "wmo" as const }];

// Fictief: "Zorg Voorbeeld BV" met twee cliënten (rol client, via_id naar de BV).
const bv = { id: "BV", naam: "Zorg Voorbeeld BV", stroom: "zvw" as const, rol: "opdrachtgever", via_id: undefined };
const jansen = { id: "J", naam: "Cliënt Jansen", stroom: "zvw" as const, rol: "client", via_id: "BV" };
const devries = { id: "V", naam: "Cliënt De Vries", stroom: "zvw" as const, rol: "client", via_id: "BV" };
const bvProjecten = [bv, jansen, devries];

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
  const toon = (ds: Dataset) => act(() => root.render(<UrenVerbandKaart resultaat={computeUrenVerband(ds, { projecten })} projecten={projecten} />));
  const toonMet = (ds: Dataset, ps: typeof bvProjecten) =>
    act(() => root.render(<UrenVerbandKaart resultaat={computeUrenVerband(ds, { projecten: ps })} projecten={ps} />));

  it("toont per kostenplaats uren, afwijking en status, en dat het in de hoofdscore meetelt", () => {
    toon({
      direct_hours: [{ ...basis, employee_id: "m", direct_hours: 300, project_id: "B" }, { ...basis, employee_id: "m", direct_hours: 421, project_id: "A" }],
      declared_hours: [{ ...basis, declared_hours: 330, in_hours: "ja", project_id: "B" }, { ...basis, declared_hours: 420, in_hours: "ja", project_id: "A" }],
    });
    const t = container.textContent ?? "";
    expect(t).toContain("Zvw-team");
    expect(t).toContain("+10%");
    expect(t).toContain("Te veel gedeclareerd");
    expect(t).toContain("Telt mee in de hoofdscore");
    expect(container.querySelector('[data-status="Rood"]')).toBeTruthy();
  });

  it("legt uit waarom de controle grijs is", () => {
    toon({ direct_hours: [{ ...basis, employee_id: "m", direct_hours: 10 }] });
    expect(container.textContent).toContain("Niet uitvoerbaar: gedeclareerde uren ontbreekt");
  });

  it("toont bij een afwijkende kostenplaats een wat-nu-zin", () => {
    toon({
      direct_hours: [{ ...basis, employee_id: "m", direct_hours: 300, project_id: "B" }],
      declared_hours: [{ ...basis, declared_hours: 330, in_hours: "ja", project_id: "B" }],
    });
    expect(container.textContent).toContain("Wat nu?");
  });

  it("toont de cliënten van een afwijkende kostenplaats onder die kostenplaats", () => {
    // BV zelf: 100 gewerkt, 150 gedeclareerd (rood). Jansen: 100/130 (rood). De Vries: 50 gewerkt, niets gedeclareerd (oranje).
    toonMet(
      {
        direct_hours: [
          { ...basis, employee_id: "m", direct_hours: 100, project_id: "BV" },
          { ...basis, employee_id: "m", direct_hours: 100, project_id: "J" },
          { ...basis, employee_id: "m", direct_hours: 50, project_id: "V" },
        ],
        declared_hours: [
          { ...basis, declared_hours: 150, in_hours: "ja", project_id: "BV" },
          { ...basis, declared_hours: 130, in_hours: "ja", project_id: "J" },
        ],
      },
      bvProjecten,
    );
    const genest = container.querySelectorAll('tr[data-nested="ja"]');
    expect(genest.length).toBe(2);
    expect(genest[0].textContent).toContain("Cliënt Jansen");
    expect(genest[1].textContent).toContain("Cliënt De Vries");
    expect(container.textContent).toContain("Gewerkt zonder declaratie");
  });

  it("toont cliënten van een groene kostenplaats gewoon in de lijst, met de opdrachtgever erbij, en laat ze niet weg", () => {
    // BV zelf groen (100/100). Jansen blijft rood: die mag niet verdwijnen.
    toonMet(
      {
        direct_hours: [
          { ...basis, employee_id: "m", direct_hours: 100, project_id: "BV" },
          { ...basis, employee_id: "m", direct_hours: 100, project_id: "J" },
        ],
        declared_hours: [
          { ...basis, declared_hours: 100, in_hours: "ja", project_id: "BV" },
          { ...basis, declared_hours: 130, in_hours: "ja", project_id: "J" },
        ],
      },
      bvProjecten,
    );
    expect(container.querySelectorAll('tr[data-nested="ja"]').length).toBe(0);
    const t = container.textContent ?? "";
    expect(t).toContain("Cliënt Jansen");
    expect(t).toContain("via Zorg Voorbeeld BV");
    expect(container.querySelector('tr[data-regel="J"] [data-status="Rood"]')).toBeTruthy();
  });
});
