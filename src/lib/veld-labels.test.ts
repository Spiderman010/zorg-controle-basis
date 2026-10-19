import { describe, it, expect } from "vitest";
import { VELD_LABELS, veldNaam, veldUitleg } from "./veld-labels";
import { VERPLICHTE_VELDEN, OPTIONELE_VELDEN, valideerBron, type BronBestand } from "./bronnen";

const alleVelden = () => {
  const s = new Set<string>();
  for (const v of Object.values(VERPLICHTE_VELDEN)) v.forEach((x) => s.add(x));
  for (const v of Object.values(OPTIONELE_VELDEN)) (v ?? []).forEach((x) => s.add(x));
  return [...s];
};

describe("centrale veldnamen (VELD_LABELS)", () => {
  it("heeft voor elk technisch veld in de mapping een Nederlandse naam en uitleg", () => {
    for (const v of alleVelden()) {
      expect(VELD_LABELS[v], `ontbreekt: ${v}`).toBeDefined();
      expect(veldNaam(v).length).toBeGreaterThan(0);
      expect(veldUitleg(v).length).toBeGreaterThan(0);
    }
  });

  it("gebruikt de afgesproken namen", () => {
    expect(veldNaam("periode")).toBe("Periode (maand of jaar)");
    expect(veldNaam("betaalde_uren")).toBe("Betaalde uren");
    expect(veldNaam("directe_uren")).toBe("Directe (cliëntgebonden) uren");
    expect(veldNaam("gedeclareerde_uren")).toBe("Gedeclareerde uren (aantal)");
    expect(veldNaam("rekening_of_categorie")).toBe("Rekening of categorie");
    expect(veldNaam("looncomponent")).toBe("Soort loonkosten");
    expect(veldNaam("financieringsstroom")).toBe("Financieringsstroom (Zvw, Wlz, Wmo, PGB)");
  });

  it("valt terug op de technische naam als een veld onbekend is", () => {
    expect(veldNaam("onbekend_veld")).toBe("onbekend_veld");
    expect(veldUitleg("onbekend_veld")).toBe("");
  });

  it("gebruikt de Nederlandse naam in de validatiemelding", () => {
    const bron: BronBestand = {
      id: "x", dossier_id: "d", bestandsnaam: "test.csv", geupload_op: "", type: "directe_uren",
      type_auto_herkend: false, type_bevestigd: true, headers: ["Periode"], rijen: [["2026-09"]],
      preview_rows: 5, mapping: {},
    };
    const msg = valideerBron(bron).fouten.join(" ");
    expect(msg).toContain("Directe (cliëntgebonden) uren");
    expect(msg).not.toContain("directe_uren");
  });
});
