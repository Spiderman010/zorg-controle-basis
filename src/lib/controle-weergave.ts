// Weergave-regels voor het scherm Controle. Alleen presentatie: de berekening zelf blijft in src/core.
import { computeMetrics, type Dataset } from "@/core";

/**
 * Resturen om te tonen, of null als er geen betaalde uren zijn aangeleverd (geen bron of een totaal van 0).
 * Dan is een getal misleidend: de resturen zijn dan betaalde uren min directe uren, en die betaalde uren ontbreken.
 */
export function resturenTonen(ds: Dataset): number | null {
  const betaald = (ds.paid_hours ?? []).reduce((s, r) => s + (Number.isFinite(r.paid_hours) ? r.paid_hours : 0), 0);
  if (betaald === 0) return null;
  return computeMetrics(ds).remaining_hours;
}
