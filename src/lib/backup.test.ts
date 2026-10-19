import { describe, it, expect, beforeEach } from "vitest";
import { maakBackup, leesBackup, terugzetten, BACKUP_APP, BACKUP_VERSIE } from "./backup";
import { laadVoorbeeldDossier, VOORBEELD_DOSSIER_ID } from "./voorbeeld";
import { listDossiers, saveDossier, upsertDossier } from "./dossiers";
import { listProjecten, addProject } from "./projecten";
import { listBronnen } from "./bronnen";

const leeg = () => {
  localStorage.clear();
};

describe("back-up van dossiers, kostenplaatsen en bronnen (fictief)", () => {
  beforeEach(leeg);

  it("maakt een bestand met app, versienummer en alle drie de onderdelen", () => {
    laadVoorbeeldDossier();
    const b = maakBackup(new Date("2026-10-19T12:00:00Z"));
    expect(b.app).toBe(BACKUP_APP);
    expect(b.versie).toBe(BACKUP_VERSIE);
    expect(b.gemaakt_op).toBe("2026-10-19T12:00:00.000Z");
    expect(b.dossiers.map((d) => d.id)).toContain(VOORBEELD_DOSSIER_ID);
    expect(b.projecten).toHaveLength(2);
    expect(b.bronnen).toHaveLength(4);
  });

  it("een back-up teruggezet op een lege browser geeft dezelfde gegevens terug", () => {
    const eigen = saveDossier({
      bedrijfsnaam: "Eigen klant", dossiernaam: "Eigen dossier", periode_van: "2026-01-01", periode_tot: "2026-01-31",
      periode_type: "maand", controle_type: "basiscontrole",
    });
    addProject(eigen.id, "Eigen team", "zvw");
    laadVoorbeeldDossier();
    const voor = { dossiers: listDossiers(), projecten: listProjecten(VOORBEELD_DOSSIER_ID), bronnen: listBronnen(VOORBEELD_DOSSIER_ID) };

    const tekst = JSON.stringify(maakBackup());
    leeg();
    const gelezen = leesBackup(tekst);
    expect(gelezen.ok).toBe(true);
    if (!gelezen.ok) return;
    expect(gelezen.aantal).toEqual({ dossiers: 2, projecten: 3, bronnen: 4 });

    terugzetten(gelezen.backup, false);
    expect(listDossiers().map((d) => d.id).sort()).toEqual(voor.dossiers.map((d) => d.id).sort());
    expect(listProjecten(VOORBEELD_DOSSIER_ID)).toEqual(voor.projecten);
    expect(listBronnen(VOORBEELD_DOSSIER_ID)).toEqual(voor.bronnen);
  });

  it("zet zonder overschrijven niets over een bestaand dossier met dezelfde id", () => {
    laadVoorbeeldDossier();
    const tekst = JSON.stringify(maakBackup());
    // Het bestaande dossier is in de tussentijd gewijzigd.
    upsertDossier({ ...listDossiers().find((d) => d.id === VOORBEELD_DOSSIER_ID)!, dossiernaam: "Aangepast" });
    const gelezen = leesBackup(tekst);
    if (gelezen.ok === false) throw new Error(gelezen.fout);
    const r = terugzetten(gelezen.backup, false);
    expect(r).toEqual({ toegevoegd: 0, vervangen: 0, overgeslagen: 1 });
    expect(listDossiers().find((d) => d.id === VOORBEELD_DOSSIER_ID)?.dossiernaam).toBe("Aangepast");
  });

  it("vervangt met overschrijven het dossier én zijn kostenplaatsen en bronnen, zonder restanten", () => {
    laadVoorbeeldDossier();
    const tekst = JSON.stringify(maakBackup());
    addProject(VOORBEELD_DOSSIER_ID, "Restant", "wlz");
    const gelezen = leesBackup(tekst);
    if (gelezen.ok === false) throw new Error(gelezen.fout);
    const r = terugzetten(gelezen.backup, true);
    expect(r.vervangen).toBe(1);
    expect(listProjecten(VOORBEELD_DOSSIER_ID).map((p) => p.naam).sort()).toEqual(["Wmo-team", "Zvw-team"]);
  });

  it("weigert een bestand dat geen back-up van deze app is", () => {
    const r = leesBackup(JSON.stringify({ app: "andere-app", versie: 1, dossiers: [], projecten: [], bronnen: [] }));
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.fout).toMatch(/geen back-up van deze app/);
  });

  it("weigert een onbekende versie", () => {
    const r = leesBackup(JSON.stringify({ app: BACKUP_APP, versie: 9, dossiers: [], projecten: [], bronnen: [] }));
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.fout).toMatch(/Versie 9/);
  });

  it("weigert een bestand dat geen geldige JSON is", () => {
    const r = leesBackup("dit is geen json {");
    expect(r.ok).toBe(false);
  });

  it("weigert een bron zonder type of een kostenplaats van een dossier dat ontbreekt", () => {
    const basisDossier = { id: "d1", bedrijfsnaam: "x", dossiernaam: "y", periode_van: "", periode_tot: "", periode_type: "maand", controle_type: "basiscontrole", status: "nieuw", aangemaakt_op: "" };
    const zonderType = leesBackup(JSON.stringify({
      app: BACKUP_APP, versie: 1, dossiers: [basisDossier], projecten: [],
      bronnen: [{ id: "b", dossier_id: "d1", headers: [], rijen: [] }],
    }));
    expect(zonderType.ok).toBe(false);
    const wees = leesBackup(JSON.stringify({
      app: BACKUP_APP, versie: 1, dossiers: [], projecten: [{ id: "p", dossier_id: "ontbreekt", naam: "x" }], bronnen: [],
    }));
    expect(wees.ok).toBe(false);
  });
});
