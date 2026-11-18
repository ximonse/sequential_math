# Tolkning av elevsvar: källor, flöden och vyer

Det här är det gällande dokumentet för hur appen tolkar ett elevsvar och visar
det för läraren. Äldre beskrivningar hänvisar hit:
- `LEARNING_SYSTEM_SYNTHESIS.md` F01
- `data-flow.md`
- `STYRNING_FELFORSTAELSER.md` avsnitt 3

Besluten finns i STYRNING avsnitt 10. Bakgrunden finns i
`GRANSKNING_TOLKNING_AV_ELEVSVAR_2026-11-18.md` och
`FORSLAG_EN_TOLKNING_PER_SVAR.md`.

## 1. En tolkning, ett ställe

`src/lib/answerInterpretation.js` avgör för en elevs svar:

| Del | Funktion | Regel |
| --- | --- | --- |
| Vilka modeller ett fel svar har | `answerModelIds` | En allmän modell (`yieldsToSpecific`) viker för en specifik |
| Styrkan i en modellgrupp | `modelGroupStatus` | `below` om katalogens krav på flera olika uppgifter inte är uppfyllt (B1), eller om snabbhetsträning inte har upprepats tre gånger (B6/B7). `contradicted` om de jämförbara rätta svaren är fler än felsvaren (B2). Annars `single` (ett svar) eller `pattern` (flera). |
| Jämförbart rätt svar | `comparableRuleCounter` | Samma område och nivå, eller i screening samma talstruktur, och modellen hade gett fel där |
| Samma felsvar flera gånger | `repeatedWrongAnswers` | Samma felsvar på samma uppgift minst tre gånger (B7). Olika felsvar räknas inte hit. |
| Grupp per svar | `interpretAnswers` | felförståelse, samma felsvar flera gånger, observation (för lite underlag), inmatning, ger upp, oförklarat. Varje fel svar hamnar i exakt en grupp (R-C). |

`interpretAnswers` har två lägen:

- **`shown`** tolkar det svar läraren ser, inklusive ett svar som läraren
  skrivit in från räknehäftet (B4). Det används av alla lärarvyer.
- **`pupil`** tolkar elevens eget svar. Det används av täckningsräkningen (R-C).

Versionen heter `INTERPRETATION_VERSION`. Den är skild från
`PREDICTABLE_RULE_VERSION`, som gäller vad felmodellerna förutsäger.

## 2. Vyerna och vad de läser

| Vy | Läser | Underlag |
| --- | --- | --- |
| Screening, kort, rutor och tabellcell | `screeningCardAnswers` → `interpretAnswers` (shown) | Screeningens senaste svar per uppgift. Svar som dolts som slarv tas bort. |
| Elevrapport | `buildRuleHypotheses` och `validatePupilAnalysis` → `modelGroups`, `interpretAnswers` (shown) | Vald period. Svar som dolts som slarv tas bort. |
| Täckning | `classifyPupilAnswers` → `interpretAnswers` (pupil) | Det underlag skriptet får |
| Evidens-API och MCP | `evidencePage` lägger `interpretation.answerGroup` på varje fel svar | Vald period |
| Felförståelsekartan | Aktuella modeller per svar. Den sparade analysen visas bara som "Tidigare analys". | Elevens svar på nivån |
| Elevprofilens tabeller och NCM | `teacherErrorCategory`: fel räknesätt (katalogens `wrongOperation`) som sparats som ouppmärksamhet räknas som kunskapsfel | Som tidigare |

## 3. Vad som inte är tolkning för läraren

- **Den sparade analysen när eleven svarar** (`analyzeError`,
  `classifyErrorCategory`) är historik. Den styr ingen lärarvy. Kategorin
  ouppmärksamhet ger fortfarande en mindre sänkning av den adaptiva
  svårigheten (`difficultyAdapter.js`), som tidigare.
- **Mastery och nivå** räknar rätt och fel. Tabellträningen räknas inte, och
  dess fel påverkar inte nivån (B6, Simon 2026-11-18). Talkompisar i fritt varv
  sänker nivån vid fel. På en vald nivå står nivån still.
- **Stödprioriteringen** ("Behöver stöd") visar vem läraren ska titta på, inte
  varför eleven svarar fel.

## 4. Avsiktliga skillnader mellan vyerna

| Skillnad | Källa |
| --- | --- |
| Screeningen visar ett fel direkt. Mängdträning kräver underlag, och snabbhetsträning upprepning. | Simon 2026-11-18, B6 |
| Ett svar kan vara enstaka i en screening och ett mönster under en period | Olika underlag. Vyn anger vilket. |
| Täckningen räknar elevens eget svar, och vyerna det läraren ser | R-C och B4 |
| Lärarens val ur listan gör svaret till felförståelse i screening och täckning. Elevrapporten listar valen separat. | Genomförandet 13/11. Inget eget beslut hittat. |
| Motsagda misstankar visas, men utan uppföljningsknapp | Agentens val 2026-11-18, i linje med B2 |

## 5. Spärrar

- `src/lib/answerInterpretation.test.js` kör samma svar genom screeningkorten
  och elevrapporten och kräver samma besked (R-E utvidgad). Fallen kommer från
  granskningen (K1, K2, K4) och från B6/B7.
- `src/lib/errorCoverage.test.js` kontrollerar summorna (R-C) och det
  syntetiska täckningsunderlaget (R-D).
- `src/lib/teacherEvidenceConsistency.test.js` kontrollerar felförståelsekartan
  och lärartabellerna.
- Robotarna `screening-misconceptions`, `pupil-analysis` och
  `teacher-evidence-consistency` kontrollerar vyerna.
