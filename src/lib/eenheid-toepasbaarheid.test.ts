import { describe, it, expect } from "vitest";
import { declareertInUren, leesGedeclareerdeUren, valideerBron, type BronBestand } from "./bronnen";

const maakBron = (headers: string[], rijen: string[][], mapping: Record<string, string>, extra: Partial<BronBestand> = {}): BronBestand => ({
  id: "x", dossier_id: "d", bestandsnaam: "declaratie.csv", geupload_op: "", type: "gedeclareerde_uren",
  type_auto_herkend: true, type_bevestigd: true, headers, rijen, preview_rows: 5, mapping, ...extra,
});

describe("eenheid die de gebruiker zelf kiest", () => {
  const headers = ["Periode", "Aantal"];
  const mapping = { periode: "Periode", gedeclareerde_uren: "Aantal" };
  it("telt de gekozen eenheid mee en meldt dat hij gekozen is", () => {
    const r = leesGedeclareerdeUren(maakBron(headers, [["2026-09", "120"]], mapping, { eenheid: "minuten" }));
    expect(r[0]).toMatchObject({ uren: 2, eenheid: "minuten", eenheidBron: "gekozen" });
  });
  it("wint van de kolomnaam", () => {
    const b = maakBron(["Periode", "Gedeclareerde uren"], [["2026-09", "120"]], { periode: "Periode", gedeclareerde_uren: "Gedeclareerde uren" }, { eenheid: "minuten" });
    expect(leesGedeclareerdeUren(b)[0].uren).toBe(2);
  });
  it("zonder keuze blijft het automatisch gaan", () => {
    const b = maakBron(["Periode", "Gedeclareerde minuten"], [["2026-09", "120"]], { periode: "Periode", gedeclareerde_uren: "Gedeclareerde minuten" });
    expect(leesGedeclareerdeUren(b)[0]).toMatchObject({ uren: 2, eenheidBron: "kolomnaam" });
  });
  it("een gekozen eenheid haalt de waarschuwing 'eenheid niet herkend' weg", () => {
    const zonder = valideerBron(maakBron(headers, [["2026-09", "40"]], mapping));
    const met = valideerBron(maakBron(headers, [["2026-09", "40"]], mapping, { eenheid: "uren" }));
    expect(zonder.status).toBe("oranje");
    expect(met.status).toBe("groen");
  });
  it("dagen als gekozen eenheid geeft geen uren", () => {
    const r = leesGedeclareerdeUren(maakBron(headers, [["2026-09", "30"]], mapping, { eenheid: "dagen" }));
    expect(r[0]).toMatchObject({ uren: undefined, reden: "dagen" });
  });
});

describe("welke stromen declareren in uren", () => {
  it.each([
    ["Zvw wijkverpleging", "ja"], ["Zvw", "ja"], ["Wmo", "ja"], ["PGB", "ja"], ["Jeugdwet", "ja"],
    ["onderaanneming", "ja"], ["", "ja"], [undefined, "ja"],
    ["Wlz verblijf", "nee"], ["WLZ intramuraal", "nee"], ["Wlz ZZP 5", "nee"],
    ["WLZ", "onzeker"], ["Wlz VPT", "onzeker"], ["Wlz thuis", "onzeker"],
  ])("%s is %s", (stroom, verwacht) => expect(declareertInUren(stroom as string | undefined)).toBe(verwacht));
});

describe("fictief dossier met meerdere stromen", () => {
  const headers = ["Periode", "Stroom", "Aantal", "Eenheid"];
  const rijen = [
    ["2026-09", "Zvw wijkverpleging", "25200", "minuten"],
    ["2026-09", "Wmo", "2400", "5 minuten"],
    ["2026-09", "Wlz verblijf", "31", "dagen"],
    ["2026-09", "WLZ", "80", "uren"],
    ["2026-09", "PGB", "12,5", "uren"],
  ];
  const mapping = { periode: "Periode", gedeclareerde_uren: "Aantal", financieringsstroom: "Stroom", eenheid: "Eenheid" };
  const b = maakBron(headers, rijen, mapping);
  it("rekent per stroom goed om en laat Wlz-verblijf buiten de uren", () => {
    const r = leesGedeclareerdeUren(b);
    expect(r.map((x) => x.uren)).toEqual([420, 200, undefined, 80, 12.5]);
    expect(r[2]).toMatchObject({ toepasbaar: "nee", reden: "niet_in_uren" });
    expect(r[3].toepasbaar).toBe("onzeker");
  });
  it("meldt dit als signalen zonder de bron oranje te maken", () => {
    const v = valideerBron(b);
    expect(v.status).toBe("groen");
    expect(v.signalen.join(" ")).toMatch(/niet in uren/);
    expect(v.signalen.join(" ")).toMatch(/Wlz zonder verblijf/);
  });
});
