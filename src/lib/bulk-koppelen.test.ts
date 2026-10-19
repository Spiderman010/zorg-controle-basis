import { describe, it, expect } from "vitest";
import { bulkKoppelen, bulkBevestigingTekst } from "./bulk-koppelen";

// Fictief: "Zorg Voorbeeld BV", vier regels in een bronbestand.
describe("bulkactie alle regels naar kostenplaats (Zorg Voorbeeld BV)", () => {
  it("zonder bestaande koppelingen: alle regels gekoppeld, niets overschreven", () => {
    const r = bulkKoppelen(4, "A", {});
    expect(r.toewijzingen).toEqual({ 0: "A", 1: "A", 2: "A", 3: "A" });
    expect(r.overschreven).toBe(0);
  });

  it("telt de regels met een bestaande koppeling die overschreven worden", () => {
    const r = bulkKoppelen(4, "A", { 1: "B", 3: "C" });
    expect(r.toewijzingen).toEqual({ 0: "A", 1: "A", 2: "A", 3: "A" });
    expect(r.overschreven).toBe(2);
  });

  it("naar Algemeen haalt de koppelingen weg en telt die als overschreven", () => {
    const r = bulkKoppelen(4, null, { 0: "A", 2: "B" });
    expect(r.toewijzingen).toEqual({});
    expect(r.overschreven).toBe(2);
  });

  it("de bevestigingstekst noemt het aantal in gewone taal", () => {
    expect(bulkBevestigingTekst(1)).toBe("1 regel heeft al een kostenplaats. Overschrijven?");
    expect(bulkBevestigingTekst(12)).toBe("12 regels hebben al een kostenplaats. Overschrijven?");
  });
});
