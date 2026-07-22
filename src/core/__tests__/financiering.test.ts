import { describe, expect, it } from "vitest";
import type { Dataset, RevenueRecord } from "../types";
import {
  computeFinancieringsMix,
  detectStroom,
  financieringsSignaal,
  normalizeStroom,
} from "../financiering";
import { runChecks, summarize } from "../checks";

function rev(amount: number, revenue_type: string, account = ""): RevenueRecord {
  return {
    dossier_id: "d1",
    period: "2026-06",
    source_file: "test.csv",
    import_status: "valid",
    account_code: account,
    account_name: account,
    revenue_type,
    amount,
  };
}

describe("normalizeStroom", () => {
  it("herkent alle wettelijke kaders", () => {
    expect(normalizeStroom("WLZ")).toBe("wlz");
    expect(normalizeStroom("Zvw wijkverpleging")).toBe("zvw");
    expect(normalizeStroom("WMO begeleiding")).toBe("wmo");
    expect(normalizeStroom("Jeugdwet")).toBe("jeugdwet");
    expect(normalizeStroom("PGB")).toBe("pgb");
    expect(normalizeStroom("onderaanneming")).toBe("onderaanneming");
    expect(normalizeStroom("particulier")).toBe("overig");
  });

  it("PGB gaat vóór WLZ bij gecombineerde tekst", () => {
    expect(normalizeStroom("WLZ PGB")).toBe("pgb");
  });

  it("geeft null bij lege of onbekende waarde", () => {
    expect(normalizeStroom(undefined)).toBeNull();
    expect(normalizeStroom("")).toBeNull();
    expect(normalizeStroom("8000 Omzet algemeen")).toBeNull();
  });

  it("detectStroom herkent stroom uit rekeningnaam", () => {
    expect(detectStroom("8010 Opbrengsten WLZ")).toBe("wlz");
    expect(detectStroom("8020 Omzet gemeente WMO")).toBe("wmo");
  });
});

describe("computeFinancieringsMix", () => {
  it("verdeelt bedragen per stroom met aandeel", () => {
    const ds: Dataset = { revenue: [rev(600, "wlz"), rev(300, "wmo"), rev(100, "onbekend")] };
    const mix = computeFinancieringsMix(ds);
    expect(mix.totaal).toBe(1000);
    expect(mix.aantalKaders).toBe(2);
    expect(mix.onbekendBedrag).toBe(100);
    const wlz = mix.entries.find((e) => e.stroom === "wlz")!;
    expect(wlz.amount).toBe(600);
    expect(wlz.share).toBeCloseTo(0.6);
  });

  it("sommeert meerdere regels binnen dezelfde stroom", () => {
    const ds: Dataset = { revenue: [rev(100, "pgb"), rev(150, "PGB budget")] };
    const mix = computeFinancieringsMix(ds);
    expect(mix.entries).toHaveLength(1);
    expect(mix.entries[0].amount).toBe(250);
    expect(mix.aantalKaders).toBe(1);
  });

  it("negeert invalid records en lege dataset geeft lege mix", () => {
    const bad = { ...rev(999, "wlz"), import_status: "invalid" as const };
    expect(computeFinancieringsMix({ revenue: [bad] }).entries).toHaveLength(0);
    expect(computeFinancieringsMix({}).entries).toHaveLength(0);
  });

  it("share is undefined bij totaal 0 (geen deling door nul)", () => {
    const ds: Dataset = { revenue: [rev(100, "wlz"), rev(-100, "wmo")] };
    const mix = computeFinancieringsMix(ds);
    expect(mix.totaal).toBe(0);
    for (const e of mix.entries) expect(e.share).toBeUndefined();
  });
});

describe("financieringsSignaal", () => {
  it("grijs zonder opbrengsten", () => {
    const s = financieringsSignaal(computeFinancieringsMix({}));
    expect(s.status).toBe("grijs");
  });

  it("grijs als geen stroom herkend is", () => {
    const s = financieringsSignaal(computeFinancieringsMix({ revenue: [rev(100, "onbekend")] }));
    expect(s.status).toBe("grijs");
  });

  it("groen bij één wettelijk kader", () => {
    const s = financieringsSignaal(computeFinancieringsMix({ revenue: [rev(100, "wlz"), rev(50, "particulier")] }));
    expect(s.status).toBe("groen");
    expect(s.message).toContain("WLZ");
  });

  it("oranje bij twee of meer kaders, nooit rood", () => {
    const s = financieringsSignaal(
      computeFinancieringsMix({ revenue: [rev(100, "wlz"), rev(100, "wmo"), rev(100, "pgb")] }),
    );
    expect(s.status).toBe("oranje");
    expect(s.message).toContain("3 wettelijke kaders");
  });

  it("telt niet mee in de hoofdscore", () => {
    const ds: Dataset = { revenue: [rev(100, "wlz"), rev(100, "wmo")] };
    const zonderMix = summarize(runChecks(ds));
    // Het signaal staat buiten runChecks; de score-invoer verandert dus niet.
    expect(zonderMix.total).toBe(8);
  });
});
