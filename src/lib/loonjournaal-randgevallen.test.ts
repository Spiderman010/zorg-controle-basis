import { describe, it, expect } from "vitest";
import { pdfItemsNaarTabel, suggestMapping, valideerBron, type BronBestand } from "./bronnen";

const r = (y: number, cellen: [string, number][]) => cellen.map(([str, x]) => ({ str, x, y, pagina: 1 }));
const hoofd = r(800, [["Datum: 21 april 2026, 11:22", 50], ["Loonbureau.nl", 350]]);
const kop = r(700, [["Grootboek", 50], ["Omschrijving", 120], ["Debet", 350], ["Credit", 450]]);

describe("loonjournaalpost: randgevallen", () => {
  it("bedrag met min erachter blijft negatief", () => {
    const t = pdfItemsNaarTabel([...hoofd, ...kop, ...r(680, [["4000", 50], ["Correctie", 120], ["1.234,56-", 350]])]);
    expect(t.rows[0]).toEqual(["2026-04", "4000", "Correctie", "-1234.56", ""]);
  });

  it("valt niet terug op het briefhoofd als er geen bedrag herkend wordt", () => {
    const t = pdfItemsNaarTabel([...hoofd, ...kop, ...r(680, [["4000", 50], ["Brutolonen", 120], ["n.v.t.", 350]])]);
    expect(t.headers).toEqual(["Periode", "Grootboek", "Omschrijving", "Debet", "Credit"]);
    expect(t.rows).toEqual([]);
  });

  it("zet een omschrijving zonder rekeningnummer in Omschrijving", () => {
    const t = pdfItemsNaarTabel([...hoofd, ...kop, ...r(680, [["Reiskosten", 120], ["50,00", 350]])]);
    expect(t.rows[0]).toEqual(["2026-04", "", "Reiskosten", "50.00", ""]);
  });

  it("zet een los rekeningnummer in Grootboek", () => {
    const t = pdfItemsNaarTabel([...hoofd, ...kop, ...r(680, [["4000", 50], ["75,00", 350]])]);
    expect(t.rows[0]).toEqual(["2026-04", "4000", "", "75.00", ""]);
  });

  it("laat de kolom Periode weg als het briefhoofd niets bruikbaars heeft, zodat de validatie het meldt", () => {
    const t = pdfItemsNaarTabel([
      ...r(800, [["Werkgever", 50], ["X BV", 350]]),
      ...kop,
      ...r(680, [["4000", 50], ["Brutolonen", 120], ["100,00", 350]]),
    ]);
    expect(t.headers).toEqual(["Grootboek", "Omschrijving", "Debet", "Credit"]);
    expect(t.rows).toEqual([["4000", "Brutolonen", "100.00", ""]]);
    const b: BronBestand = {
      id: "x", dossier_id: "d", bestandsnaam: "Journaalposten.pdf", geupload_op: "", type: "personeelskosten",
      type_auto_herkend: true, type_bevestigd: false, headers: t.headers, rijen: t.rows, preview_rows: 5,
      mapping: suggestMapping("personeelskosten", t.headers),
    };
    expect(valideerBron(b).fouten.join(" ")).toMatch(/periode/);
  });
});
