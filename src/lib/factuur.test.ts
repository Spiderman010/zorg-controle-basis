import { describe, it, expect } from "vitest";
import { pdfItemsNaarTabel, nlBedragNaarGetal } from "./bronnen";

const items = [
  [711, 42, "Lea's Zorghart"], [788, 417, "Adequaat Zorg"], [638, 468, "Factuurdatum:"], [623, 479, "06/07/2026"],
  [608, 473, "Vervaldatum:"], [594, 479, "05/08/2026"], [621, 42, "Factuur: 20260044"],
  [548, 43, "Aantal"], [548, 82, "Beschrijving"], [548, 431, "Bedrag"], [548, 522, "Bedrag"],
  [509, 43, "1"], [509, 82, "Factuur zorgondersteuning juni"], [509, 412, "€ 1.500,00"], [509, 503, "€ 1.500,00"],
  [470, 353, "Totaalbedrag excl. btw"], [470, 503, "€ 1.500,00"],
].map(([y, x, str]) => ({ y: y as number, x: x as number, str: str as string, pagina: 1 }));

describe("factuurherkenning", () => {
  it("leest factuur 20260044 als zorgopbrengst juni 2026 van 1500", () => {
    const { headers, rows } = pdfItemsNaarTabel(items);
    expect(headers).toContain("Bedrag");
    expect(rows).toHaveLength(1);
    const r = Object.fromEntries(headers.map((h, i) => [h, rows[0][i]]));
    expect(r.Periode).toBe("2026-06");
    expect(r.Factuurnummer).toBe("20260044");
    expect(r.Factuurdatum).toBe("2026-07-06");
    expect(r.Debiteur).toBe("Lea's Zorghart");
    expect(r.Bedrag).toBe("1500.00");
  });
  it("zet NL-bedragen om", () => {
    expect(nlBedragNaarGetal("€ 12.345,67")).toBe("12345.67");
  });
});
