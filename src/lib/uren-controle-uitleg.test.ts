import { describe, it, expect } from "vitest";
import { uitlegRegel } from "./uren-controle-uitleg";
import type { UrenVerbandRegel } from "@/core";

// Fictief: "Zorg Voorbeeld BV", kostenplaats Zvw-team.
const regel = (over: Partial<UrenVerbandRegel>): UrenVerbandRegel => ({
  project_id: "A",
  naam: "Zvw-team",
  declared_hours: 0,
  worked_hours: 0,
  status: "groen",
  reden: "binnen marge",
  onzeker: false,
  ...over,
});

describe("uitleg per kostenplaats (Zorg Voorbeeld BV)", () => {
  it("legt te veel gedeclareerd uit met uren en procent, en noemt het risico", () => {
    const u = uitlegRegel(regel({ declared_hours: 330, worked_hours: 300, afwijking: 0.1, status: "rood", reden: "te veel gedeclareerd" }));
    expect(u.uitleg).toContain("Te veel gedeclareerd");
    expect(u.uitleg).toContain("30 uur meer");
    expect(u.uitleg).toContain("+10%");
    expect(u.uitleg).toContain("terugvordering");
  });

  it("geeft bij rood te veel een wat-nu-zin die naar de klant verwijst", () => {
    const u = uitlegRegel(regel({ declared_hours: 330, worked_hours: 300, afwijking: 0.1, status: "rood", reden: "te veel gedeclareerd" }));
    expect(u.watNu).toMatch(/^Wat nu\?/);
    expect(u.watNu).toContain("klant");
    expect(u.watNu).not.toContain("\n");
  });

  it("geeft bij oranje te veel een mildere wat-nu-zin", () => {
    const u = uitlegRegel(regel({ declared_hours: 303, worked_hours: 300, afwijking: 0.01, status: "oranje", reden: "iets te veel gedeclareerd" }));
    expect(u.uitleg).toContain("Te veel gedeclareerd");
    expect(u.watNu).toMatch(/^Wat nu\?/);
    expect(u.watNu).toContain("klant");
  });

  it("legt te weinig gedeclareerd uit als gemiste omzet", () => {
    const u = uitlegRegel(regel({ declared_hours: 285, worked_hours: 300, afwijking: -0.05, status: "oranje", reden: "te weinig gedeclareerd" }));
    expect(u.uitleg).toContain("Te weinig gedeclareerd");
    expect(u.uitleg).toContain("15 uur minder");
    expect(u.uitleg).toContain("gemiste omzet");
  });

  it("legt gedeclareerd zonder gewerkte directe uren uit", () => {
    const u = uitlegRegel(regel({ declared_hours: 40, worked_hours: 0, status: "rood", reden: "gedeclareerd zonder gewerkte directe uren" }));
    expect(u.uitleg).toContain("Gedeclareerd zonder gewerkte directe uren");
    expect(u.watNu).toMatch(/^Wat nu\?/);
  });

  it("legt gewerkt zonder declaratie uit", () => {
    const u = uitlegRegel(regel({ declared_hours: 0, worked_hours: 50, status: "oranje", reden: "gewerkt zonder declaratie" }));
    expect(u.uitleg).toContain("Gewerkt zonder declaratie");
    expect(u.uitleg).toContain("50 directe uren");
  });

  it("zegt bij binnen de marge dat er geen actie nodig is", () => {
    const u = uitlegRegel(regel({ declared_hours: 300, worked_hours: 300, afwijking: 0, status: "groen", reden: "binnen marge" }));
    expect(u.uitleg).toContain("Binnen de marge");
    expect(u.watNu).toBe("Geen actie nodig.");
  });

  it("laat een niet-vergelijkbare stroom (Wlz-verblijf) grijs en zonder actie", () => {
    const u = uitlegRegel(regel({ status: "grijs", reden: "stroom declareert niet in uren (bijvoorbeeld Wlz-verblijf)" }));
    expect(u.uitleg).toContain("Niet vergeleken");
    expect(u.uitleg).toContain("Wlz-verblijf");
    expect(u.watNu).toContain("Geen actie");
  });

  it("waarschuwt bij een onzekere Wlz-stroom", () => {
    const u = uitlegRegel(regel({ declared_hours: 330, worked_hours: 300, afwijking: 0.1, status: "rood", reden: "te veel gedeclareerd (Wlz: onzeker)", onzeker: true }));
    expect(u.uitleg).toContain("Let op");
    expect(u.uitleg).toContain("Wlz");
  });

  it("zegt bij het totaal dat er niet per kostenplaats is vergeleken", () => {
    const u = uitlegRegel(regel({ project_id: "totaal", naam: "Totaal", declared_hours: 330, worked_hours: 300, afwijking: 0.1, status: "rood", reden: "te veel gedeclareerd" }));
    expect(u.uitleg).toContain("koppel de uren aan kostenplaatsen");
  });
});
