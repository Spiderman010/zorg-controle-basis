import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { UrenVerbandKaart } from "./UrenVerbandKaart";
import { computeUrenVerband } from "@/core";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const basis = { dossier_id: "d", period: "2026-09", source_file: "t", import_status: "valid" as const };
const projecten = [{ id: "B", naam: "Wmo-team", stroom: "wmo" as const }];

describe("UrenVerbandKaart met herkomst (Zorg Voorbeeld BV)", () => {
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

  it("toont onderaan de regel met het bewijsniveau van de uren-bronnen, zonder de uitkomst te veranderen", () => {
    const resultaat = computeUrenVerband(
      {
        direct_hours: [{ ...basis, employee_id: "m", direct_hours: 300, project_id: "B" }],
        declared_hours: [{ ...basis, declared_hours: 330, in_hours: "ja", project_id: "B" }],
      },
      { projecten },
    );
    const regel = "Gedeclareerde uren: Hoog, zelf opgehaald uit Voorbeeldsysteem, 01-10-2026. Directe uren: Herkomst niet vastgelegd.";
    act(() => root.render(<UrenVerbandKaart resultaat={resultaat} projecten={projecten} herkomstRegel={regel} />));
    expect(container.textContent).toContain(regel);
    expect(container.querySelector('[data-status="Rood"]')).toBeTruthy();
  });
});
