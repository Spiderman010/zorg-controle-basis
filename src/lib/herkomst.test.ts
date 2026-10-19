import { describe, it, expect } from "vitest";
import {
  bewijsniveau,
  datumUitLastModified,
  HERKOMST_MANIER_LABEL,
  BEWIJSNIVEAU_LABEL,
} from "./herkomst";
import { valideerBron, wijzigBronType, type BronBestand } from "./bronnen";

// Fictief: "Zorg Voorbeeld BV", declaratiebestand uit een fictief systeem.
const bron = (over: Partial<BronBestand> = {}): BronBestand => ({
  id: "x", dossier_id: "d", bestandsnaam: "Declaratie september.csv", geupload_op: "", type: "gedeclareerde_uren",
  type_auto_herkend: false, type_bevestigd: true,
  headers: ["Periode", "Stroom", "Gedeclareerde minuten"],
  rijen: [["2026-09", "Wmo", "19800"]],
  preview_rows: 5,
  mapping: { periode: "Periode", financieringsstroom: "Stroom", gedeclareerde_uren: "Gedeclareerde minuten" },
  ...over,
});

describe("bewijsniveau van een bron", () => {
  it("zelf opgehaald is hoog, export van de klant midden, sjabloon en handmatig laag", () => {
    expect(bewijsniveau({ manier: "zelf_opgehaald" })).toBe("hoog");
    expect(bewijsniveau({ manier: "klant_export" })).toBe("midden");
    expect(bewijsniveau({ manier: "sjabloon" })).toBe("laag");
    expect(bewijsniveau({ manier: "handmatig" })).toBe("laag");
  });

  it("zonder herkomst of zonder manier is het onbekend", () => {
    expect(bewijsniveau(undefined)).toBe("onbekend");
    expect(bewijsniveau({ export_datum: "2026-10-01" })).toBe("onbekend");
  });

  it("gebruikt de afgesproken Nederlandse labels", () => {
    expect(HERKOMST_MANIER_LABEL).toEqual({
      zelf_opgehaald: "Zelf opgehaald uit het systeem",
      klant_export: "Export van de klant ontvangen",
      sjabloon: "Ingevuld sjabloon",
      handmatig: "Handmatig overgenomen",
    });
    expect(BEWIJSNIVEAU_LABEL).toEqual({
      hoog: "Hoog: zelf opgehaald",
      midden: "Midden: van de klant ontvangen",
      laag: "Laag: sjabloon of handmatig",
      onbekend: "Onbekend: herkomst niet vastgelegd",
    });
  });
});

describe("exportdatum uit het bestand", () => {
  it("zet de wijzigingsdatum van het bestand om naar JJJJ-MM-DD", () => {
    expect(datumUitLastModified(new Date(2026, 9, 1, 14, 30).getTime())).toBe("2026-10-01");
    expect(datumUitLastModified(new Date(2026, 0, 9, 8, 0).getTime())).toBe("2026-01-09");
  });

  it("geeft niets terug bij een ontbrekende of ongeldige datum", () => {
    expect(datumUitLastModified(undefined)).toBeUndefined();
    expect(datumUitLastModified(0)).toBeUndefined();
    expect(datumUitLastModified(Number.NaN)).toBeUndefined();
  });
});

describe("herkomst in de validatie en bij wisselen van type", () => {
  it("meldt een signaal als de herkomst ontbreekt, zonder de status te veranderen", () => {
    const zonder = valideerBron(bron());
    expect(zonder.signalen).toContain("Herkomst niet vastgelegd");
    const met = valideerBron(bron({ herkomst: { manier: "klant_export", systeem: "Voorbeeldsysteem" } }));
    expect(met.signalen).not.toContain("Herkomst niet vastgelegd");
    expect(zonder.status).toBe(met.status);
    expect(zonder.waarschuwingen).toEqual(met.waarschuwingen);
  });

  it("meldt het signaal ook als alleen de exportdatum bekend is", () => {
    expect(valideerBron(bron({ herkomst: { export_datum: "2026-10-01" } })).signalen).toContain("Herkomst niet vastgelegd");
  });

  it("houdt de herkomst vast bij het wisselen van brontype", () => {
    const herkomst = { manier: "zelf_opgehaald" as const, systeem: "Voorbeeldsysteem", export_datum: "2026-10-01" };
    expect(wijzigBronType(bron({ herkomst }), "directe_uren").herkomst).toEqual(herkomst);
  });
});
