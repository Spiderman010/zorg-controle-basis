import { describe, it, expect, beforeEach } from "vitest";
import { upsertBron, type BronBestand } from "./bronnen";
import { addProject, listProjecten } from "./projecten";
import { buildDataset } from "./datasetBuilder";
import { computeUrenVerband } from "@/core";

const DOSSIER = "uren-dossier";
const bron = (id: string, type: BronBestand["type"], headers: string[], rijen: string[][], mapping: Record<string, string>, extra: Partial<BronBestand> = {}): BronBestand => ({
  id, dossier_id: DOSSIER, bestandsnaam: id + ".csv", geupload_op: "", type, type_auto_herkend: false, type_bevestigd: true,
  headers, rijen, preview_rows: 5, mapping, ...extra,
});

describe("van bronbestanden naar de verbandcontrole (fictief dossier)", () => {
  beforeEach(() => localStorage.clear());

  it("rekent minuten en eenheden om, koppelt aan kostenplaatsen en vergelijkt met directe uren", () => {
    const zvw = addProject(DOSSIER, "Zvw-team", "zvw", undefined, "opdrachtgever");
    const wmo = addProject(DOSSIER, "Wmo-team", "wmo", undefined, "opdrachtgever");
    const wlz = addProject(DOSSIER, "Wlz-huis", "wlz", undefined, "opdrachtgever");
    // Gewerkt: Zvw 421 u, Wmo 300 u, Wlz-verblijf 744 u
    upsertBron(bron("gewerkt", "directe_uren", ["Periode", "Medewerker", "Uren"],
      [["2026-09", "M1", "421"], ["2026-09", "M2", "300,0"], ["2026-09", "M3", "744"]],
      { periode: "Periode", medewerker: "Medewerker", directe_uren: "Uren" },
      { projecttoewijzingen: { 0: zvw.id, 1: wmo.id, 2: wlz.id } }));
    // Gedeclareerd: Zvw 25200 min = 420 u, Wmo 3960 eenheden van 5 min = 330 u, Wlz verblijf 31 dagen
    upsertBron(bron("gedecl", "gedeclareerde_uren", ["Periode", "Stroom", "Aantal", "Eenheid"],
      [["2026-09", "Zvw wijkverpleging", "25200", "minuten"], ["2026-09", "Wmo", "3960", "5 minuten"], ["2026-09", "Wlz verblijf", "31", "dagen"]],
      { periode: "Periode", gedeclareerde_uren: "Aantal", financieringsstroom: "Stroom", eenheid: "Eenheid" },
      { projecttoewijzingen: { 0: zvw.id, 1: wmo.id, 2: wlz.id } }));

    const { dataset } = buildDataset(DOSSIER);
    expect(dataset.declared_hours?.map((r) => r.declared_hours)).toEqual([420, 330, 0]);
    expect(dataset.declared_hours?.map((r) => r.in_hours)).toEqual(["ja", "ja", "nee"]);

    const r = computeUrenVerband(dataset, { projecten: listProjecten(DOSSIER) });
    const status = Object.fromEntries(r.regels.map((x) => [x.naam, x.status]));
    expect(status).toEqual({ "Zvw-team": "groen", "Wmo-team": "rood", "Wlz-huis": "grijs" });
    expect(r.status).toBe("rood");
  });

  it("slaat regels over die niet in uren om te rekenen zijn (dagen, onleesbaar)", () => {
    upsertBron(bron("gedecl", "gedeclareerde_uren", ["Periode", "Aantal", "Eenheid"],
      [["2026-09", "10", "uren"], ["2026-09", "5", "dagen"], ["2026-09", "veel", "uren"]],
      { periode: "Periode", gedeclareerde_uren: "Aantal", eenheid: "Eenheid" }));
    const recs = buildDataset(DOSSIER).dataset.declared_hours ?? [];
    expect(recs.map((r) => r.import_status)).toEqual(["valid", "invalid", "invalid"]);
  });

  it("geeft geen declared_hours als er geen bron van dat type is", () => {
    expect(buildDataset(DOSSIER).dataset.declared_hours).toBeUndefined();
  });
});
