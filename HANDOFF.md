# Handoff — Zorg Controle Basis — 19 oktober 2026

## Wat er gedaan is deze sessie
- Nulmeting van `main` (commit `4a1f9b4`): 81 tests slagen, typecheck en build in orde, `npm ci` faalt, lint 2 fouten
- Loonjournaal-import van Lovable beoordeeld; vier zwakke plekken bevestigd en opgelost (min-teken, terugval op briefhoofd, tekstkolommen, lege periode)
- App vergeleken met de Nedap Ons-patronen vanuit de rol als controleur
- `ROADMAP.md` (v0.3) opgesteld en deze handoff aangemaakt

## Huidige staat
- **Branch:** `verbandcontrole-uren` (vanaf `3eb815d`, nog niet gemerged naar `main`)
- **Laatste commit:** nog geen commit op deze branch; de wijzigingen staan ongecommit klaar
- **Deploy status:** Lovable-preview, niet gecontroleerd
- **Runtime-fouten:** niet gemeten
- **Tests:** 16 testbestanden en 121 tests, alles groen; typecheck, lint en build in orde

## Openstaande taken
- [ ] `npm install` is lokaal gedraaid: de gewijzigde `package-lock.json` committen
- [ ] `Journaalposten.pdf` verwijderen en opnieuw uploaden, en de ruwe uitvoer van `pdfItemsNaarTabel()` (geanonimiseerd) bewaren als testvoorbeeld
- [ ] Open vraag 1 en 2 in `ROADMAP.md` beantwoorden (grootboekexport, waarmee het loonjournaal wordt vergeleken)
- [ ] Daarna mijlpaal 2.1 (tweede bron) uitwerken; raakt `src/core/`, dus eerst toestemming

## Bekende problemen
- 4 van de 9 kerncontroles blijven grijs: `secondary_totals` wordt nergens gevuld (alleen op de debug-pagina)
- `npm ci` faalt tot de lockfile is gecommit
- Lint: 2 fouten in shadcn-bestanden (`command.tsx`, `textarea.tsx`); `npm audit`: 17 hoge meldingen in afhankelijkheden
- Opslag alleen in de browser (`localStorage`): een gewist profiel kost dossiers

## Volgende sessie: begin hier
Draai `git pull` en `npx vitest run` (verwacht 121 tests). Laat daarna een geanonimiseerd declaratiebestand van een klant inlezen via het brontype "gedeclareerde uren" (onderdeel 2.0.1, open vraag 12 in `ROADMAP.md`), en controleer of de kolommen en eenheid goed worden geraden.

## Bestanden gewijzigd
- `src/lib/bronnen.ts` — loonjournaal: min-teken, geen terugval op briefhoofd, tekstkolommen, lege periode
- `src/lib/loonjournaal-randgevallen.test.ts` — vijf nieuwe tests
- `ROADMAP.md`, `HANDOFF.md` — nieuw

## Belangrijke context
- Rol: de app is een onafhankelijke tweede lijn. Uren en bedragen komen van de klant; de app corrigeert of fiatteert niets
- Werkwijze net als BoekAssist: Claude levert bestanden, gebruiker kopieert, draait `npx vitest run`, commit en push
- `src/core/` alleen wijzigen na expliciete toestemming (zie `CLAUDE.md`)
- Periode van het loonjournaal valt terug op de afdrukdatum als er geen label "Periode" staat (open vraag 7)
