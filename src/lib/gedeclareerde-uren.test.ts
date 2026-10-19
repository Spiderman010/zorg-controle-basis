import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  ALLE_BRONTYPEN, detectBronType, herkenEenheid, leesGedeclareerdeUren, naarUren, parseCSV, parseExcel,
  suggestMapping, valideerBron, type BronBestand,
} from "./bronnen";

const maakBron = (headers: string[], rijen: string[][], mapping?: Record<string, string>): BronBestand => ({
  id: "x", dossier_id: "d", bestandsnaam: "declaratie.csv", geupload_op: "", type: "gedeclareerde_uren",
  type_auto_herkend: true, type_bevestigd: false, headers, rijen, preview_rows: 5, mapping,
});

describe("eenheden", () => {
  it("herkent eenheden uit tekst", () => {
    for (const t of ["uren", "Uur", "u", "Gedeclareerde uren"]) expect(herkenEenheid(t)).toBe("uren");
    for (const t of ["minuten", "min", "Gedeclareerde minuten"]) expect(herkenEenheid(t)).toBe("minuten");
    for (const t of ["5 minuten", "5-minuten", "vijfminuten", "eenheden van 5 minuten"]) expect(herkenEenheid(t)).toBe("vijfminuten");
    for (const t of ["dagen", "dag", "etmaal"]) expect(herkenEenheid(t)).toBe("dagen");
    expect(herkenEenheid("stuks")).toBeUndefined();
    expect(herkenEenheid(undefined)).toBeUndefined();
  });
  it("rekent om naar uren", () => {
    expect(naarUren(25200, "minuten")).toBe(420);
    expect(naarUren(2400, "vijfminuten")).toBe(200);
    expect(naarUren(12, "uren")).toBe(12);
    expect(naarUren(3, "dagen")).toBeUndefined();
  });
});

describe("fictief declaratiebestand van Zorg Voorbeeld BV (minuten in de kolomnaam)", () => {
  const { headers, rows } = parseCSV("Periode;Stroom;Gedeclareerde minuten\n2026-09;Zvw;25200\n2026-09;Wmo;19800\n2026-09;Zvw;-600");
  const mapping = suggestMapping("gedeclareerde_uren", headers);
  const bron = maakBron(headers, rows, mapping);
  it("wordt herkend en gekoppeld", () => {
    expect(detectBronType("Declaratie september.csv", headers)).toBe("gedeclareerde_uren");
    expect(mapping).toEqual({ periode: "Periode", gedeclareerde_uren: "Gedeclareerde minuten", financieringsstroom: "Stroom" });
  });
  it("geeft uren in het vaste formaat, met correctie", () => {
    const r = leesGedeclareerdeUren(bron);
    expect(r.map((x) => x.uren)).toEqual([420, 330, -10]);
    expect(r.map((x) => x.stroom)).toEqual(["Zvw", "Wmo", "Zvw"]);
    expect(r.every((x) => x.eenheid === "minuten" && x.eenheidBron === "kolomnaam")).toBe(true);
  });
  it("valideert groen en meldt de eenheid", () => {
    const v = valideerBron(bron);
    expect(v.status).toBe("groen");
    expect(v.signalen.join(" ")).toMatch(/minuten/);
  });
});

describe("eenheid per regel uit een eenheidkolom", () => {
  const headers = ["Periode", "Aantal", "Eenheid"];
  const rijen = [["2026-09", "2400", "5 minuten"], ["2026-09", "12", "uren"], ["2026-09", "3", "dagen"], ["2026-09", "1.234,5", "uren"]];
  const bron = maakBron(headers, rijen, { periode: "Periode", gedeclareerde_uren: "Aantal", eenheid: "Eenheid" });
  it("rekent elke regel in zijn eigen eenheid om", () => {
    expect(leesGedeclareerdeUren(bron).map((x) => x.uren)).toEqual([200, 12, undefined, 1234.5]);
  });
  it("meldt dat dagen niet als uren meetellen", () => {
    expect(valideerBron(bron).signalen.join(" ")).toMatch(/1 regel.*dagen/);
  });
});

describe("randgevallen", () => {
  it("neemt uren aan en waarschuwt als de eenheid niet te herkennen is", () => {
    const bron = maakBron(["Periode", "Aantal"], [["2026-09", "40"]], { periode: "Periode", gedeclareerde_uren: "Aantal" });
    const r = leesGedeclareerdeUren(bron);
    expect(r[0]).toMatchObject({ uren: 40, eenheid: "uren", eenheidBron: "aangenomen" });
    const v = valideerBron(bron);
    expect(v.status).toBe("oranje");
    expect(v.waarschuwingen.join(" ")).toMatch(/Eenheid niet herkend/);
  });
  it("laat een onleesbaar aantal leeg en meldt het", () => {
    const bron = maakBron(["Periode", "Uren"], [["2026-09", "veel"]], { periode: "Periode", gedeclareerde_uren: "Uren" });
    expect(leesGedeclareerdeUren(bron)[0]).toMatchObject({ uren: undefined, reden: "ongeldig" });
    expect(valideerBron(bron).waarschuwingen.join(" ")).toMatch(/geen geldig getal/);
  });
  it("geeft rood als het verplichte veld niet gekoppeld is", () => {
    const v = valideerBron(maakBron(["Periode", "Uren"], [["2026-09", "5"]], {}));
    expect(v.status).toBe("rood");
    expect(v.fouten.join(" ")).toMatch(/Gedeclareerde uren \(aantal\)/);
  });
  it("leest decimalen uit Excel goed (7,5 en 2,25 uur)", async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Periode", "Gedeclareerde uren"], ["2026-09", 7.5], ["2026-09", 2.25]]), "Blad1");
    const { headers, rows } = await parseExcel(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
    const bron = maakBron(headers, rows, suggestMapping("gedeclareerde_uren", headers));
    expect(leesGedeclareerdeUren(bron).map((x) => x.uren)).toEqual([7.5, 2.25]);
  });
});

describe("herkenning en overzicht", () => {
  it("herkent het type ook aan de kolomnaam", () => {
    expect(detectBronType("export.xlsx", ["Periode", "Gedeclareerde uren"])).toBe("gedeclareerde_uren");
  });
  it("haalt andere typen niet door elkaar", () => {
    expect(detectBronType("Declaratie omzet.xlsx", ["Periode", "Bedrag"])).not.toBe("gedeclareerde_uren");
    expect(detectBronType("Directe uren.csv", ["Periode", "Medewerker", "Uren"])).toBe("directe_uren");
  });
  it("telt het nieuwe type mee in de lijst van bronnen", () => {
    expect(ALLE_BRONTYPEN).toHaveLength(7);
    expect(ALLE_BRONTYPEN).toContain("gedeclareerde_uren");
  });
});
