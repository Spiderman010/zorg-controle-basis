import { describe, it, expect, beforeEach } from "vitest";
import { maakBackup, leesBackup, terugzetten, BACKUP_APP, BACKUP_VERSIE } from "./backup";
import { getKlantprofiel, saveKlantprofiel, listKlantprofielen } from "./klantprofiel";
import { laadVoorbeeldDossier, verwijderVoorbeeldDossier, VOORBEELD_DOSSIER_ID } from "./voorbeeld";
import { listBronnen } from "./bronnen";
import { listDossiers } from "./dossiers";

// Fictief: "Zorg Voorbeeld BV" en "Andere Zorg BV".
describe("back-up met aanleverprofielen", () => {
  beforeEach(() => localStorage.clear());

  it("neemt klantprofielen op als optioneel veld en houdt versie 1", () => {
    saveKlantprofiel("Zorg Voorbeeld BV", { systemen: ["Voorbeeldsysteem"], standaard_manier: "klant_export" });
    const b = maakBackup();
    expect(b.versie).toBe(BACKUP_VERSIE);
    expect(BACKUP_VERSIE).toBe(1);
    expect(b.klantprofielen).toEqual({ "zorg voorbeeld bv": { systemen: ["Voorbeeldsysteem"], standaard_manier: "klant_export" } });
  });

  it("heen en terug: profielen komen terug op een lege browser", () => {
    saveKlantprofiel("Zorg Voorbeeld BV", { systemen: ["Voorbeeldsysteem"], frequentie: "maand" });
    const tekst = JSON.stringify(maakBackup());
    localStorage.clear();
    const r = leesBackup(tekst);
    if (r.ok === false) throw new Error(r.fout);
    expect(r.profielen).toBe(1);
    terugzetten(r.backup, false);
    expect(getKlantprofiel("Zorg Voorbeeld BV")).toEqual({ systemen: ["Voorbeeldsysteem"], frequentie: "maand" });
  });

  it("een oude back-up zonder klantprofielen blijft werken en laat bestaande profielen staan", () => {
    saveKlantprofiel("Andere Zorg BV", { systemen: ["Ander systeem"] });
    const oud = JSON.stringify({ app: BACKUP_APP, versie: 1, gemaakt_op: "2026-10-19T00:00:00.000Z", dossiers: [], projecten: [], bronnen: [] });
    const r = leesBackup(oud);
    expect(r.ok).toBe(true);
    if (r.ok === false) return;
    expect(r.profielen).toBe(0);
    terugzetten(r.backup, false);
    expect(getKlantprofiel("Andere Zorg BV")).toEqual({ systemen: ["Ander systeem"] });
  });

  it("voegt ontbrekende profielen toe en overschrijft een bestaand profiel alleen bij overschrijven", () => {
    saveKlantprofiel("Zorg Voorbeeld BV", { systemen: ["Oud systeem"] });
    const backup = {
      app: BACKUP_APP, versie: 1, gemaakt_op: "", dossiers: [], projecten: [], bronnen: [],
      klantprofielen: {
        "zorg voorbeeld bv": { systemen: ["Nieuw systeem"] },
        "andere zorg bv": { systemen: ["Ander systeem"] },
      },
    };
    const r = leesBackup(JSON.stringify(backup));
    if (r.ok === false) throw new Error(r.fout);
    terugzetten(r.backup, false);
    expect(getKlantprofiel("Zorg Voorbeeld BV")?.systemen).toEqual(["Oud systeem"]);
    expect(getKlantprofiel("Andere Zorg BV")?.systemen).toEqual(["Ander systeem"]);
    terugzetten(r.backup, true);
    expect(getKlantprofiel("Zorg Voorbeeld BV")?.systemen).toEqual(["Nieuw systeem"]);
  });

  it("weigert een back-up met ongeldige klantprofielen", () => {
    const slecht = (klantprofielen: unknown) =>
      leesBackup(JSON.stringify({ app: BACKUP_APP, versie: 1, dossiers: [], projecten: [], bronnen: [], klantprofielen }));
    expect(slecht([]).ok).toBe(false);
    expect(slecht({ "x bv": { systemen: "geen lijst" } }).ok).toBe(false);
  });
});

describe("voorbeelddossier met herkomst en aanleverprofiel", () => {
  beforeEach(() => localStorage.clear());

  it("geeft de vier bronnen herkomst en maakt een profiel voor het voorbeeld", () => {
    laadVoorbeeldDossier();
    const bronnen = listBronnen(VOORBEELD_DOSSIER_ID);
    expect(bronnen).toHaveLength(4);
    for (const b of bronnen) {
      expect(b.herkomst).toEqual({ manier: "zelf_opgehaald", systeem: "Voorbeeldsysteem", export_datum: "2026-10-01" });
    }
    const d = listDossiers().find((x) => x.id === VOORBEELD_DOSSIER_ID);
    expect(d?.bedrijfsnaam).toBe("VOORBEELD Zorg Voorbeeld BV");
    expect(getKlantprofiel("VOORBEELD Zorg Voorbeeld BV")).toEqual({
      systemen: ["Voorbeeldsysteem"], standaard_manier: "zelf_opgehaald", frequentie: "maand",
    });
  });

  it("verwijdert bij het verwijderen ook het voorbeeldprofiel, maar geen ander profiel", () => {
    saveKlantprofiel("Zorg Voorbeeld BV", { systemen: ["Eigen systeem"] });
    laadVoorbeeldDossier();
    verwijderVoorbeeldDossier();
    expect(getKlantprofiel("VOORBEELD Zorg Voorbeeld BV")).toBeUndefined();
    expect(getKlantprofiel("Zorg Voorbeeld BV")).toEqual({ systemen: ["Eigen systeem"] });
    expect(Object.keys(listKlantprofielen())).toEqual(["zorg voorbeeld bv"]);
  });
});
