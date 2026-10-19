import { describe, it, expect } from "vitest";
import { pdfItemsNaarTabel, suggestMapping } from "./bronnen";

const r = (y: number, cellen: [string, number][]) => cellen.map(([str, x]) => ({ str, x, y, pagina: 1 }));

const journaal = [
  ...r(800, [["Datum: 21 april 2026, 11:22", 50], ["Loonbureau.nl", 350]]),
  ...r(785, [["WinSalar v2026.01e", 50], ["Totaal", 350]]),
  ...r(770, [["Werkgever", 50], ["Adequaat Zorg", 350]]),
  ...r(700, [["Grootboek", 50], ["Omschrijving", 120], ["Debet", 350], ["Credit", 450]]),
  ...r(680, [["4000", 50], ["Brutolonen", 120], ["12.500,00", 350]]),
  ...r(665, [["4100", 50], ["Sociale lasten", 120], ["2.100,50", 350]]),
  ...r(650, [["1600", 50], ["Loonheffing", 120], ["3.000,00", 450]]),
  ...r(630, [["Totaal", 50], ["14.600,50", 350], ["14.600,50", 450]]),
];

describe("loonjournaalpost PDF", () => {
  const t = pdfItemsNaarTabel(journaal);

  it("negeert briefhoofd en vindt echte kop", () => {
    expect(t.headers).toEqual(["Periode", "Grootboek", "Omschrijving", "Debet", "Credit"]);
  });
  it("lijnt bedragen uit op Debet/Credit en laat totaal weg", () => {
    expect(t.rows).toEqual([
      ["2026-04", "4000", "Brutolonen", "12500.00", ""],
      ["2026-04", "4100", "Sociale lasten", "2100.50", ""],
      ["2026-04", "1600", "Loonheffing", "", "3000.00"],
    ]);
  });
  it("koppelt Debet als bedrag en Omschrijving als looncomponent", () => {
    expect(suggestMapping("personeelskosten", t.headers)).toEqual({
      periode: "Periode",
      bedrag: "Debet",
      looncomponent: "Omschrijving",
    });
  });
});

describe("loonjournaalpost met kop alleen Debet/Credit", () => {
  const items = [
    ...r(800, [["Datum: 21 april 2026, 11:22", 50], ["Loonbureau.nl", 350]]),
    ...r(700, [["Debet", 350], ["Credit", 450]]),
    ...r(680, [["4000", 50], ["Brutolonen", 120], ["12.500,00", 350]]),
    ...r(650, [["1600", 50], ["Loonheffing", 120], ["3.000,00", 450]]),
  ];
  const t = pdfItemsNaarTabel(items);
  it("gebruikt Debet/Credit als kop en voegt tekstkolommen toe", () => {
    expect(t.headers).toEqual(["Periode", "Rekening", "Omschrijving", "Debet", "Credit"]);
    expect(t.rows[0]).toEqual(["2026-04", "4000", "Brutolonen", "12500.00", ""]);
    expect(t.rows[1][4]).toBe("3000.00");
  });
});
