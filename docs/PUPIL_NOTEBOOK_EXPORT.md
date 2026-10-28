# Skrivskyddat original från räknehäftet

Lokalt byggt 2026-10-27 utifrån `agent-tooling-notes.md`. Den andra agentens
anteckningar, teacher-data-skill och issue #18–21 har inte skrivits om.
Detta är en gemensam byggdel för genomgång och framtida elevdokument.

## API

Lista först elevunderlag för exakt elev/klass/Stockholm-period och källa
`screening` eller `all`. Använd ref och revision från samma underlag:

```text
GET /api/teacher-students/PUPIL?resource=evidence&classId=CLASS&from=2026-10-27&to=2026-10-27&source=screening&ref=REF&snapshotRevision=REVISION&format=notebook
x-teacher-token: LOCAL_TEACHER_TOKEN
```

Samma levande autentisering, klass-/elevåtkomst, screeningroll och pilotgräns
som övriga underlagsanrop. Ändrad källa ger 409, observation utan häfte 404,
ogiltigt format eller saknad ref/revision 400. Ingen ny lärarroll införs.

Svaret innehåller källreferens/revision och `notebook`:

- `workspace`: sparade slutceller, minnessiffror, överstrykningar, streck och
  ritning. Ingen händelselogg eller fabricerade mellanled.
- `bounds`: första/sista rad/kolumn, nollbaserade. Hela rutor inklusive tomma
  som streck går över. Tomt häfte får en ruta.
- `rows`, `columns`, `cellAspectRatio: 1.6`: beskärningens rutmått.
- `text`: koordinater och innehåll. `·` = tom ruta, `{note:12}` = liten siffra,
  `{struck}` = överstrykning. Båda linjegeometrierna bevaras. Ritning transkriberas inte.
- `status`: `answerEmpty`, `gridHasContent`, `drawingHasStrokes`,
  `workWithoutAnswer`, `occupiedCells`, `resultInterpretation: not_inferred`.

Status finns även under `answer` i screeninglistan. Sparat arbete utan svar
är en observation, inte bevis för ett resultat. Raderade pennstreck kan finnas
kvar i ritningens lista; `drawingHasStrokes` tolkar inte synligt bläck.
Valfrågors tomma svar bedöms utifrån alternativ-ID:n. Nya projektioner kan
ge nya källrevisioner; gamla sidor måste då läsas om. Frysta rapporter ändras inte.

## MCP och PNG

`math_get_notebook` tar samma elev/klass/period/ref/revision och format:

- `text` (standard): text/status/koordinater, utan hela arbetsytan.
- `png`: samma metadata plus MCP-bildblock. Beskuret rutnät och separat
  frihandsritning när sådan finns. `images` beskriver bildordning och pixelmått.

Rutnätet använder samma `DiagnosticNotebookGrid` och CSS som lärarhistoriken.
Ingen rubrik, reglage, facit eller namn läggs till. Hela rutor och ram bevaras.
`layout.cellWidth/cellHeight` är uppmätta CSS-mått, cirka 36 × 57,6 pixlar.
Ritningen återges separat med färg, pennbredd och suddning utan siffertolkning.
Grid-disabled frågor ger ingen rutnätsbild.

`scripts/render-pupil-notebook.mjs` renderar lokalt med React och befintlig
Playwright/Chromium, utan appserver, nätverk eller elevdatafiler. Browsern stängs
även vid fel/avbrott. Saknas Chromium föreslår felet `npx playwright install
chromium` eller textformat. Efter rendering omkontrollerar MCP åtkomst och
källrevision via samma API; fel lämnar inga bildblock. Inga skrivoperationer används.

Exporten innehåller inte facit eller privata elevetiketter. Själva elevarbetet
kan ändå innehålla personuppgifter och följer samma AI-/åtkomstregler som källan.

## Verifiering och gränser

Syntetiska tester täcker tomt svar, arbete, minnessiffror, överstrykning,
linjer, ritning/suddning, valfrågor, källtrohet, revision och behörighet.
MCP-klientprov kontrollerar PNG-block, pixel-/rutmått och indragen åtkomst efter
rendering. API-export robotprovas mot appens riktiga hanterare. Båda bildtyperna
har granskats visuellt.

Klassöversikt, klockslagsfilter, ny P/Ö/M-analys, presentation och rättade
elevdokument återstår. De kan återanvända exporten. Inte verifierat mot verkliga
elevdata, riktig KV, produktion eller fysisk iPad.
