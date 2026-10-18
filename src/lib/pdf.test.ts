import { describe, expect, it } from "vitest";
import { isPdfBestand, pdfItemsNaarTabel } from "./bronnen";

describe("PDF-import", () => {
  it("herkent pdf-bestanden", () => {
    expect(isPdfBestand("loonjournaal.PDF")).toBe(true);
    expect(isPdfBestand("data.csv")).toBe(false);
  });

  it("zet tekstregels om naar kolommen en rijen", () => {
    const items = [
      { str: "Loonjournaal", x: 50, y: 800, pagina: 1 },
      { str: "Periode", x: 50, y: 700, pagina: 1 },
      { str: "Looncomponent", x: 150, y: 700, pagina: 1 },
      { str: "Bedrag", x: 300, y: 700, pagina: 1 },
      { str: "2026-01", x: 50, y: 680, pagina: 1 },
      { str: "Brutoloon", x: 150, y: 681, pagina: 1 },
      { str: "12500,00", x: 300, y: 680, pagina: 1 },
    ];
    const { headers, rows } = pdfItemsNaarTabel(items);
    expect(headers).toEqual(["Periode", "Looncomponent", "Bedrag"]);
    expect(rows).toEqual([["2026-01", "Brutoloon", "12500,00"]]);
  });

  it("geeft een duidelijke fout bij een scan zonder tekst", () => {
    expect(() => pdfItemsNaarTabel([])).toThrow(/geen leesbare tekst/);
  });
});
