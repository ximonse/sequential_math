# Arkitektur & Checklista för nya domäner

## Två samverkande mål och aktuell kodavstämning

Produktens riktning preciserades av Simon 2026-11-04: mängdträning/förtrogenhet
och lärarens utforskning/bemötande av felförståelser. Normativ definition finns
i `docs/PRODUCT_CONTRACT.md`; aktuell kodinventering, överlämningar, motsägelser
och föreslagen ansvarsfördelning i `docs/LEARNING_SYSTEM_SYNTHESIS.md`.
`docs/LEARNING_SYSTEM_COVERAGE.md` skiljer kandidatberäkning, frågeförslag och
faktisk bank-/lärarväg. Ursprungsinventeringen är dokumentgranskning. E1–E3 är
därefter lokalt byggda; syntesens genomförandestatus skiljer detta från push och
produktion.

E4:s godkända decimalpilot tillkommer lokalt 2026-11-05: bankens decimalrättning,
undervisningsnoteringar i befintliga rapportavstämningar och nya kontrollutkast
i samma materialkedja. Ingen parallell uppdragslagring eller elevprogression
införs; andra domänpaket återstår.

E4:s andra godkända paket, decimalsubtraktion med en växling, tillkommer lokalt
2026-11-05. `didacticPackages.js` är gemensam katalog för de två paketen; samma
rapport-/materialkedja används. V8 kompletterar en avgränsad decimalrival.
Källstruktur, paket och noteringsversion valideras på servern; äldre utdelade
material behåller frysta modellsvar. Se `docs/E4_DECIMAL_SUBTRACTION_REVIEW.md`.

## Lokal elevanalys via MCP

`api/_teacherMaterialPreview.js` validerar generell eller analysspecifik
förhandsvisning mot exakt aktuellt urval och revisionsbundet analysunderlag.
Träning använder befintlig payload-validering; screening återanvänder
`prepareDiagnosticAssignment` från uppdragslagret. Förberedelse skriver inget;
`createDiagnosticAssignment` använder samma förberedelse och sparar separat.
MCP är en tunn adapter även för materialförhandsvisning. Versionerade utkast
lagras privat per lärare med CAS, idempotens och elevtombstones. Historisk
åtkomst omkontrolleras och elevradering tar bort hela berörda utkast.
Separat lazy-laddad lärarvy granskar versioner och källsvar. Godkännande kräver
betrodd cookie-mutation från lärarvyn, aktuell innehålls-/mottagarrevision och
ny underlagsvalidering; MCP exponerar inget godkännandeverktyg. Separat
cookie-skyddad utdelning återanvänder elevuppdrags-/screeninglagren med
frysta mottagare och deterministiska ID:n. CAS-skyddade kvitton per version
skiljer bekräftelser, delfel och osäkra utfall; elevradering tar bort dem.
Högst fem enheter per anrop och samma försöks-ID under sidvis utdelning.
Kontrakt och verifieringsgränser: docs/PUPIL_MATERIAL.md.
Materiallagrens verkliga Lua/CAS-skript har separata isolerade Redis-prov;
se docs/MATERIAL_REDIS_VERIFICATION.md. De läser inga KV-hemligheter och
använder inga globala databasrensningar. Godkännandets återförsöks-ID binds
till innehållsversion även när två versioner har samma innehållsrevision.
Materialgranskningen återanvänder screeningens katalog-, facit- och
bildredigerare. Ändringar sparas i materialets versionslager; fristående
screeningutkast är fortsatt innehållsutkast utan analys eller godkännande.

`mcp/sequential-math/` är en separat stdio-adapter med egen låsfil, utanför
frontendbygget och Vercel-routingen. Den anropar befintliga behörighetskontrollerade
lärar-API:er; domänvalidering och rapport-CAS stannar på appservern. Läsläge är
standard, rapportsparande kräver separat startflagga. Inga utdelningsoperationer
exponeras. Demoläget startar robotappens minnes-KV i en isolerad barnprocess.
Se `docs/PUPIL_MCP.md` för kontrakt, konfiguration och verifieringsgränser.

Räknehäftets export bygger på `diagnosticNotebookExport.js` (observerbar
status/text/koordinater) och `DiagnosticNotebookGrid.js`, samma skrivskyddade
rutnätskomponent för lärarhistorik och lokal PNG. `format=notebook` använder
underlags-API:ts befintliga åtkomst och källrevision. PNG renderas enbart lokalt
med befintlig Playwright i `scripts/render-pupil-notebook.mjs`; ingen browser
eller ny lagring införs i Vercel. Se `docs/PUPIL_NOTEBOOK_EXPORT.md`.

## Vad är en "domän"?

AI/export använder samma periodparser `src/lib/evidencePeriod.js` för hela
Stockholm-dagar eller precisa klockslagsgränser, inklusive validerat DST-val.
`GET /api/students?resource=classes` är en separat skrivskyddad projektion av
aktuellt behöriga klass-ID:n/namn, utan profiler eller klassinloggningsdata.
Den återanvänds av MCP och exportskriptets exakta klassval.

En domän är ett räknesätt/ämnesområde, t.ex. addition, algebra, bråk.
Varje domän bor i `src/domains/<namn>/` och registreras i `src/domains/registry.js`.

Nuvarande domäner:
- `arithmetic` — addition, subtraktion, multiplikation, division (bas)
- `algebra` — algebra_evaluate, algebra_simplify
- `arithmetic_expressions` — prioriteringsregler
- `fractions` — bråk
- `percentage` — procent
- `number_fluency` — talpar och dubblor

---

## Checklista: lägga till en ny domän

### 1. Domänfiler (`src/domains/<namn>/`)
- [ ] `index.js` — exporterar `{ id, label, skills: [{ id, label }], generate, verifyContent, evaluate, analyzeError }`
- [ ] `generate.js` — returnerar problem med **`difficulty: { conceptual_level: lvl }`** (obligatoriskt för progression)
- [ ] `verifyContent.js` — räknar facit oberoende från generatorns `answer` och returnerar `{ valid, reason }`
- [ ] `evaluate.js` — returnerar `{ correct, correctAnswer, isReasonable }` (**isReasonable obligatoriskt** för masterycheck)
- [ ] `Display.jsx` (valfritt) — om frågan inte kan visas med standard `a op b`-format, använd `metadata.promptText` i generate

### 2. Registrera domänen
- [ ] `src/domains/registry.js` — `registerDomain(nyDomän)`

### 3. Operation-ID:n — lägg till i **alla** dessa filer
- [ ] `src/lib/operations.js` → `OPERATION_LABELS` (visningsnamn)
- [ ] `src/lib/assignments.js` → `KNOWN_OPERATION_TYPES` (uppdrag via länk)
- [ ] `src/lib/difficultyAdapterSelectionHelpers.js` → `KNOWN_OPERATION_TYPES` (sessionsfiltrering)
- [ ] `src/lib/mathUtils.js` → `KNOWN_OPERATION_TYPES` (typ-inferens)
- [ ] `src/components/teacher/sections/dashboardConstants.js` → `ALL_OPERATIONS` (lärarvyer)

### 4. Lärardashboard
- [ ] `src/components/teacher/sections/dashboardCoreHelpers.js` → `getPresetConfig()` — preset för "Uppdrag via länk"
- [ ] `src/components/teacher/sections/AssignmentsPanel.jsx` — knapp för det nya räknesättet
- [ ] `src/components/teacher/sections/dashboardAssignmentRiskHelpers.js` — inkludera i riskberäkningar om relevant
- [ ] `src/components/teacher/sections/dashboardStudentTrainingHelpers.js` — inkludera i träningsförslag

### 5. Aktivering per klass
- [ ] Ny domän dyker automatiskt upp i "Räknesätt ▾" i Klasshantering (via `listDomains()` i `ClassManagementPanel`)
- [ ] Inget extra behövs — men testa att kryssrutan syns och att sparande fungerar

### 6. Elevvy
- [ ] Ny operation syns automatiskt i elevens träningsknappar om läraren aktiverat det för klassen
- [ ] Kontrollera att `buildPracticePath` och `adaptiveEngine` hanterar det nya operation-ID:t korrekt

### 7. Heatmap & statistikvyer
- [ ] Ny operation inkluderas automatiskt i heatmap och masteryboards om den finns i `ALL_OPERATIONS`

---

## Varför finns KNOWN_OPERATION_TYPES på flera ställen?

Historiskt skäl — varje modul definierade sin egna lista. De ska hållas i synk.
**Långsiktig plan:** Flytta till en enda källa i `src/lib/operations.js` och importera därifrån.

---

## Sessionsflöde (kort)

```
Elev startar träning
  → adaptiveEngine.js väljer domän/operation
  → domain.generate(level) skapar problem
  → generateWithProblemGuardian() gör högst fyra försök och kräver rätt domän,
    kompetens, nivå, visning, svarstyp och giltig evidensklass
  → efter fyra kontraktsbrott visas sessionsfelet; felmärkt fallback visas inte
  → ProblemDisplay visar (metadata.promptText om text-fråga, annars a op b)
  → Elev svarar
  → domain.evaluate(problem, svar) → { correct, isReasonable }
  → addProblemResult() bevarar observation och eventuellt mastery-faktum
  → adaptationDecision.js skapar ett versionsmärkt beslut från nytt mastery
  → nästa uppgift följer mastery-golvet inom träningsramen
  → UI gratulerar efter beslutet och erbjuder bara Fortsätt
```
