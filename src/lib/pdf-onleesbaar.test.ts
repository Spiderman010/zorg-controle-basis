import { describe, it, expect } from "vitest";
import { pdfItemsNaarTabel, pdfTekstOnleesbaar, type PdfTekstItem } from "./bronnen";

const item = (str: string, x: number, y: number): PdfTekstItem => ({ str, x, y, pagina: 1 });

// Zo ziet tekst eruit uit een PDF met lettertypes zonder tekentabel: stuurtekens en losse leestekens.
const rommel = [
  item("\u0001\u0002\u0003\u0004\u0005\u0006\u0007\u0008\u0009\u000b", 50, 800),
  item("\u000e\u000f\u0010\u0011", 350, 800),
  item("$ %\u0012&\u0013 \u0013'\u0013 \u0014\u0014( \u0015)", 50, 780),
  item("5+\u0016\u0017\u0018&", 350, 780),
  item("6\u0019\u001a78\u001b9\u001c\u001d", 50, 760),
  item("CDEF\u001e\u001f\u0001\u0002\u0003G+ .", 350, 760),
];

describe("PDF met onleesbare tekst (lettertype zonder tekentabel)", () => {
  it("herkent tekst die vooral uit stuurtekens bestaat", () => {
    expect(pdfTekstOnleesbaar(rommel)).toBe(true);
  });

  it("geeft een duidelijke foutmelding in plaats van een tabel met rommel", () => {
    expect(() => pdfItemsNaarTabel(rommel)).toThrow(/niet leesbaar/);
  });

  it("laat een gewone PDF met euroteken, accenten en tabs door", () => {
    const goed = [
      item("Grootboek", 50, 700), item("Omschrijving", 120, 700), item("Debet", 350, 700),
      item("4000", 50, 680), item("Brutolonen cliënt\t", 120, 680), item("€ 1.234,56", 350, 680),
    ];
    expect(pdfTekstOnleesbaar(goed)).toBe(false);
    expect(() => pdfItemsNaarTabel(goed)).not.toThrow();
  });

  it("keurt een PDF niet af om een enkel vreemd teken", () => {
    const bijna = [
      item("Grootboek", 50, 700), item("Omschrijving", 120, 700), item("Debet", 350, 700),
      item("4000", 50, 680), item("Brutolonen\u0002", 120, 680), item("1.234,56", 350, 680),
      item("4100", 50, 660), item("Vakantiegeld", 120, 660), item("98,76", 350, 660),
    ];
    expect(pdfTekstOnleesbaar(bijna)).toBe(false);
  });
});
