import { describe, it, expect } from "vitest";
import { voorstelToewijzing } from "./uren-toewijzing";
import type { GedeclareerdeUrenRegel } from "./bronnen";

const regel = (i: number, stroom?: string): GedeclareerdeUrenRegel => ({
  regel: i, periode: "2026-09", aantal: 10, eenheid: "uren", eenheidBron: "gekozen", uren: 10, stroom, toepasbaar: "ja",
});

describe("kostenplaats voorstellen op basis van de stroom", () => {
  const projecten = [{ id: "zvw1", stroom: "zvw" }, { id: "wmo1", stroom: "wmo" }, { id: "pgb1", stroom: "pgb" }];
  it("koppelt een regel aan de enige kostenplaats met dezelfde stroom", () => {
    const v = voorstelToewijzing([regel(0, "Zvw wijkverpleging"), regel(1, "Wmo"), regel(2, "PGB")], projecten);
    expect(v.toewijzingen).toEqual({ 0: "zvw1", 1: "wmo1", 2: "pgb1" });
    expect(v.onduidelijk).toBe(0);
    expect(v.zonderMatch).toBe(0);
  });
  it("kiest niet zelf als er meerdere kostenplaatsen passen", () => {
    const v = voorstelToewijzing([regel(0, "Zvw")], [...projecten, { id: "zvw2", stroom: "zvw" }]);
    expect(v.toewijzingen).toEqual({});
    expect(v.onduidelijk).toBe(1);
  });
  it("telt regels zonder passende kostenplaats of zonder stroom", () => {
    const v = voorstelToewijzing([regel(0, "Wlz"), regel(1, undefined), regel(2, "onzin")], projecten);
    expect(v.toewijzingen).toEqual({});
    expect(v.zonderMatch).toBe(3);
  });
  it("laat bestaande koppelingen met rust", () => {
    const v = voorstelToewijzing([regel(0, "Wmo"), regel(1, "Wmo")], projecten, { 0: "handmatig" });
    expect(v.toewijzingen).toEqual({ 1: "wmo1" });
  });
  it("slaat regels over die niet in uren zijn", () => {
    const r = { ...regel(0, "Wlz verblijf"), toepasbaar: "nee" as const, uren: undefined };
    expect(voorstelToewijzing([r], [{ id: "wlz1", stroom: "wlz" }]).toewijzingen).toEqual({});
  });
});
