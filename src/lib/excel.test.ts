import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseExcel, isExcelBestand } from "./bronnen";

function maak(rows: unknown[][]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Blad1");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

describe("Excel-import", () => {
  it("herkent .xlsx en .xls", () => {
    expect(isExcelBestand("lonen.XLSX")).toBe(true);
    expect(isExcelBestand("oud.xls")).toBe(true);
    expect(isExcelBestand("data.csv")).toBe(false);
  });

  it("leest headers en rijen, slaat lege rijen over", async () => {
    const r = await parseExcel(
      maak([["Periode", "Bedrag", "Rekening"], ["2026-01", 1234.56, "8000"], [], ["2026-02", 100, "8010"]]),
    );
    expect(r.headers).toEqual(["Periode", "Bedrag", "Rekening"]);
    expect(r.rows).toEqual([
      ["2026-01", "1234.56", "8000"],
      ["2026-02", "100", "8010"],
    ]);
  });

  it("geeft een foutmelding bij een leeg werkblad", async () => {
    await expect(parseExcel(maak([]))).rejects.toThrow(/leeg/);
  });
});
