import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import ToewijzingPaneel from "./ToewijzingPaneel";
import { upsertBron, getBron, type BronBestand } from "@/lib/bronnen";
import { addProject } from "@/lib/projecten";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DOSSIER = "paneel-dossier";
const bron = (): BronBestand => ({
  id: "paneel-bron", dossier_id: DOSSIER, bestandsnaam: "Declaratie september.csv", geupload_op: "",
  type: "gedeclareerde_uren", type_auto_herkend: true, type_bevestigd: true,
  headers: ["Periode", "Stroom", "Gedeclareerde minuten"],
  rijen: [["2026-09", "Zvw", "25200"], ["2026-09", "Wmo", "19800"], ["2026-09", "Wlz verblijf", "31"]],
  preview_rows: 5,
  mapping: { periode: "Periode", gedeclareerde_uren: "Gedeclareerde minuten", financieringsstroom: "Stroom" },
});

describe("ToewijzingPaneel (fictief dossier)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const toon = (b: BronBestand, onChange: () => void = () => {}) => act(() => root.render(<ToewijzingPaneel bron={b} onChange={onChange} />));

  it("toont de uren per regel en wat nog gekoppeld moet worden", () => {
    upsertBron(bron());
    toon(bron());
    const tekst = container.textContent ?? "";
    expect(tekst).toContain("420");
    expect(tekst).toContain("330");
    expect(tekst).toContain("niet in uren");
    expect(tekst).toContain("Nog 3 zonder kostenplaats");
  });

  it("koppelt met één klik op stroom en slaat dat op", () => {
    addProject(DOSSIER, "Zvw-team", "zvw", undefined, "opdrachtgever");
    addProject(DOSSIER, "Wmo-team", "wmo", undefined, "opdrachtgever");
    upsertBron(bron());
    let gewijzigd = 0;
    toon(bron(), () => gewijzigd++);
    const knop = Array.from(container.querySelectorAll("button")).find((b) => /Koppel automatisch op stroom/.test(b.textContent ?? ""));
    expect(knop).toBeTruthy();
    act(() => knop!.click());
    expect(Object.keys(getBron("paneel-bron")?.projecttoewijzingen ?? {})).toEqual(["0", "1"]);
    expect(gewijzigd).toBe(1);
    const melding = container.querySelector('[role="status"]')?.textContent ?? "";
    expect(melding).toContain("2 regel(s) gekoppeld op stroom.");
  });

  it("vraagt om eerst de kolommen te koppelen als dat nog niet is gebeurd", () => {
    toon({ ...bron(), mapping: {} });
    expect(container.textContent).toContain("Koppel eerst de verplichte kolommen");
  });
});
