import { describe, it, expect, beforeEach } from "vitest";
import { VOORBEELD_DOSSIER_ID, laadVoorbeeldDossier, verwijderVoorbeeldDossier, heeftVoorbeeldDossier } from "./voorbeeld";
import { listDossiers, saveDossier } from "./dossiers";
import { listProjecten } from "./projecten";
import { listBronnen } from "./bronnen";
import { buildDataset } from "./datasetBuilder";
import { computeUrenVerband, urenVerbandCheck } from "@/core";
import { voortgangDossier } from "./dossier-voortgang";

describe("voorbeelddossier Zorg Voorbeeld BV", () => {
  beforeEach(() => localStorage.clear());

  it("laadt het dossier met twee kostenplaatsen en vier gekoppelde bronnen", () => {
    laadVoorbeeldDossier();
    const d = listDossiers().find((x) => x.id === VOORBEELD_DOSSIER_ID);
    expect(d?.dossiernaam).toBe("VOORBEELD Zorg Voorbeeld BV - Test 2026-09");
    const p = listProjecten(VOORBEELD_DOSSIER_ID);
    expect(p.map((x) => [x.naam, x.stroom]).sort()).toEqual([["Wmo-team", "wmo"], ["Zvw-team", "zvw"]]);
    const b = listBronnen(VOORBEELD_DOSSIER_ID);
    expect(b.map((x) => x.type).sort()).toEqual(["directe_uren", "gedeclareerde_uren", "personeelskosten", "zorgopbrengsten"]);
    expect(b.every((x) => x.type_bevestigd)).toBe(true);
  });

  it("nogmaals laden maakt geen dubbelen", () => {
    laadVoorbeeldDossier();
    laadVoorbeeldDossier();
    expect(listDossiers().filter((x) => x.id === VOORBEELD_DOSSIER_ID)).toHaveLength(1);
    expect(listProjecten(VOORBEELD_DOSSIER_ID)).toHaveLength(2);
    expect(listBronnen(VOORBEELD_DOSSIER_ID)).toHaveLength(4);
  });

  it("geeft de verwachte uitkomst: V1-C10 rood, Zvw-team groen, Wmo-team rood", () => {
    laadVoorbeeldDossier();
    const { dataset } = buildDataset(VOORBEELD_DOSSIER_ID);
    const projecten = listProjecten(VOORBEELD_DOSSIER_ID);
    expect(urenVerbandCheck(dataset, { projecten }).status).toBe("rood");
    const regels = computeUrenVerband(dataset, { projecten }).regels;
    expect(regels.find((r) => r.naam === "Zvw-team")?.status).toBe("groen");
    const wmo = regels.find((r) => r.naam === "Wmo-team");
    expect(wmo?.status).toBe("rood");
    expect(wmo?.declared_hours).toBe(330);
    expect(wmo?.worked_hours).toBe(300);
  });

  it("staat als klaar voor de controle in de voortgang", () => {
    laadVoorbeeldDossier();
    expect(voortgangDossier(listBronnen(VOORBEELD_DOSSIER_ID), VOORBEELD_DOSSIER_ID).volgendeStap.tekst).toBe("Bekijk de controle.");
  });

  it("verwijdert alleen het voorbeeld, niet andere dossiers", () => {
    const eigen = saveDossier({
      bedrijfsnaam: "Eigen klant", dossiernaam: "Eigen dossier", periode_van: "2026-01-01", periode_tot: "2026-01-31",
      periode_type: "maand", controle_type: "basiscontrole",
    });
    laadVoorbeeldDossier();
    expect(heeftVoorbeeldDossier()).toBe(true);
    verwijderVoorbeeldDossier();
    expect(heeftVoorbeeldDossier()).toBe(false);
    expect(listProjecten(VOORBEELD_DOSSIER_ID)).toHaveLength(0);
    expect(listBronnen(VOORBEELD_DOSSIER_ID)).toHaveLength(0);
    expect(listDossiers().map((d) => d.id)).toEqual([eigen.id]);
  });
});
