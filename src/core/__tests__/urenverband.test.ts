import { describe, it, expect } from "vitest";
import { computeUrenVerband, runChecks, summarize, ALGEMEEN_PROJECT_ID, type Dataset, type DeclaredHoursRecord, type DirectHoursRecord } from "../index";

const basis = { dossier_id: "d", period: "2026-09", source_file: "test", import_status: "valid" as const };
const gewerkt = (project_id: string | undefined, direct_hours: number): DirectHoursRecord => ({ ...basis, employee_id: "m1", direct_hours, project_id });
const gedecl = (project_id: string | undefined, declared_hours: number, extra: Partial<DeclaredHoursRecord> = {}): DeclaredHoursRecord =>
  ({ ...basis, declared_hours, project_id, in_hours: "ja", ...extra });

const projecten = [
  { id: "A", naam: "A Wijkverpleging", stroom: "zvw" as const },
  { id: "B", naam: "B Wmo", stroom: "wmo" as const },
  { id: "C", naam: "C Zvw", stroom: "zvw" as const },
  { id: "D", naam: "D Wlz verblijf", stroom: "wlz" as const },
  { id: "E", naam: "E Eenheden", stroom: "wmo" as const },
  { id: "F", naam: "F Geen uren", stroom: "zvw" as const },
  { id: "G", naam: "G Geen declaratie", stroom: "zvw" as const },
  { id: "H", naam: "H Correctie", stroom: "zvw" as const },
];

// Fictief dossier "Zorg Voorbeeld BV", september 2026
const fictief: Dataset = {
  direct_hours: [
    gewerkt("A", 421), gewerkt("B", 300), gewerkt("C", 330), gewerkt("D", 744),
    gewerkt("E", 200), gewerkt("G", 40), gewerkt("H", 90),
  ],
  declared_hours: [
    gedecl("A", 420), gedecl("B", 330), gedecl("C", 300), gedecl("D", 0, { in_hours: "nee" }),
    gedecl("E", 200), gedecl("F", 40), gedecl("H", 100), gedecl("H", -10, { is_correction: true }),
  ],
};

describe("urenverband: fictief dossier met acht situaties", () => {
  const r = computeUrenVerband(fictief, { projecten });
  const regel = (id: string) => r.regels.find((x) => x.project_id === id)!;
  it("is uitvoerbaar en niveau project", () => {
    expect(r.uitvoerbaar).toBe(true);
    expect(r.niveau).toBe("project");
  });
  it("A: bijna gelijk is groen", () => expect(regel("A").status).toBe("groen"));
  it("B: 10% te veel gedeclareerd is rood", () => {
    expect(regel("B").status).toBe("rood");
    expect(regel("B").afwijking).toBeCloseTo(0.1, 6);
  });
  it("C: 9% te weinig gedeclareerd is oranje", () => expect(regel("C").status).toBe("oranje"));
  it("D: stroom zonder uren (Wlz-verblijf) blijft grijs", () => {
    expect(regel("D").status).toBe("grijs");
    expect(regel("D").reden).toMatch(/niet in uren/);
  });
  it("E: gelijk is groen", () => expect(regel("E").status).toBe("groen"));
  it("F: gedeclareerd zonder gewerkte uren is rood", () => expect(regel("F").status).toBe("rood"));
  it("G: gewerkt zonder declaratie is oranje", () => expect(regel("G").status).toBe("oranje"));
  it("H: correctie wordt gesaldeerd en is dan groen", () => {
    expect(regel("H").declared_hours).toBe(90);
    expect(regel("H").status).toBe("groen");
  });
  it("totaal en eindstatus tellen alleen vergelijkbare projecten (D niet)", () => {
    expect(r.totaal_declared).toBe(1380);
    expect(r.totaal_worked).toBe(1381);
    expect(r.status).toBe("rood");
    expect(r.aantal).toEqual({ groen: 3, oranje: 2, rood: 2, grijs: 1 });
  });
});

describe("urenverband: drempels (te veel streng, te weinig ruimer)", () => {
  const check = (declared: number) => computeUrenVerband(
    { direct_hours: [gewerkt("A", 1000)], declared_hours: [gedecl("A", declared)] }, { projecten },
  ).regels[0].status;
  it.each([
    [1000, "groen"], [1010, "groen"], [1011, "oranje"], [1030, "oranje"], [1031, "rood"],
    [950, "groen"], [949, "oranje"], [850, "oranje"], [849, "rood"],
  ])("%s gedeclareerd tegen 1000 gewerkt is %s", (decl, verwacht) => expect(check(decl)).toBe(verwacht));

  it("drempels zijn per stroom in te stellen", () => {
    const ruim = { teVeel: { oranje: 0.05, rood: 0.1 }, teWeinig: { oranje: 0.1, rood: 0.2 } };
    const ds: Dataset = { direct_hours: [gewerkt("B", 1000)], declared_hours: [gedecl("B", 1040)] };
    expect(computeUrenVerband(ds, { projecten }).regels[0].status).toBe("rood");
    expect(computeUrenVerband(ds, { projecten, drempels_per_stroom: { wmo: ruim } }).regels[0].status).toBe("groen");
  });
});

describe("urenverband: randgevallen", () => {
  it("is grijs zonder gedeclareerde uren", () => {
    const r = computeUrenVerband({ direct_hours: [gewerkt("A", 10)] }, { projecten });
    expect(r).toMatchObject({ uitvoerbaar: false, status: "grijs", reden_niet_uitvoerbaar: "gedeclareerde uren ontbreekt" });
  });
  it("is grijs zonder directe uren", () => {
    const r = computeUrenVerband({ declared_hours: [gedecl("A", 10)] }, { projecten });
    expect(r).toMatchObject({ uitvoerbaar: false, status: "grijs", reden_niet_uitvoerbaar: "directe uren ontbreekt" });
  });
  it("vergelijkt op totaal als de uren niet aan kostenplaatsen zijn gekoppeld", () => {
    const r = computeUrenVerband({ direct_hours: [gewerkt(undefined, 100)], declared_hours: [gedecl("A", 100)] }, { projecten });
    expect(r.niveau).toBe("totaal");
    expect(r.regels).toHaveLength(1);
    expect(r.regels[0].project_id).toBe("totaal");
    expect(r.regels[0].status).toBe("groen");
    expect(r.regels[0].reden).toMatch(/Niet per kostenplaats/);
  });
  it("zet onbekende projecten bij Algemeen", () => {
    const r = computeUrenVerband({ direct_hours: [gewerkt("A", 100), gewerkt("bestaat-niet", 5)], declared_hours: [gedecl("A", 100), gedecl("bestaat-niet", 5)] }, { projecten });
    expect(r.regels.map((x) => x.project_id).sort()).toEqual([ALGEMEEN_PROJECT_ID, "A"].sort());
  });
  it("meldt Wlz zonder verblijf als onzeker, maar rekent wel mee", () => {
    const ds: Dataset = { direct_hours: [gewerkt("D", 100)], declared_hours: [gedecl("D", 100, { in_hours: "onzeker" })] };
    const x = computeUrenVerband(ds, { projecten }).regels[0];
    expect(x.status).toBe("groen");
    expect(x.onzeker).toBe(true);
    expect(x.reden).toMatch(/onzeker/);
  });
  it("negeert ongeldige records en onleesbare getallen", () => {
    const ds: Dataset = {
      direct_hours: [gewerkt("A", 100), { ...gewerkt("A", 999), import_status: "invalid" }],
      declared_hours: [gedecl("A", 100), gedecl("A", NaN), { ...gedecl("A", 999), import_status: "invalid" }],
    };
    expect(computeUrenVerband(ds, { projecten }).regels[0]).toMatchObject({ declared_hours: 100, worked_hours: 100, status: "groen" });
  });
});

describe("urenverband telt niet mee in de hoofdscore", () => {
  it("de negen kerncontroles en de score blijven gelijk met of zonder gedeclareerde uren", () => {
    const zonder = runChecks({ direct_hours: fictief.direct_hours });
    const met = runChecks(fictief);
    expect(met.map((c) => c.id)).toEqual(zonder.map((c) => c.id));
    expect(met).toHaveLength(9);
    expect(summarize(met)).toEqual(summarize(zonder));
  });
});
