import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { HerkomstRapportBlok } from "./HerkomstRapportBlok";
import type { BronBestand } from "@/lib/bronnen";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Fictief: "Zorg Voorbeeld BV".
const bron = (over: Partial<BronBestand>): BronBestand => ({
  id: over.bestandsnaam ?? "x", dossier_id: "d", bestandsnaam: "bestand.csv", geupload_op: "", type: "zorgopbrengsten",
  type_auto_herkend: false, type_bevestigd: true, headers: [], rijen: [], preview_rows: 0, ...over,
});

describe("rapportblok Herkomst van de gegevens", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("toont de tabel, de samenvatting en de vaste zin over de rol van de controle", () => {
    act(() =>
      root.render(
        <HerkomstRapportBlok
          bronnen={[
            bron({ bestandsnaam: "Declaratie september.csv", type: "gedeclareerde_uren", herkomst: { manier: "zelf_opgehaald", systeem: "Voorbeeldsysteem", export_datum: "2026-10-01" } }),
            bron({ bestandsnaam: "Loonkosten september.csv", type: "personeelskosten" }),
          ]}
        />,
      ),
    );
    const t = container.textContent ?? "";
    expect(t).toContain("Herkomst van de gegevens");
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(t).toContain("Voorbeeldsysteem");
    expect(t).toContain("01-10-2026");
    expect(t).toContain("1 bron zelf opgehaald, 1 zonder vastgelegde herkomst");
    expect(t).toContain("De gegevens komen van de klant uit eigen systemen. Deze controle stelt zelf geen uren of bedragen vast.");
  });
});
