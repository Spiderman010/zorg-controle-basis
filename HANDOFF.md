# Handoff — Zorg Controle Basis — 19 oktober 2026

## Wat er gedaan is deze sessie
- Nulmeting van `main` (commit `4a1f9b4`): 81 tests slagen, typecheck en build in orde, `npm ci` faalt, lint 2 fouten
- Loonjournaal-import van Lovable beoordeeld; vier zwakke plekken bevestigd en opgelost (min-teken, terugval op briefhoofd, tekstkolommen, lege periode)
- App vergeleken met de Nedap Ons-patronen vanuit de rol als controleur
- `ROADMAP.md` (v0.3) opgesteld en deze handoff aangemaakt
- Getalfout opgelost: bedragen en uren met een decimale punt (uit Excel en herkende PDF's) werden 10 tot 100 keer te groot gelezen. Nu één gedeelde functie `parseGetal`, met tests
- Stap 2.0.1 gebouwd: brontype "gedeclareerde uren" via Excel of CSV. Kolommen en eenheid worden geraden en met één klik bevestigd. Nog niet in de score en nog niet aan projecten te koppelen
- `ROADMAP.md` staat op versie 0.5 (2.0.0 en 2.0.1 afgevinkt, 2.0.3b toegevoegd)
- Stap 2.0.3 gebouwd: eenheid-kiezer bij het koppelen van kolommen (gedeclareerde uren) en toepasbaarheid per stroom (`declareertInUren`: ja, nee of onzeker; Wlz-verblijf grijs)
- Stap 2.0.3b gebouwd: gedeclareerde uren koppelen aan een kostenplaats in de stap Classificatie, met een voorstel dat alleen kiest bij één passende kostenplaats
- `ROADMAP.md` staat op versie 0.6
- Stap 2.0.4 gebouwd: verbandcontrole gedeclareerde tegen gewerkte uren per kostenplaats (`src/core/urenverband.ts`), met de kaart "Uren-controle" op het scherm Controle
- Besluit: de uren-controle telt mee in de hoofdscore als tiende kerncontrole (V1-C10). Toestemming voor wijzigingen aan `src/core/` en de scoreberekening is gegeven; de hoofdscore en de dekking gaan nu over 10 controles
- Stap 2.0.5 gebouwd: scherm Uren-controle met uitleg in gewone taal per kostenplaats, een "wat nu?"-zin, en uitsplitsing per cliënt onder een oranje of rode kostenplaats. Alleen weergave; `src/core` is niet aangeraakt

## Huidige staat
- **Branch:** `uren-controle-scherm` (vanaf `main`), nog niet gemerged
- **Laatste commit:** de laatste commit op de branch `uren-controle-scherm`
- **Pull request:** nog niet gemaakt en niet gemerged; link: https://github.com/Spiderman010/zorg-controle-basis/compare/main...uren-controle-scherm
- **Deploy status:** Lovable-preview, niet gecontroleerd
- **Runtime-fouten:** niet gemeten
- **Tests:** 24 testbestanden en 205 tests, alles groen; typecheck zonder fouten, build in orde, lint: 14 bestaande meldingen (2 fouten in shadcn-bestanden)

## Openstaande taken
- [ ] Pull request maken en mergen (branch `uren-controle-scherm` naar `main`)
- [ ] Het scherm Controle in de preview doorlopen met het fictieve dossier: kaart "Uren-controle", de uitleg, de "wat nu?"-zin en de cliënten onder een afwijkende kostenplaats (handmatige doorloop van 2.0.5)
- [ ] `package-lock.json` committen (`npm install` is lokaal gedraaid)
- [ ] `Journaalposten.pdf` opnieuw uploaden en de ruwe uitvoer van `pdfItemsNaarTabel()` (geanonimiseerd) bewaren als testvoorbeeld
- [ ] Open vragen 1, 2, 9, 12 en 13 in `ROADMAP.md` beantwoorden

## Bekende problemen
- 4 van de 10 kerncontroles blijven grijs: `secondary_totals` wordt nergens gevuld (alleen op de debug-pagina)
- `npm ci` faalt tot de lockfile is gecommit
- Lint: 2 fouten in shadcn-bestanden (`command.tsx`, `textarea.tsx`); `npm audit`: 17 hoge meldingen in afhankelijkheden
- Opslag alleen in de browser (`localStorage`): een gewist profiel kost dossiers

## Volgende sessie: begin hier
Draai `git pull` en `npx vitest run` (verwacht 24 testbestanden en 205 tests). Doe daarna de handmatige doorloop van 2.0.5 in de Lovable-preview (scherm Controle, fictief dossier). Begin daarna met de volgende stap uit de roadmap: 2.0.6, aparte tariefcontrole.

## Bestanden gewijzigd
- `ROADMAP.md` — versie 0.9: 2.0.5 afgevinkt, logboekregel 0.9
- `HANDOFF.md` — deze sessie bijgewerkt (gedaan, huidige staat, openstaande taken, bestanden)
- `src/components/controle/UrenVerbandKaart.tsx` — uitleg per kostenplaats, "wat nu?"-zin, cliënten onder een oranje of rode kostenplaats
- `src/components/controle/UrenVerbandKaart.test.tsx` — tests voor de uitsplitsing per cliënt en de weergave
- `src/lib/uren-controle-uitleg.ts` — nieuw: uitleg in gewone taal en de "wat nu?"-zin per regel
- `src/lib/uren-controle-uitleg.test.ts` — nieuw: tests voor de uitleg, met Zorg Voorbeeld BV als voorbeeld
- `src/pages/DossierControle.tsx` — geeft de projecten door aan de kaart; commentaar gecorrigeerd (V1-C10 telt mee)

## Belangrijke context
- Rol: de app is een onafhankelijke tweede lijn. Uren en bedragen komen van de klant; de app corrigeert of fiatteert niets
- Werkwijze net als BoekAssist: Claude levert bestanden, gebruiker kopieert, draait `npx vitest run`, commit en push
- `src/core/` alleen wijzigen na expliciete toestemming (zie `CLAUDE.md`)
- Periode van het loonjournaal valt terug op de afdrukdatum als er geen label "Periode" staat (open vraag 7)
