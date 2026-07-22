# Zorg Controle Basis — werkregels

## Repo-verificatie (altijd eerst, vóór elke wijziging)
- Controleer remote: `git remote -v` moet `github.com/Spiderman010/zorg-controle-basis` tonen. Zo niet: STOP, verkeerde repo.
- Werk alleen in `C:\Users\eg2450\zorg-controle-basis`. Andere mappen (BoekAssist*, agio-finance) zijn ANDERE projecten — nooit verwarren.
- Vóór elk werkblok: `git pull` (Lovable pusht ook naar `main`).

## Database/opslag
- Dit project heeft GEEN database. Opslag is uitsluitend localStorage: `zcb.dossiers.v1`, `zcb.bronnen.v1`, `zcb.mappings.v1`.
- Supabase-instanties, MCP-tools of credentials van andere projecten (o.a. BoekAssist) horen hier NIET thuis. Nooit een databaseverbinding toevoegen zonder expliciete opdracht.
- Lovable Cloud-activatie gebeurt alleen via Lovable zelf, na expliciete opdracht van de gebruiker.

## Rekenkern
- `src/core/` alleen wijzigen na expliciete toestemming.
- Bij nieuwe berekeningen: unit tests schrijven/updaten (`npx vitest run`).
- Wijzigingen aan statuslogica of scoreberekening: eerst om duiding vragen.

## Overig
- UI-taal: Nederlands. Geen emoji.
- Commit/push alleen op verzoek; commits verschijnen direct in Lovable (twee-richting-sync).
