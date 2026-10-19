# Handoff — Zorg Controle Basis — 19 oktober 2026

## Wat er gedaan is deze sessie
- Nulmeting van `main` (commit `4a1f9b4`): 81 tests slagen, typecheck en build in orde, `npm ci` faalt, lint 2 fouten
- Loonjournaal-import van Lovable beoordeeld; vier zwakke plekken bevestigd en opgelost (min-teken, terugval op briefhoofd, tekstkolommen, lege periode)
- App vergeleken met de Nedap Ons-patronen vanuit de rol als controleur
- `ROADMAP.md` (v0.3) opgesteld en deze handoff aangemaakt

## Huidige staat
- **Branch:** main
- **Laatste commit:** de commit met patch, `ROADMAP.md` en `HANDOFF.md` (daarvoor `4a1f9b4`)
- **Deploy status:** Lovable-preview, niet gecontroleerd
- **Runtime-fouten:** niet gemeten
- **Tests:** verwacht 13 testbestanden en 86 tests

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
Draai `git pull` en `npx vitest run` (verwacht 86 tests), upload daarna `Journaalposten.pdf` opnieuw en stuur de ruwe uitvoer van `pdfItemsNaarTabel()` mee.

## Bestanden gewijzigd
- `src/lib/bronnen.ts` — loonjournaal: min-teken, geen terugval op briefhoofd, tekstkolommen, lege periode
- `src/lib/loonjournaal-randgevallen.test.ts` — vijf nieuwe tests
- `ROADMAP.md`, `HANDOFF.md` — nieuw

## Belangrijke context
- Rol: de app is een onafhankelijke tweede lijn. Uren en bedragen komen van de klant; de app corrigeert of fiatteert niets
- Werkwijze net als BoekAssist: Claude levert bestanden, gebruiker kopieert, draait `npx vitest run`, commit en push
- `src/core/` alleen wijzigen na expliciete toestemming (zie `CLAUDE.md`)
- Periode van het loonjournaal valt terug op de afdrukdatum als er geen label "Periode" staat (open vraag 7)
