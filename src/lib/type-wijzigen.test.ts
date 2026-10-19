import { describe, it, expect } from "vitest";
import { wijzigBronType, valideerBron, type BronBestand } from "./bronnen";

// Situatie uit de praktijk: het declaratiebestand stond eerst als "Betaalde uren" opgeslagen.
const oud = (): BronBestand => ({
  id: "x", dossier_id: "d", bestandsnaam: "Declaratie september.csv", geupload_op: "",
  type: "betaalde_uren", type_auto_herkend: false, type_bevestigd: true,
  headers: ["Periode", "Stroom", "Gedeclareerde minuten"],
  rijen: [["2026-09", "Zvw wijkverpleging", "25200"], ["2026-09", "Wmo", "19800"]],
  preview_rows: 5,
  mapping: { periode: "Periode", betaalde_uren: "Gedeclareerde minuten" },
  classificaties: { 0: "direct" },
  projecttoewijzingen: { 0: "p1" },
  eenheid: "uren",
});

describe("type van een bron wijzigen", () => {
  it("bepaalt de koppeling opnieuw voor het nieuwe type", () => {
    const n = wijzigBronType(oud(), "gedeclareerde_uren");
    expect(n.type).toBe("gedeclareerde_uren");
    expect(n.mapping).toEqual({ periode: "Periode", gedeclareerde_uren: "Gedeclareerde minuten", financieringsstroom: "Stroom" });
    expect(n.mapping).not.toHaveProperty("betaalde_uren");
  });
  it("wist wat bij het oude type hoorde (classificaties, toewijzingen, gekozen eenheid)", () => {
    const n = wijzigBronType(oud(), "gedeclareerde_uren");
    expect(n.classificaties).toBeUndefined();
    expect(n.projecttoewijzingen).toBeUndefined();
    expect(n.eenheid).toBeUndefined();
  });
  it("markeert het type als bevestigd en niet meer als automatisch herkend", () => {
    const n = wijzigBronType({ ...oud(), type_auto_herkend: true, type_bevestigd: false }, "gedeclareerde_uren");
    expect(n).toMatchObject({ type_auto_herkend: false, type_bevestigd: true });
  });
  it("laat de bron na de wijziging groen valideren en de eenheid herkennen", () => {
    const v = valideerBron(wijzigBronType(oud(), "gedeclareerde_uren"));
    expect(v.status).toBe("groen");
    expect(v.signalen.join(" ")).toMatch(/minuten/);
  });
  it("laat alles staan als het type niet verandert", () => {
    const n = wijzigBronType({ ...oud(), type: "betaalde_uren", type_bevestigd: false }, "betaalde_uren");
    expect(n.mapping).toEqual({ periode: "Periode", betaalde_uren: "Gedeclareerde minuten" });
    expect(n.classificaties).toEqual({ 0: "direct" });
    expect(n.type_bevestigd).toBe(true);
  });
  it("geeft bij 'niet gebruiken' geen koppeling", () => {
    expect(wijzigBronType(oud(), "niet_gebruiken").mapping).toBeUndefined();
  });
});
