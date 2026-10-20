import { describe, it, expect } from "vitest";
import { herkomstSamenvatting, herkomstRijen, urenHerkomstRegel } from "./herkomst-weergave";
import type { BronBestand } from "./bronnen";

// Fictief: "Zorg Voorbeeld BV".
const bron = (over: Partial<BronBestand>): BronBestand => ({
  id: Math.random().toString(36).slice(2), dossier_id: "d", bestandsnaam: "bestand.csv", geupload_op: "", type: "zorgopbrengsten",
  type_auto_herkend: false, type_bevestigd: true, headers: [], rijen: [], preview_rows: 0,
  ...over,
});

describe("samenvatting van de herkomst", () => {
  it("telt per niveau en maakt er een zin van", () => {
    const bronnen = [
      bron({ herkomst: { manier: "zelf_opgehaald" } }),
      bron({ herkomst: { manier: "zelf_opgehaald" } }),
      bron({ herkomst: { manier: "zelf_opgehaald" } }),
      bron({ herkomst: { manier: "klant_export" } }),
      bron({}),
    ];
    expect(herkomstSamenvatting(bronnen)).toBe("3 bronnen zelf opgehaald, 1 export van de klant, 1 zonder vastgelegde herkomst");
  });

  it("gebruikt enkelvoud en meervoud, en noemt sjabloon of handmatig", () => {
    expect(herkomstSamenvatting([bron({ herkomst: { manier: "zelf_opgehaald" } }), bron({ herkomst: { manier: "klant_export" } }), bron({ herkomst: { manier: "klant_export" } }), bron({ herkomst: { manier: "sjabloon" } })]))
      .toBe("1 bron zelf opgehaald, 2 exports van de klant, 1 bron via sjabloon of handmatig");
  });

  it("negeert bestanden die niet gebruikt worden of niet gelezen konden worden", () => {
    expect(herkomstSamenvatting([bron({ type: "niet_gebruiken" }), bron({ fout: "onleesbaar" })])).toBe("Geen bronnen ingelezen");
  });
});

describe("tabel met de herkomst per bron", () => {
  it("geeft per bruikbare bron bestand, type, manier, systeem, exportdatum en bewijsniveau", () => {
    const rijen = herkomstRijen([
      bron({ bestandsnaam: "Declaratie september.csv", type: "gedeclareerde_uren", herkomst: { manier: "zelf_opgehaald", systeem: "Voorbeeldsysteem", export_datum: "2026-10-01" } }),
      bron({ bestandsnaam: "Loonkosten september.csv", type: "personeelskosten" }),
      bron({ bestandsnaam: "Leeg.csv", fout: "leeg" }),
    ]);
    expect(rijen).toHaveLength(2);
    expect(rijen[0]).toEqual(expect.objectContaining({ bestand: "Declaratie september.csv", type: "Gedeclareerde uren", manier: "Zelf opgehaald uit het systeem", systeem: "Voorbeeldsysteem", exportdatum: "01-10-2026", niveau: "Hoog: zelf opgehaald" }));
    expect(rijen[1]).toEqual(expect.objectContaining({ bestand: "Loonkosten september.csv", type: "Personeelskosten", manier: "Niet vastgelegd", systeem: "-", exportdatum: "-", niveau: "Onbekend: herkomst niet vastgelegd" }));
  });
});

describe("herkomst onder de Uren-controle", () => {
  it("noemt per uren-bron het niveau, de manier, het systeem en de datum", () => {
    const regel = urenHerkomstRegel([
      bron({ type: "gedeclareerde_uren", herkomst: { manier: "zelf_opgehaald", systeem: "Nedap Ons", export_datum: "2026-10-01" } }),
      bron({ type: "directe_uren", herkomst: { manier: "klant_export" } }),
    ]);
    expect(regel).toBe("Gedeclareerde uren: Hoog, zelf opgehaald uit Nedap Ons, 01-10-2026. Directe uren: Midden, van de klant ontvangen.");
  });

  it("toont bij meerdere bronnen van een type het laagste niveau", () => {
    const regel = urenHerkomstRegel([
      bron({ type: "directe_uren", herkomst: { manier: "zelf_opgehaald", systeem: "Voorbeeldsysteem" } }),
      bron({ type: "directe_uren", herkomst: { manier: "handmatig" } }),
      bron({ type: "gedeclareerde_uren", herkomst: { manier: "klant_export" } }),
    ]);
    expect(regel).toBe("Gedeclareerde uren: Midden, van de klant ontvangen. Directe uren: Laag, handmatig overgenomen.");
  });

  it("zegt 'Herkomst niet vastgelegd' zonder herkomst, en noemt een ontbrekende bron", () => {
    expect(urenHerkomstRegel([bron({ type: "gedeclareerde_uren" }), bron({ type: "directe_uren", herkomst: { manier: "zelf_opgehaald" } })]))
      .toBe("Gedeclareerde uren: Herkomst niet vastgelegd. Directe uren: Hoog, zelf opgehaald.");
    expect(urenHerkomstRegel([])).toBe("Gedeclareerde uren: geen bron. Directe uren: geen bron.");
  });
});
