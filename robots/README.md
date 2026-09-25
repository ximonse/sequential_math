# Klickrobotar

Robotarna använder appen som en elev: de loggar in med kodnamn och PIN, väljer träning, trycker på knapparna på skärmen och svarar. Efter varje steg kontrollerar de sex regler:

| Regel | Innebörd |
| --- | --- |
| R1 | Det jag väljer är det jag får. |
| R2 | Det jag valt ligger kvar tills jag själv ändrar det. |
| R3 | Det jag trycker på händer. |
| R4 | Appen gör ingenting bakom min rygg. |
| C1 | Uppgiften är rätt och går att svara på med knapparna. |
| V1 | Uppgifterna varierar. |

Reglerna är skrivna så att de inte behöver veta hur appen är byggd. De jämför bara det eleven valde med det eleven fick. Därför behöver robotarna inte skrivas om när koden ändras.

## Köra

```bash
npm run robots                       # alla robotar, mot produktionsbygget
npm run robots -- tables             # bara tabellroboten
ROBOT_DEV=1 npm run robots           # mot dev-servern (snabbare start, men React StrictMode kan ge dev-only-fel)
ROBOT_TASKS=300 npm run robots -- operations   # fler uppgifter per område
```

Resultatet hamnar i `robots/report/latest.md`: varje regelbrott med några konkreta exempel. En robot som hittar ett regelbrott blir röd.

Hela sviten tar ungefär 2–3 minuter med sex parallella webbläsare.

## Hur det fungerar

- `robotServer.mjs` startar appen tillsammans med den **riktiga** serverkoden i `api/`. Databasen byts mot en i minnet (`memoryKv.js`), så inget når produktion, Vercel eller riktiga elever.
- `seed.js` skapar klasser och robotelever med kodnamn och PIN, precis som lärarens klasslista gör.
- `lib/app.js` läser uppgiften direkt ur appen, trycker på knapparna och tar sig förbi grattisrutor och pausförslag.
- `lib/checks.js` innehåller reglerna.

| Robot | Vad den gör |
| --- | --- |
| `operations.robot.js` | Väljer vart och ett av de nio områdena och svarar rätt tills nivå 12 är nådd. |
| `tables.robot.js` | Sex olika tabellval, upp till tre rundor var. |
| `pause.robot.js` | Pausspel, nej tack till paus, startsidan och tillbaka, 10 minuter borta, omladdning och ny flik. |
| `buttons.robot.js` | Varje knapp på sifferbordet i sex områden, tangentbordet, tema och kontrast samt in- och utloggning. |
| `training.robot.js` | Fri träning inom klassens räknesätt, Fortsätt träna och en elev som svarar fel på allt. |

## Lägga till en robot

Skapa `robots/<namn>.robot.js`. Använd `createPupil`, `login` och `answerTasks`. Beskriv valet i `choice`: `{ mode }`, `{ tables }` eller `{ allowedOperations }`. Då kontrolleras R1, C1 och R3 automatiskt för varje uppgift. Lägg till egna kontroller med `findings.add(regel, meddelande, detaljer)`.

## Senaste fynd

2026-09-25, produktionsbygget:

- **R3 — Algebra (förenkla): ±-knappen visades men gjorde ingenting.** Rättat i samma ändring som robotarna: ± växlar nu minustecken som i Algebra (räkna ut).
- **R2 (bara i utvecklingsläget) — tema och kontrast återställs vid varje omladdning.** I produktionsbygget ligger de kvar. Se [kontrollkartan](../docs/KONTROLLKARTA.md).
- Inga brott mot R1, R4, C1 eller V1 i tabellträning, alla nio områden genom nivå 1–12, pauser eller fri träning.

### Fångar robotarna verkligen fel?

Tre fel planterades medvetet och togs sedan bort: en tabellkö som lade in fel tabell, subtraktion som en gång gav en additionsuppgift och en 7-knapp som skrev 1. Robotarna fångade alla tre vid första körningen, med konkreta exempel på uppgifterna.

Tidiga regelbrott berodde ofta på roboten själv, till exempel att den läste en gammal kopia av appens tillstånd eller tryckte på "Fortsätt träna" när en tabellrunda var slut. Ett nytt regelbrott ska därför alltid kontrolleras för hand en gång innan koden ändras.
