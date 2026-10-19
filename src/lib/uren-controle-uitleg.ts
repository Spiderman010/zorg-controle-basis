// Uitleg in gewone taal bij een regel van de uren-controle, per kostenplaats.
// Alleen weergave: de berekening en de status komen uit src/core en worden hier niet gewijzigd.
import type { UrenVerbandRegel } from "@/core";

const uren = (n: number) => n.toLocaleString("nl-NL", { maximumFractionDigits: 1 });
const procent = (a: number) => `${a > 0 ? "+" : ""}${(a * 100).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%`;

export interface UitlegRegel {
  /** Wat er aan de hand is, in gewone taal. */
  uitleg: string;
  /** Eén zin: wat de gebruiker nu kan doen. De app past zelf niets aan. */
  watNu: string;
}

export function uitlegRegel(r: UrenVerbandRegel): UitlegRegel {
  const onzeker = r.onzeker ? " Let op: nog niet vastgesteld of deze stroom in uren declareert (Wlz)." : "";
  const totaal = r.project_id === "totaal" ? " Niet per kostenplaats vergeleken: koppel de uren aan kostenplaatsen." : "";

  if (r.status === "grijs") {
    return { uitleg: `Niet vergeleken: ${r.reden}.`, watNu: "Geen actie: deze stroom hoort niet in deze controle." };
  }
  if (r.reden.startsWith("geen uren aan beide kanten")) {
    return { uitleg: "Geen uren aan beide kanten.", watNu: "Geen actie nodig." };
  }
  if (r.reden.startsWith("gedeclareerd zonder")) {
    return {
      uitleg: `Gedeclareerd zonder gewerkte directe uren: er staat ${uren(r.declared_hours)} uur declaratie tegenover geen directe uren.${onzeker}${totaal}`,
      watNu: "Wat nu? Controleer of de directe uren in de bron ontbreken, of of deze declaratie juist is.",
    };
  }
  if (r.reden.startsWith("gewerkt zonder")) {
    return {
      uitleg: `Gewerkt zonder declaratie: ${uren(r.worked_hours)} directe uren zijn niet gedeclareerd.${onzeker}${totaal}`,
      watNu: "Wat nu? Controleer of deze uren gedeclareerd hadden moeten worden.",
    };
  }

  const a = r.afwijking ?? 0;
  const verschil = r.declared_hours - r.worked_hours;

  if (r.status === "groen") {
    return { uitleg: `Binnen de marge: gedeclareerd en gewerkt komen overeen (${procent(a)}).${onzeker}${totaal}`, watNu: "Geen actie nodig." };
  }
  if (a > 0) {
    return {
      uitleg:
        `Te veel gedeclareerd: ${uren(verschil)} uur meer dan de gewerkte directe uren (${procent(a)}). ` +
        `Meer declareren dan gewerkt is het grootste risico, omdat het tot terugvordering kan leiden.${onzeker}${totaal}`,
      watNu:
        r.status === "rood"
          ? "Wat nu? Controleer de declaraties van deze kostenplaats en bespreek de verschillen met de klant voordat er terugvordering dreigt."
          : "Wat nu? Vraag de klant de verschillen na te lopen.",
    };
  }
  return {
    uitleg: `Te weinig gedeclareerd: ${uren(-verschil)} uur minder dan de gewerkte directe uren (${procent(a)}). Dat is gemiste omzet.${onzeker}${totaal}`,
    watNu:
      r.status === "rood"
        ? "Wat nu? Ga na of gewerkte uren niet zijn gedeclareerd, en bespreek dit met de klant."
        : "Wat nu? Vraag de klant of alle gewerkte uren zijn gedeclareerd.",
  };
}
