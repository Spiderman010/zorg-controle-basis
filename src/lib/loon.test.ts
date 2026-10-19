import { describe, it, expect } from "vitest";
import { pdfItemsNaarTabel, detectBronType } from "./bronnen";
const pagina = (p: number, naam: string, bruto: string) => [
  { str: "SALARISSPECIFICATIE", x: 50, y: 800, pagina: p },
  { str: "Periode", x: 50, y: 780, pagina: p }, { str: "april 2026", x: 200, y: 780, pagina: p },
  { str: "Naam", x: 50, y: 760, pagina: p }, { str: naam, x: 200, y: 760, pagina: p },
  { str: "Brutoloon", x: 50, y: 740, pagina: p }, { str: bruto, x: 300, y: 740, pagina: p },
];
describe("loonstroken", () => {
  it("één rij per medewerker uit verzamel-PDF", () => {
    const t = pdfItemsNaarTabel([...pagina(1, "I. Bouzian", "2.450,00"), ...pagina(2, "A. Jansen", "3.100,50")]);
    expect(t.rows).toEqual([
      ["2026-04", "I. Bouzian", "Brutoloon", "2450.00"],
      ["2026-04", "A. Jansen", "Brutoloon", "3100.50"],
    ]);
  });
  it("loonjournaalpost wordt personeelskosten", () => {
    expect(detectBronType("LJP april.xlsx", ["Grootboek", "Debet"])).toBe("personeelskosten");
  });
});
