import { describe, it, expect } from "vitest";
import { berekenToerekening, totaalInclusief, filterToerekening } from "@/lib/toerekening";
import type { BronBestand } from "@/lib/bronnen";
import type { Project } from "@/lib/projecten";

const p = (id: string, naam: string, extra: Partial<Project> = {}): Project =>
  ({ id, naam, dossier_id: "d", aangemaakt_op: "", ...extra }) as Project;

const projecten = [p("lea", "Lea's Zorghart", { rol: "opdrachtgever" }), p("m", "M Bouzian", { rol: "client", via_id: "lea" })];
const bron: BronBestand = {
  id: "b", dossier_id: "d", bestandsnaam: "f.pdf", geupload_op: "", type: "zorgopbrengsten",
  type_auto_herkend: true, type_bevestigd: true, headers: ["periode", "bedrag"], preview_rows: 0,
  rijen: [["2026-06", "1500"], ["2026-06", "1.000,50"], ["2026-06", "200"]],
  mapping: { periode: "periode", bedrag: "bedrag" },
  projecttoewijzingen: { 0: "m", 1: "m", 2: "lea" },
};

describe("toerekening", () => {
  const rijen = berekenToerekening([bron], projecten);
  it("cliënt staat onder opdrachtgever en meerdere facturen tellen op", () => {
    expect(rijen).toHaveLength(1);
    expect(rijen[0].kinderen[0].omzet).toBe(2500.5);
  });
  it("opdrachtgevertotaal is inclusief cliënten", () => {
    expect(totaalInclusief(rijen[0]).omzet).toBe(2700.5);
  });
  it("zoeken op cliënt houdt opdrachtgever zichtbaar", () => {
    expect(filterToerekening(rijen, "bouz")[0].kinderen).toHaveLength(1);
  });
});
