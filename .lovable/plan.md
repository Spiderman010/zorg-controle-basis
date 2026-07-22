
# Onderzoek: dossier "Adequaat Zorg" niet zichtbaar

## Wat we al weten (geverifieerd)

- De opslag-keys in de code zijn **onveranderd**: `zcb.dossiers.v1`, `zcb.bronnen.v1`, `zcb.mappings.v1` (`src/lib/dossiers.ts:20`, `src/lib/bronnen.ts:67-68`).
- De laatste commit van Claude (`d99c937` — financieringsmix) raakt geen storage-keys of dossier-schema. Alleen `core/`, `MappingTab.tsx`, `datasetBuilder.ts`, `DossierControle.tsx` zijn aangepast. Er is dus **geen codewijziging die bestaande dossiers uit localStorage haalt**.
- GitHub bevat alleen code, geen data. "Verhuizen naar GitHub" kan geen dossiers hebben verwijderd.

Meest waarschijnlijke oorzaak: je kijkt op een andere URL / browser / profiel dan waar je "Adequaat Zorg" hebt aangemaakt, of de site-data van lovable.app is gewist.

## Onderzoeksstappen

### 1. Bevestig op welke omgeving je "Adequaat Zorg" hebt aangemaakt
Ik vraag je:
- Op welke URL zag je het dossier eerder (preview-URL `id-preview--...lovable.app`, gepubliceerde URL, of `localhost`)?
- Welke browser + profiel gebruikte je toen, en welke gebruik je nu?

### 2. Controleer je browser-localStorage
Open in de browser waar je "Adequaat Zorg" had aangemaakt:
- F12 → tab **Application** (Chrome/Edge) of **Opslag** (Firefox)
- Links: **Local Storage** → klik op de lovable.app-URL
- Kijk of de key `zcb.dossiers.v1` bestaat en of "Adequaat Zorg" in de JSON-waarde voorkomt

Drie mogelijke uitkomsten:
- **Key bestaat + naam staat erin** → data is er nog, probleem zit in de app (dan verder onderzoeken).
- **Key bestaat maar naam ontbreekt** → dossier is ooit verwijderd of nooit op deze URL aangemaakt.
- **Key ontbreekt volledig** → site-data van deze URL is gewist óf je zit op een andere URL/browser dan destijds.

### 3. Bied een redmiddel aan
- Als de JSON in localStorage nog "Adequaat Zorg" bevat maar de app het niet toont: dan bouw ik een klein hersteldiagnose-scherm op `/debug` dat de ruwe inhoud van `zcb.dossiers.v1` toont, zodat we zien wat er precies staat.
- Als de data écht weg is: alleen opnieuw aanmaken kan het herstellen (er is geen back-up zonder cloud).

### 4. Rapportage terug aan jou
Ik geef een duidelijke conclusie: waar de data staat, wat de oorzaak was, en of herstel mogelijk is. Pas daarna bespreken we of Lovable Cloud activeren zinvol is om herhaling te voorkomen.

## Wat dit onderzoek NIET doet

- Geen wijzigingen aan de rekenkern (`src/core/`).
- Geen database of Lovable Cloud activeren.
- Geen dossiers automatisch aanmaken of overschrijven.
- Geen wijziging van storage-keys.

## Wat ik van jou nodig heb voordat ik verder ga

Antwoord op de twee vragen in stap 1 (URL destijds vs nu, en browser). Zonder dat kan ik geen betrouwbare conclusie trekken.
