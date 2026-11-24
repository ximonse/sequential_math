# Förslag: en tolkning per elevsvar i alla lärarvyer

Status: **godkänt av Simon 2026-11-18** ("Jag håller med, kör på dina förslag och produktion"). Genomfört, se [TOLKNING_AV_ELEVSVAR.md](TOLKNING_AV_ELEVSVAR.md).
Datum: 2026-11-18. Underlag: `docs/GRANSKNING_TOLKNING_AV_ELEVSVAR_2026-11-18.md`
och Simons beslut 5 (B1–B6) i `STYRNING_FELFORSTAELSER.md` avsnitt 10.

## 1. Vad det ska ge läraren

- Samma svar beskrivs med samma ord och samma bedömning i screeningkort,
  resultattabell, elevrapport, felförståelsekartan, lärartabellerna och MCP.
- Ett eller två fel larmar inte när eleven har visat rätt på jämförbara
  uppgifter. Felen syns ändå, men längre ner och med båda siffrorna (B2).
- Det läraren har valt följer med överallt: bedömning, inskrivet svar, vald
  felförståelse och "dölj som slarv".
- Ordet "slarv" används bara om inmatning. Mönster med för lite underlag heter
  "enstaka svar, för lite underlag" (B1).

## 2. Vad som inte ändras

- Elevens sparade svar, sparade etiketter, mastery och den adaptiva nivån.
  Tabellträning påverkar redan varken mastery eller nivå (B6). Att ett fel
  räknesätt sänker nivån mindre i vanlig träning ändras inte här. Det är ett
  eget beslut om elevens träning som inte är fattat.
- Felmodellernas beräkningar och `PREDICTABLE_RULE_VERSION`. Därför blir
  uppföljningsmaterial som tagits fram under nuvarande version inte ogiltigt.
- Elevens vy.

## 3. Uppbyggnad

### 3.1 En funktion

`interpretAnswers(entries, { scope })` i `src/lib/answerInterpretation.js`.

- **In:** en elevs underlagsposter, det vill säga det evidens-API:t redan
  levererar: svar, frågans struktur, lärarens granskning, och dold som slarv
  eller inte. Dessutom vilket underlag vyn avser (`scope`): en screening, en
  period eller en nivåruta.
- **Ut, per svar:**

| Fält | Innehåll |
| --- | --- |
| `group` | felförståelse, känt fel utan felförståelse, enstaka svar (för lite underlag), samma uppgift flera gånger, inmatning, ger upp, oförklarat, obesvarat med uträkning |
| `models`, `misconceptions` | modellerna och de godkända felförståelser svaret pekar på |
| `strength` | `pattern`, `single` eller `contradicted` (fler jämförbara rätt än fel), med antalen |
| `answerSource` | elevens eget svar, eller lärarens inskrivning med elevens svar bredvid (B4) |
| `teacher` | lärarens bedömning, valda felförståelser och dold som slarv |
| `labelSv` | ett ord eller en mening ur en gemensam ordlista |
| `interpretationVersion` | egen version, oberoende av regelversionen |

- **Ut, per elev:** grupperna, misstankarna med stöd och motexempel, upprepade
  uppgifter och summor. Summorna kontrolleras som i dag (R-C).

Funktionen ersätter klassningen i `classifyPupilAnswers`, misstankebyggandet i
`buildRuleHypotheses`, uppdelningen i slarv och misstanke i
`PupilAnalysisReportView.jsx`, `withSingleOccurrence` och `teacherErrorCategory`.
Felmodellerna (`predictableErrors`) och `addPredictableEvidence` används som i
dag.

### 3.2 Reglerna, på ett ställe

1. **Mönster (B1).** Kravet på flera olika uppgifter gäller modeller vars
   slumprisk är över tröskeln 2 (`modelChance`). I dag gäller det bara
   "Angränsande produkt". Under kravet blir gruppen "enstaka svar, för lite
   underlag". `minDistinctTasks` ersätts av den mätta slumprisken, plus en
   uttrycklig katalogflagga där kravet har ett annat skäl:
   - "Svarar 0" och "svarar 55": kravet är definitionen av "ger upp".
   - "Fel tabellfaktum i uppställningen": faktaminne (Simon 2026-11-18).
   - "Räknar med starttalet vid växling" förlorar kravet (Simon 2026-11-18).
2. **Motexempel (B2).** Jämförbara rätta svar räknas med `comparableRuleCounter`
   som i dag, men utan taket på fem. Är de fler än felträffarna (räknat per
   uppgift) blir styrkan `contradicted`. Visningen listar högst fem, men siffran
   är den verkliga.
3. **Fel räknesätt (B3).** Gruppen "fel räknesätt" har en egen beskrivning som
   inte påstår förståelse eller uppmärksamhet. Ett enstaka fel räknesätt visas
   på samma sätt i screening och elevrapport.
4. **Lärarens inskrivning (B4).** Analyseras i alla lärarvyer, märkt.
   Täckningsräkningen redovisar elevens eget svar på en egen rad, som R-C säger.
5. **Samma felsvar flera gånger (B7, preliminärt; ersätter B5).** Samma
   felsvar på samma uppgift tre gånger i mängdträning visas som ett troligt
   inlärt fel i faktumet. Olika felsvar på samma uppgift och enstaka fel
   räknas och syns i en sammanfattning men larmar inte. Signalen hålls isär
   från felförståelsesignalen, där samma sorts fel visas på olika uppgifter
   (regel 1 och 2). Screening påverkas inte, eftersom varje uppgift besvaras
   en gång.
6. **Mängdträning (B6).** All träning utom screening är mängdträning. Talpar,
   dubblor, talbilder och tabeller är i synnerhet snabbhetsträning. För dem
   blir ett fel en misstanke först när det upprepas. Övrig mängdträning visar ett enstaka fel
   som "enstaka svar". Screening visar det direkt. Nivåregeln är oförändrad.
   Gruppen tabellträning och talflyt får ett namn i katalogen i stället för
   "snabbhetsträning", och regeln skrivs ut där i stället för i en
   kodkommentar.
7. **Dold som slarv.** Ett dolt svar ingår inte i grupperna i någon vy och
   redovisas på en egen rad.
8. **Allmän eller specifik modell.** När en specifik modell förklarar svaret
   döljs den allmänna i alla vyer, inte bara i elevrapporten.

### 3.3 Underlag per vy (avsiktlig och synlig skillnad)

| Vy | Underlag | Visas som |
| --- | --- | --- |
| Screening, kort och tabell | Screeningens senaste svar per uppgift | "i den här screeningen" |
| Elevrapport | Vald period | "under perioden" |
| Felförståelsekartan | Elevens svar på nivån | "på den här nivån" |
| Lärartabeller | Som i dag | Kategorierna läses ur tolkningen |

Ett svar kan alltså vara "enstaka" i en screening och ett "mönster" under en
månad. Det är rätt, så länge vyn säger vilket underlag den bygger på.

### 3.4 Ordlistan

En fil (`answerInterpretationLabels.js`) med de ord som visas för läraren, ett
per grupp och styrka. Ord som ersätts:

- "Troligen slarv eller inmatning" blir "Inmatning" respektive "Enstaka svar,
  för lite underlag".
- "Kunskapsfel" i tabellerna delas upp i felförståelse, känt fel och
  oförklarat där det får plats. Annars "Fel svar".
- "Missuppfattning" och "historisk kategorimarkering" visas bara under en
  uttrycklig rubrik "Tidigare analys", aldrig som varning.
- "M · Möjligt metodfel" tas bort. Felmodellen gör samma sak för alla uppgifter.

## 4. Genomförande i små steg

Varje steg ska kunna publiceras för sig och har en robot eller ett test som är
rött före och grönt efter.

1. **Funktionen och spärren.** `interpretAnswers` med reglerna i 3.2, och ett
   test som kör samma svar genom screeningvägen och elevrapportvägen och kräver
   samma grupp och styrka (R-E utvidgad till vyer). Ingen vy byter än. Testet
   visar dagens skillnader som förväntade fel, en lista som ska tömmas.
2. **Screeningvyn** läser tolkningen: kort, rutor och tabellcell. Dolda svar
   läses här, vilket kostar en extra läsning per elev som görs parallellt.
   Belastningen mäts före och efter.
3. **Elevrapporten** läser tolkningen. Uppdelningen i slarv och misstanke tas
   bort ur komponenten, "motsagd av rätta svar" visas, motexemplen kapas inte
   och oförklarade fel visas bland alla svar (K6). Sparade rapporter behåller
   sina hypoteser. Bara nya utkast får den nya tolkningen.
4. **Felförståelsekartan och lärartabellerna** läser tolkningen.
   `teacherErrorCategory` tas bort. Den röda varningen (K8) blir en neutral rad
   under "Tidigare analys".
5. **MCP** får tolkningen i underlaget bredvid de historiska fälten, märkt.
6. **Ett flödesdokument** (`docs/TOLKNING_AV_ELEVSVAR.md`): tolkningskällor,
   vyer, underlag och avsiktliga skillnader med källa. Motsvarande avsnitt i
   `LEARNING_SYSTEM_SYNTHESIS.md`, `data-flow.md` och STYRNING avsnitt 3 får en
   hänvisning dit i stället för egen text.

Efter steg 1 mäts täckningen på det syntetiska underlaget (R-D), och efter
steg 3 på riktiga elevsvar lokalt. Det redovisas före och efter som
arbetsregeln kräver.

## 5. Följder att känna till

- Antalet misstankar ändras.
  - Fel räknesätt och "multiplicerar i stället för att addera" visas redan vid
    ett svar, som "enstaka svar".
  - Misstankar med fler jämförbara rätta svar flyttas ner som "motsagda".
  - Det mäts och redovisas innan något publiceras.
- B6 betyder att en talflytsmodell, till exempel "Adderar i stället för att
  söka den saknade termen", inte längre visas vid ett enda fel. I dag visas
  den märkt "Enstaka svar".
- Gamla sparade rapporter visar sin gamla indelning tills läraren tar fram en ny.
- Ingen ändring av elevens träning, sparande eller offlinekö.

## 6. Frågor till Simon innan steg 1

1. ~~Kravet för starttalet och fel tabellfaktum~~ Besvarad 2026-11-18: kravet
   behålls för fel tabellfaktum men inte för starttalet.
2. ~~Mängdträning~~ Besvarad 2026-11-18: se B6 i STYRNING avsnitt 10.
3. **B7:** bekräfta att viktningen gäller all mängdträning, och att
   gränsen är samma felsvar tre gånger.
4. **Ordning:** är steg 1–2 (screening först) rätt början, eller vill du ha
   elevrapporten först?
