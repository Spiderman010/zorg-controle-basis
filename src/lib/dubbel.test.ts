import { describe, it, expect } from "vitest";
import { vindDubbeleFacturen, herkenLoonspecificatie, FACTUUR_KOLOMMEN, type BronBestand } from "./bronnen";
import { projectLabel } from "./projecten";

const bron = (id: string, rijen: string[][]): BronBestand => ({
  id, dossier_id: "d", bestandsnaam: `${id}.pdf`, geupload_op: "", type: "inhuur",
  type_auto_herkend: false, type_bevestigd: true, headers: [...FACTUUR_KOLOMMEN], rijen, preview_rows: 0,
});
const rij = (nr: string, rel: string, bedrag: string) => ["2026-06", nr, "2026-07-06", rel, "Zorgopbrengst", "x", bedrag];

describe("dubbele facturen", () => {
  it("herkent zelfde nummer + relatie + bedrag over bestanden heen", () => {
    const d = vindDubbeleFacturen([bron("a", [rij("20260044", "Lea's Zorghart", "1500.00")]), bron("b", [rij("20260044", "Lea's Zorghart", "1500.00")])]);
    expect(d).toHaveLength(1);
    expect(d[0].voorkomens).toHaveLength(2);
  });
  it("ander bedrag is geen dubbele", () => {
    expect(vindDubbeleFacturen([bron("a", [rij("1", "X", "1500.00"), rij("1", "X", "1400.00")])])).toHaveLength(0);
  });
  it("andere leverancier is geen dubbele", () => {
    expect(vindDubbeleFacturen([bron("a", [rij("1", "X", "10.00"), rij("1", "Y", "10.00")])])).toHaveLength(0);
  });
});

describe("loonstrook", () => {
  it("haalt brutoloon, periode en medewerker op", () => {
    const r = herkenLoonspecificatie([
      ["SALARISSPECIFICATIE", "Jaar", "2026", "Periode", "april"],
      ["Werknemer gegevens", "I. Bouzian"],
      ["Brutoloon", "2.450,00"],
      ["Nettoloon", "1.900,00"],
    ]);
    expect(r?.rows[0]).toEqual(["2026-04", "I. Bouzian", "Brutoloon", "2450.00"]);
  });
});

describe("kostenplaatsnaam", () => {
  it("toont alleen de naam", () => {
    expect(projectLabel({ id: "1", naam: "M Bouzian", rol: "client", via_id: "2" } as never, [])).toBe("M Bouzian");
  });
});
