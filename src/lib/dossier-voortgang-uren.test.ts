import { describe, it, expect } from "vitest";
import { voortgangDossier } from "./dossier-voortgang";
import type { BronBestand } from "./bronnen";

// Fictief: "Zorg Voorbeeld BV". Gedeclareerde uren met een Zvw-regel, een Wmo-regel en een Wlz-verblijfregel.
const DOSSIER = "vb-2026-09";
const gedeclareerd = (over: Partial<BronBestand>): BronBestand => ({
  id: "gd", dossier_id: DOSSIER, bestandsnaam: "Declaratie september.csv", geupload_op: "", type: "gedeclareerde_uren",
  type_auto_herkend: false, type_bevestigd: true,
  headers: ["Periode", "Stroom", "Gedeclareerde minuten"],
  rijen: [["2026-09", "Zvw wijkverpleging", "25200"], ["2026-09", "Wmo", "19800"], ["2026-09", "Wlz verblijf", "31"]],
  preview_rows: 5,
  mapping: { periode: "Periode", financieringsstroom: "Stroom", gedeclareerde_uren: "Gedeclareerde minuten" },
  ...over,
});
const stap = (bronnen: BronBestand[]) => voortgangDossier(bronnen, DOSSIER);
const uren = (bronnen: BronBestand[]) => stap(bronnen).bronnen.find((b) => b.type === "gedeclareerde_uren")?.status;

describe("gedeclareerde uren en kostenplaatsen (Zorg Voorbeeld BV)", () => {
  it("een Wlz-verblijfregel hoeft niet aan een kostenplaats gekoppeld te zijn", () => {
    const bron = gedeclareerd({ projecttoewijzingen: { 0: "zvw", 1: "wmo" } });
    expect(uren([bron])).toBe("compleet");
  });

  it("een Zvw- of Wmo-regel zonder kostenplaats blijft wel een open koppeling", () => {
    const bron = gedeclareerd({ projecttoewijzingen: { 1: "wmo" } });
    expect(uren([bron])).toBe("koppeling_onvolledig");
  });
});
