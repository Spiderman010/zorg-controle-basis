import { describe, it, expect } from "vitest";
import { parseGetal, upsertBron, type BronBestand } from "./bronnen";
import { buildDataset } from "./datasetBuilder";

describe("parseGetal", () => {
  const gevallen: [string, number][] = [
    ["1500.00", 1500], ["1.500,00", 1500], ["1500,00", 1500], ["7.5", 7.5], ["7,5", 7.5],
    ["12345.67", 12345.67], ["1.234.567,89", 1234567.89], ["1,234.56", 1234.56],
    ["1.500", 1500], ["0.125", 0.125], ["-1.234,56", -1234.56], ["1.234,56-", -1234.56],
    ["€ 1.500,00", 1500], ["  42 ", 42], ["0", 0],
  ];
  it.each(gevallen)("%s wordt %s", (invoer, verwacht) => expect(parseGetal(invoer)).toBeCloseTo(verwacht, 6));
  it("geeft NaN als het geen getal is", () => {
    for (const s of ["", "  ", "abc", "n.v.t.", "1,2,3", "12abc"]) expect(parseGetal(s)).toBeNaN();
    expect(parseGetal(undefined)).toBeNaN();
  });
});

const bron = (id: string, type: BronBestand["type"], headers: string[], rijen: string[][], mapping: Record<string, string>): BronBestand => ({
  id, dossier_id: "getal-dossier", bestandsnaam: id, geupload_op: "", type, type_auto_herkend: false, type_bevestigd: true,
  headers, rijen, preview_rows: 5, mapping,
});

describe("datasetBuilder leest getallen uit PDF en Excel goed", () => {
  it("bedrag en uren met decimale punt worden niet 10 of 100 keer te groot", () => {
    upsertBron(bron("omzet", "zorgopbrengsten", ["Periode", "Bedrag", "Rekening"],
      [["2026-09", "1500.00", "8000"], ["2026-09", "1.500,00", "8000"], ["2026-09", "1500,00", "8000"]],
      { periode: "Periode", bedrag: "Bedrag", rekening_of_categorie: "Rekening" }));
    upsertBron(bron("uren", "directe_uren", ["Periode", "Medewerker", "Uren"],
      [["2026-09", "A", "7.5"], ["2026-09", "B", "7,5"]],
      { periode: "Periode", medewerker: "Medewerker", directe_uren: "Uren" }));
    const { dataset } = buildDataset("getal-dossier");
    expect(dataset.revenue?.map((r) => r.amount)).toEqual([1500, 1500, 1500]);
    expect(dataset.direct_hours?.map((r) => r.direct_hours)).toEqual([7.5, 7.5]);
  });
});
