# Handoff — Zorg Controle Basis — 19 oktober 2026

## Wat er gedaan is deze sessie
- Nulmeting van `main` (commit `4a1f9b4`): 81 tests slagen, typecheck en build in orde, `npm ci` faalt, lint 2 fouten
- Loonjournaal-import van Lovable beoordeeld; vier zwakke plekken bevestigd en opgelost (min-teken, terugval op briefhoofd, tekstkolommen, lege periode)
- App vergeleken met de Nedap Ons-patronen vanuit de rol als controleur
- `ROADMAP.md` (v0.3) opgesteld en deze handoff aangemaakt
- Getalfout opgelost: bedragen en uren met een decimale punt (uit Excel en herkende PDF's) werden 10 tot 100 keer te groot gelezen. Nu één gedeelde functie `parseGetal`, met tests
- Stap 2.0.1 gebouwd: brontype "gedeclareerde uren" via Excel of CSV. Kolommen en eenheid worden geraden en met één klik bevestigd. Nog niet in de score en nog niet aan projecten te koppelen
- `ROADMAP.md` staat op versie 0.5 (2.0.0 en 2.0.1 afgevinkt, 2.0.3b toegevoegd)

## Huidige staat
- **Branch:** `verbandcontrole-uren` (vanaf `3eb815d`, nog niet gemerged naar `main`)
- **Laatste commit:** `bd28968` — "ROADMAP 0.5 en HANDOFF bijgewerkt" (deze HANDOFF-correctie komt daarna als eigen commit)
- **Pull request:** nog niet gemaakt en niet gemerged; link: https://github.com/Spiderman010/zorg-controle-basis/compare/main...verbandcontrole-uren
- **Deploy status:** Lovable-preview, niet gecontroleerd
- **Runtime-fouten:** niet gemeten
- **Tests:** 16 testbestanden en 121 tests, alles groen; typecheck, lint en build in orde

## Openstaande taken
- [ ] Pull request maken van `verbandcontrole-uren` naar `main` en mergen
- [ ] `package-lock.json` committen (`npm install` is lokaal gedraaid)
- [ ] `Journaalposten.pdf` opnieuw uploaden en de ruwe uitvoer van `pdfItemsNaarTabel()` (geanonimiseerd) bewaren als testvoorbeeld
- [ ] Open vragen 1, 2 en 12 in `ROADMAP.md` beantwoorden (grootboekexport, vergelijking van het loonjournaal, declaratiebestand)
- [ ] Daarna kiezen: stap 2.0.2 (factuurregels, nodig voor PGB) of stap 2.0.3 (eenheden omrekenen, eenheid-kiezer, toepasbaarheid per stroom)

## Bekende problemen
- 4 van de 9 kerncontroles blijven grijs: `secondary_totals` wordt nergens gevuld (alleen op de debug-pagina)
- `npm ci` faalt tot de lockfile is gecommit
- Lint: 2 fouten in shadcn-bestanden (`command.tsx`, `textarea.tsx`); `npm audit`: 17 hoge meldingen in afhankelijkheden
- Opslag alleen in de browser (`localStorage`): een gewist profiel kost dossiers

## Volgende sessie: begin hier
Draai `git pull` en `npx vitest run` (verwacht 121 tests). Laat daarna een geanonimiseerd declaratiebestand van een klant inlezen via het brontype "gedeclareerde uren" (onderdeel 2.0.1, open vraag 12 in `ROADMAP.md`), en controleer of de kolommen en eenheid goed worden geraden.

## Bestanden gewijzigd
- `HANDOFF.md` — deze sessie bijgewerkt (gedaan, huidige staat, openstaande taken, bestanden)
- `ROADMAP.md` — versie 0.5: 2.0.0 en 2.0.1 afgevinkt, 2.0.3b toegevoegd, getalfout in Fase 0, logboekregel 0.5
- `src/components/bronnen/UploadTab.tsx` — brontype "gedeclareerde uren" in de keuzelijst; de kaarten komen uit de gedeelde lijst `ALLE_BRONTYPEN`
- `src/lib/bronnen.ts` — herkenning van gedeclareerde uren (kolommen en eenheid raden); nieuwe functie `parseGetal` voor de getalfout
- `src/lib/datasetBuilder.ts` — gebruikt `parseGetal` in plaats van een eigen omzetting (getalfout)
- `src/lib/gedeclareerde-uren.test.ts` — nieuw, 14 tests voor gedeclareerde uren
- `src/lib/getal.test.ts` — nieuw, 17 tests voor `parseGetal`
- `src/pages/Dashboard.tsx` — teller "x / bronnen" telt tegen het aantal brontypen uit `ALLE_BRONTYPEN` in plaats van vaste 6

## Belangrijke context
- Rol: de app is een onafhankelijke tweede lijn. Uren en bedragen komen van de klant; de app corrigeert of fiatteert niets
- Werkwijze net als BoekAssist: Claude levert bestanden, gebruiker kopieert, draait `npx vitest run`, commit en push
- `src/core/` alleen wijzigen na expliciete toestemming (zie `CLAUDE.md`)
- Periode van het loonjournaal valt terug op de afdrukdatum als er geen label "Periode" staat (open vraag 7)
