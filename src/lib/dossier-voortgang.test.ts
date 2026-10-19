import { describe, it, expect } from "vitest";
import { voortgangDossier } from "./dossier-voortgang";
import type { BronBestand } from "./bronnen";

// Fictief dossier: "Zorg Voorbeeld BV", september 2026.
const DOSSIER = "vb-2026-09";
const bron = (over: Partial<BronBestand>): BronBestand => ({
  id: "b", dossier_id: DOSSIER, bestandsnaam: "bestand.csv", geupload_op: "", type: "zorgopbrengsten",
  type_auto_herkend: false, type_bevestigd: true, headers: ["Periode", "Bedrag", "Rekening"],
  rijen: [["2026-09", "60000", "8000"]], preview_rows: 5,
  mapping: { periode: "Periode", bedrag: "Bedrag", rekening_of_categorie: "Rekening" },
  ...over,
});
const basis = (): BronBestand[] => [
  bron({ id: "zo", type: "zorgopbrengsten", bestandsnaam: "Opbrengsten september.csv" }),
  bron({
    id: "pk", type: "personeelskosten", bestandsnaam: "Loonkosten september.csv",
    headers: ["Periode", "Bedrag", "Looncomponent"], rijen: [["2026-09", "70000", "Brutolonen"]],
    mapping: { periode: "Periode", bedrag: "Bedrag", looncomponent: "Looncomponent" },
  }),
];

describe("wat ontbreekt nog per dossier (Zorg Voorbeeld BV)", () => {
  it("zonder bronnen: basisbronnen ontbreken en de volgende stap is uploaden", () => {
    const v = voortgangDossier([], DOSSIER);
    expect(v.bronnen.find((b) => b.type === "zorgopbrengsten")?.status).toBe("ontbreekt");
    expect(v.bronnen.find((b) => b.type === "personeelskosten")?.status).toBe("ontbreekt");
    expect(v.volgendeStap.tekst).toMatch(/Upload de zorgopbrengsten/);
    expect(v.volgendeStap.route).toBe(`/dossiers/${DOSSIER}/bronnen?tab=upload`);
  });

  it("noemt elke bron met wat die oplevert", () => {
    const v = voortgangDossier([], DOSSIER);
    expect(v.bronnen).toHaveLength(7);
    for (const b of v.bronnen) expect(b.levert.length).toBeGreaterThan(0);
  });

  it("een bron die nog niet bevestigd is, krijgt de stap 'bevestig het type'", () => {
    const bronnen = basis();
    bronnen[0] = { ...bronnen[0], type_bevestigd: false, type_auto_herkend: true };
    const v = voortgangDossier(bronnen, DOSSIER);
    expect(v.bronnen.find((b) => b.type === "zorgopbrengsten")?.status).toBe("niet_bevestigd");
    expect(v.volgendeStap.tekst).toBe("Bevestig het type van Opbrengsten september.csv.");
    expect(v.volgendeStap.route).toBe(`/dossiers/${DOSSIER}/bronnen?tab=upload`);
  });

  it("een bron met een ontbrekende verplichte kolom krijgt de stap 'koppel de kolommen'", () => {
    const bronnen = basis();
    bronnen[1] = { ...bronnen[1], mapping: { periode: "Periode", bedrag: "Bedrag" } };
    const v = voortgangDossier(bronnen, DOSSIER);
    expect(v.bronnen.find((b) => b.type === "personeelskosten")?.status).toBe("koppeling_onvolledig");
    expect(v.volgendeStap.tekst).toBe("Koppel de kolommen van Loonkosten september.csv.");
    expect(v.volgendeStap.route).toBe(`/dossiers/${DOSSIER}/bronnen?tab=mapping`);
  });

  it("directe uren zonder koppeling aan een kostenplaats: stap 'koppel de uren'", () => {
    const bronnen = [
      ...basis(),
      bron({
        id: "du", type: "directe_uren", bestandsnaam: "Directe uren september.csv",
        headers: ["Periode", "Medewerker", "Uren"], rijen: [["2026-09", "Team Zvw", "421"]],
        mapping: { periode: "Periode", medewerker: "Medewerker", directe_uren: "Uren" },
      }),
    ];
    const v = voortgangDossier(bronnen, DOSSIER);
    expect(v.bronnen.find((b) => b.type === "directe_uren")?.status).toBe("koppeling_onvolledig");
    expect(v.volgendeStap.tekst).toBe("Koppel de uren aan kostenplaatsen.");
    expect(v.volgendeStap.route).toBe(`/dossiers/${DOSSIER}/bronnen?tab=classificatie`);
  });

  it("met gekoppelde uren is de volgende stap de controle", () => {
    const bronnen = [
      ...basis(),
      bron({
        id: "du", type: "directe_uren", bestandsnaam: "Directe uren september.csv",
        headers: ["Periode", "Medewerker", "Uren"], rijen: [["2026-09", "Team Zvw", "421"]],
        mapping: { periode: "Periode", medewerker: "Medewerker", directe_uren: "Uren" },
        projecttoewijzingen: { 0: "zvw" },
      }),
    ];
    const v = voortgangDossier(bronnen, DOSSIER);
    expect(v.bronnen.find((b) => b.type === "directe_uren")?.status).toBe("compleet");
    expect(v.volgendeStap.tekst).toBe("Bekijk de controle.");
    expect(v.volgendeStap.route).toBe(`/dossiers/${DOSSIER}/controle`);
  });

  it("negeert bestanden die niet gebruikt worden of niet gelezen konden worden", () => {
    const v = voortgangDossier(
      [bron({ id: "x", type: "niet_gebruiken", type_bevestigd: true }), bron({ id: "y", fout: "onleesbaar" })],
      DOSSIER,
    );
    expect(v.bronnen.find((b) => b.type === "zorgopbrengsten")?.status).toBe("ontbreekt");
  });

  it("noemt de basisbron die nog mist, ook als de andere er wel is", () => {
    const v = voortgangDossier([basis()[1]], DOSSIER);
    expect(v.volgendeStap.tekst).toMatch(/Upload de zorgopbrengsten/);
  });
});
