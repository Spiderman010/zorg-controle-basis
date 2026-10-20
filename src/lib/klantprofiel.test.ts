import { describe, it, expect, beforeEach } from "vitest";
import {
  KLANTPROFIEL_KEY,
  klantSleutel,
  getKlantprofiel,
  saveKlantprofiel,
  deleteKlantprofiel,
  listKlantprofielen,
  parseSystemen,
  herkomstVoorUpload,
} from "./klantprofiel";
import { telPerNiveau, laatstIngelezen } from "./herkomst";
import { voortgangDossier } from "./dossier-voortgang";
import type { BronBestand } from "./bronnen";

// Fictief: "Zorg Voorbeeld BV" met een fictief systeem.
describe("aanleverprofiel per klant", () => {
  beforeEach(() => localStorage.clear());

  it("gebruikt de bedrijfsnaam in kleine letters en getrimd als sleutel", () => {
    expect(klantSleutel("  Zorg Voorbeeld BV ")).toBe("zorg voorbeeld bv");
  });

  it("slaat een profiel op en vindt het terug, ongeacht hoofdletters en spaties", () => {
    saveKlantprofiel("Zorg Voorbeeld BV", { systemen: ["Voorbeeldsysteem"], standaard_manier: "klant_export", frequentie: "maand", notitie: "Export via e-mail" });
    expect(getKlantprofiel(" zorg voorbeeld bv")).toEqual({
      systemen: ["Voorbeeldsysteem"], standaard_manier: "klant_export", frequentie: "maand", notitie: "Export via e-mail",
    });
    expect(Object.keys(listKlantprofielen())).toEqual(["zorg voorbeeld bv"]);
  });

  it("geeft niets terug voor een onbekende klant of een lege naam", () => {
    expect(getKlantprofiel("Andere Zorg BV")).toBeUndefined();
    expect(getKlantprofiel("")).toBeUndefined();
  });

  it("verwijdert een profiel", () => {
    saveKlantprofiel("Zorg Voorbeeld BV", { systemen: [] });
    deleteKlantprofiel("ZORG VOORBEELD BV");
    expect(getKlantprofiel("Zorg Voorbeeld BV")).toBeUndefined();
  });

  it("blijft werken bij een beschadigde opslag", () => {
    localStorage.setItem(KLANTPROFIEL_KEY, "{kapot");
    expect(getKlantprofiel("Zorg Voorbeeld BV")).toBeUndefined();
    expect(listKlantprofielen()).toEqual({});
  });

  it("leest systemen uit een komma-gescheiden tekst", () => {
    expect(parseSystemen(" Voorbeeldsysteem, Ander systeem ,, ")).toEqual(["Voorbeeldsysteem", "Ander systeem"]);
    expect(parseSystemen("")).toEqual([]);
  });
});

describe("herkomst voorvullen bij een nieuwe upload", () => {
  it("neemt de standaard manier en het eerste systeem uit het profiel, met de exportdatum", () => {
    const h = herkomstVoorUpload({ systemen: ["Voorbeeldsysteem", "Ander systeem"], standaard_manier: "zelf_opgehaald" }, "2026-10-01");
    expect(h).toEqual({ manier: "zelf_opgehaald", systeem: "Voorbeeldsysteem", export_datum: "2026-10-01" });
  });

  it("zonder profiel alleen de exportdatum, en zonder datum en profiel niets", () => {
    expect(herkomstVoorUpload(undefined, "2026-10-01")).toEqual({ export_datum: "2026-10-01" });
    expect(herkomstVoorUpload(undefined, undefined)).toBeUndefined();
    expect(herkomstVoorUpload({ systemen: [] }, undefined)).toBeUndefined();
  });
});

const bron = (over: Partial<BronBestand>): BronBestand => ({
  id: "b", dossier_id: "d", bestandsnaam: "bestand.csv", geupload_op: "2026-10-01T09:00:00.000Z", type: "zorgopbrengsten",
  type_auto_herkend: false, type_bevestigd: true, headers: ["Periode", "Bedrag", "Rekening"],
  rijen: [["2026-09", "60000", "8000"]], preview_rows: 5,
  mapping: { periode: "Periode", bedrag: "Bedrag", rekening_of_categorie: "Rekening" },
  ...over,
});

describe("overzicht van de herkomst op de dossierpagina", () => {
  const bronnen = [
    bron({ id: "1", herkomst: { manier: "zelf_opgehaald" }, geupload_op: "2026-10-01T09:00:00.000Z" }),
    bron({ id: "2", herkomst: { manier: "klant_export" }, geupload_op: "2026-10-03T09:00:00.000Z" }),
    bron({ id: "3", geupload_op: "2026-10-02T09:00:00.000Z" }),
    bron({ id: "4", type: "niet_gebruiken", geupload_op: "2026-10-09T09:00:00.000Z" }),
    bron({ id: "5", fout: "onleesbaar", geupload_op: "2026-10-09T09:00:00.000Z" }),
  ];

  it("telt bruikbare bronnen per bewijsniveau", () => {
    expect(telPerNiveau(bronnen)).toEqual({ hoog: 1, midden: 1, laag: 0, onbekend: 1 });
  });

  it("geeft de datum van de laatste upload van een bruikbare bron", () => {
    expect(laatstIngelezen(bronnen)).toBe("2026-10-03T09:00:00.000Z");
    expect(laatstIngelezen([])).toBeUndefined();
  });

  it("noemt in de voortgang hoeveel bronnen geen herkomst hebben, zonder de volgende stap te veranderen", () => {
    const zonder = voortgangDossier(bronnen, "d");
    const met = voortgangDossier(bronnen.map((b) => ({ ...b, herkomst: { manier: "klant_export" as const } })), "d");
    expect(zonder.herkomstOntbreekt).toBe(1);
    expect(met.herkomstOntbreekt).toBe(0);
    expect(zonder.volgendeStap).toEqual(met.volgendeStap);
  });
});
