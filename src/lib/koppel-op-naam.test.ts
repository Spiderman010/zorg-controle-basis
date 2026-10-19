import { describe, it, expect } from "vitest";
import { normaliseerNaam, voorstelOpNaam, koppelMedewerker } from "./koppel-op-naam";

// Fictief: "Zorg Voorbeeld BV" met kostenplaatsen Zvw-team en Wmo-team.
const projecten = [
  { id: "A", naam: "Zvw-team" },
  { id: "B", naam: "Wmo-team" },
];

describe("normaliseerNaam", () => {
  it("is hoofdletter- en spatieongevoelig", () => {
    expect(normaliseerNaam("  Zvw-team ")).toBe(normaliseerNaam("zvw-team"));
    expect(normaliseerNaam("Wmo   Team")).toBe("wmo team");
  });
});

describe("voorstelOpNaam (Zorg Voorbeeld BV)", () => {
  it("koppelt op naam, ongeacht hoofdletters en spaties", () => {
    const v = voorstelOpNaam(["zvw-team", " ZVW-TEAM ", "Wmo-Team"], projecten);
    expect(v.toewijzingen).toEqual({ 0: "A", 1: "A", 2: "B" });
    expect(v.gekoppeld).toBe(3);
    expect(v.geenMatch).toEqual([]);
  });

  it("overschrijft nooit een bestaande koppeling", () => {
    const v = voorstelOpNaam(["Zvw-team", "Zvw-team"], projecten, { 0: "B" });
    expect(v.toewijzingen).toEqual({ 1: "A" });
    expect(v.bestond).toBe(1);
  });

  it("laat namen zonder passende kostenplaats staan en noemt ze één keer", () => {
    const v = voorstelOpNaam(["Onbekend team", "onbekend team", "Zvw-team"], projecten);
    expect(v.geenMatch).toEqual(["Onbekend team"]);
    expect(v.toewijzingen).toEqual({ 2: "A" });
  });

  it("kiest niets als twee kostenplaatsen dezelfde naam hebben", () => {
    const v = voorstelOpNaam(["Zvw-team"], [{ id: "A", naam: "Zvw-team" }, { id: "C", naam: "zvw-team" }]);
    expect(v.toewijzingen).toEqual({});
    expect(v.onduidelijk).toBe(1);
  });

  it("telt lege cellen apart en koppelt die niet", () => {
    const v = voorstelOpNaam(["", undefined, "   ", "Wmo-team"], projecten);
    expect(v.toewijzingen).toEqual({ 3: "B" });
    expect(v.leeg).toBe(3);
  });
});

describe("koppelMedewerker (directe uren, Zorg Voorbeeld BV)", () => {
  it("koppelt alle regels van de medewerker aan één kostenplaats", () => {
    const medewerkers = ["Team Zvw", "Team Wmo", "team zvw", "Team Zvw"];
    const r = koppelMedewerker(medewerkers, "Team Zvw", "A", {});
    expect(r.toewijzingen).toEqual({ 0: "A", 2: "A", 3: "A" });
    expect(r.gekoppeld).toBe(3);
    expect(r.bestond).toBe(0);
  });

  it("laat bestaande koppelingen van die medewerker staan", () => {
    const medewerkers = ["Team Zvw", "Team Zvw", "Team Wmo"];
    const r = koppelMedewerker(medewerkers, "Team Zvw", "A", { 1: "B" });
    expect(r.toewijzingen).toEqual({ 0: "A", 1: "B" });
    expect(r.gekoppeld).toBe(1);
    expect(r.bestond).toBe(1);
  });

  it("doet niets bij een lege medewerker", () => {
    const r = koppelMedewerker(["Team Zvw", ""], "", "A", { 0: "B" });
    expect(r.toewijzingen).toEqual({ 0: "B" });
    expect(r.gekoppeld).toBe(0);
  });
});
