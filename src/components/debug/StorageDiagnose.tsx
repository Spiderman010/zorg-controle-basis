import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const KEYS = ["zcb.dossiers.v1", "zcb.bronnen.v1", "zcb.mappings.v1"] as const;

interface KeySnapshot {
  key: string;
  aanwezig: boolean;
  aantalBytes: number;
  parseFout?: string;
  aantalItems?: number;
  dossierNamen?: string[];
  ruw?: string;
}

function inspect(key: string): KeySnapshot {
  const raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  if (raw === null) return { key, aanwezig: false, aantalBytes: 0 };
  const snap: KeySnapshot = { key, aanwezig: true, aantalBytes: raw.length, ruw: raw };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      snap.aantalItems = parsed.length;
      if (key === "zcb.dossiers.v1") {
        snap.dossierNamen = parsed
          .map((d: { bedrijfsnaam?: string; dossiernaam?: string }) =>
            `${d?.bedrijfsnaam ?? "?"} — ${d?.dossiernaam ?? "?"}`,
          )
          .slice(0, 50);
      }
    } else if (parsed && typeof parsed === "object") {
      snap.aantalItems = Object.keys(parsed).length;
    }
  } catch (e) {
    snap.parseFout = e instanceof Error ? e.message : String(e);
  }
  return snap;
}

export function StorageDiagnose() {
  const [tick, setTick] = useState(0);
  const [toonRuw, setToonRuw] = useState<Record<string, boolean>>({});
  const snapshots = useMemo(() => KEYS.map(inspect), [tick]);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Localstorage-diagnose</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Alle dossierdata staat uitsluitend in de localStorage van deze browser op deze URL
          (<span className="font-mono">{origin}</span>). Hieronder zie je exact wat de app kan lezen.
          Zie je "Adequaat Zorg" hier niet staan, dan is het dossier op deze URL nooit aangemaakt,
          of is de site-data van deze URL gewist. Andere URL's (preview, gepubliceerd, localhost) en
          andere browsers/profielen hebben hun eigen aparte opslag.
        </p>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setTick((t) => t + 1)}>
            Opnieuw inlezen
          </Button>
        </div>

        <ul className="space-y-3">
          {snapshots.map((s) => (
            <li key={s.key} className="rounded border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs">{s.key}</span>
                <span
                  className={
                    s.aanwezig ? "text-success text-xs font-medium" : "text-destructive text-xs font-medium"
                  }
                >
                  {s.aanwezig ? `aanwezig (${s.aantalBytes} bytes)` : "niet aanwezig"}
                </span>
              </div>

              {s.parseFout && (
                <p className="mt-2 text-destructive">JSON-parsefout: {s.parseFout}</p>
              )}

              {s.aanwezig && s.aantalItems !== undefined && (
                <p className="mt-2 text-muted-foreground">Aantal records: {s.aantalItems}</p>
              )}

              {s.dossierNamen && (
                <div className="mt-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Gevonden dossiers
                  </div>
                  {s.dossierNamen.length === 0 ? (
                    <p className="text-muted-foreground">Geen dossiers in deze key.</p>
                  ) : (
                    <ul className="mt-1 list-disc pl-5">
                      {s.dossierNamen.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {s.aanwezig && s.ruw && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setToonRuw((prev) => ({ ...prev, [s.key]: !prev[s.key] }))
                    }
                  >
                    {toonRuw[s.key] ? "Verberg ruwe JSON" : "Toon ruwe JSON"}
                  </Button>
                  {toonRuw[s.key] && (
                    <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2 text-xs">
                      {s.ruw}
                    </pre>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
