# Matematikdidaktiska urvalsprinciper för individuell screening (utkast)

Status: **utkast för granskning, 2026-10-29. Inget kopplat till kod/API än.**
Syfte: ge AI:n en didaktisk ryggrad — grundad i NCM:s Diamant-diagnoser och
appens egen felmönster-motor — när den bygger analysspecifika screeningar,
istället för fritt resonemang som kan skifta med modell/kontext/dagsform.

Relaterat: [PUPIL_MATERIAL.md](PUPIL_MATERIAL.md) (kontrakt för utkast),
[PUPIL_ANALYSIS.md](PUPIL_ANALYSIS.md) (rapportschema),
[NCM_DIAMANT_SCREENING.md](NCM_DIAMANT_SCREENING.md) (källa/licens),
`.agents/skills/assignment-authoring/SKILL.md`, `.agents/skills/pupil-analysis/SKILL.md`,
`src/domains/arithmetic/analyzeError.js` (felmönster-motorn),
`NMC/processed/ncm_code_skill_map.csv` (fullständig NCM-kodkatalog).

## 0. Grundregel: standardprincip med öppen ventil

Reglerna nedan är AI:ns förstahandsval när underlaget och matematikområdet
passar dem. Om elevens svar, ett område utanför listan (geometri,
kombinatorik, öppna resonemangsuppgifter m.m.) eller lärarens instruktion
motiverar ett annat upplägg ska AI:n frångå tumreglerna. Enda kravet vid
avvikelse: kort motivering i `reasonSv` så läraren kan bedöma valet.
Detta är konsekvent med att servern redan kräver `alternativesSv` och
`reasonSv` i befintliga scheman — ingen ny spärr, bara en tydligare norm
för det fria utrymme som redan finns.

## 1. Två kvalitetsnivåer — vad som är låst vs. vägledande

**Nivå A (vägledande, redan implementerbart utan kodändring):** AI:n läser
den här filen och `ncm_code_skill_map.csv` som referens vid analys och
screeningbygge. Ger konsekvent terminologi och färdiga förkunskapskedjor.
Löser *inte* hallucinationsrisken — AI:n kan fortfarande strunta i eller
feltolka referensen.

**Nivå B (hård spärr, kräver schemaändring i `pupilAnalysis.js` och
`_teacherMaterialPreview.js`):** ett valfritt, validerat kodfält (t.ex.
`diagnosticCode`) som bara accepteras om det finns i en kuraterad katalog.

**Rättelse (viktig, upptäckt vid granskning):** en ren katalog-medlemskaps-
kontroll ("finns koden i listan?") är *svagare* än dagens
`existing_signal`/`signalCode`-kontroll i
[pupilAnalysis.js:58-61](../src/lib/pupilAnalysis.js). Den kontrollen
kräver inte bara att koden finns i ett vokabulär — den kräver att
`signalCode` faktiskt förekommer i `interpretation.patterns` hos **varje**
supportRef, dvs. att påståendet är förankrat i observerad data. En
katalog-medlemskapskontroll stoppar bara påhittade *namn*, inte felaktig
*tillskrivning* — och Simons oro ("kvaliteten skiftar med dagsform") gäller
nästan uteslutande tillskrivning, inte stavning.

För att nivå B faktiskt ska stänga den dörren måste valideringen gå via
katalogens `mapsFromPatterns`-fält: om AI:n påstår t.ex. `dec_longer_is_larger`
och den koden i katalogen är markerad som att den kommer från `place_value_error`,
måste varje supportRef faktiskt bära `place_value_error` i sina `patterns`.
Det återanvänder exakt samma mekanism som `existing_signal` — inte en ny,
svagare variant av den. Koder utan `mapsFromPatterns`-koppling (t.ex. RB1,
RP4, de begreppsliga bråk/procent-missuppfattningarna i §5b) får ingen
sådan dataförankring — de förblir AI-tolkning och ska märkas som sådan i
gränssnittet, inte presenteras med samma konfidens som en mönster-förankrad
kod. **Detta, inte bara katalog-medlemskap, är steget som faktiskt stänger
dörren för felaktig tillskrivning.**

Rekommendation: bygg katalogens innehåll nu (det här dokumentet), sikta på
nivå B från start. Inget av detta är kopplat in ännu.

## 2. Källviktning — hur tidigare screening, fri träning och uppdrag vägs

- **Tidigare screening väger tyngst för metodhypoteser.** Räknehäftet visar
  uppställning, växlingar och `workWithoutAnswer`. Upprepa inte samma
  uppgift slentrianmässigt — välj en parallell kontrast som isolerar det
  misstänkta felsteget, om inte syftet uttryckligen är uppföljning efter
  undervisning.
- **Fri träning och uppdrag väger tyngst för bredd och stabilitet, men
  döljer metoden.** Upprepade felsvar i `problemLog` visar var det stannar
  upp, sällan hur eleven tänkte. När fri träning/uppdrag är huvudkälla ska
  screeningen utformas för att synliggöra metoden (räknehäfte på) eller
  skilja procedurfel från förkunskapsbrist.
- **Aktuellt läge går före gammalt brus.** Äldre fel följt av stabila rätta
  svar på samma mekanism/svårighet ska inte trigga nya frågor. Har
  rättandelen fallit i samband med en nivåhöjning: placera screeningen i
  skarven mellan fungerande nivå och nytt delmoment.

## 3. Omfattning och sekvens

- **Kort format som standard:** 3–5 uppgifter, högst 1–2 hypoteser per
  screening. Fler än 5–6 bara på uttrycklig lärarbegäran om bredare
  översikt.
- **Trestegssekvens när den passar:**
  1. Baslinje (1 uppgift) nära elevens dokumenterade styrka, utan det
     misstänkta hindret.
  2. Kärnkontrast (2–3 uppgifter) med minimal variation — en egenskap åt
     gången — för att skilja huvudhypotesen från alternativ.
  3. Förkunskaps-/transferkontroll (0–1 uppgift) — steg bakåt i
     förkunskapskedjan, eller samma beräkning i nytt format.

## 4. Minimal kontrast — mekaniskt kontrollerbart, inte bara AI-omdöme

Tal ska väljas så att olika tänkbara felstrategier ger olika svar (undvik
"falska rätt", t.ex. symmetriska tal som `4 − 2`, `44 − 22`).

**Viktigt:** appens egen felmönster-motor (`analyzeArithmeticError` och
`errorHypotheses/*.js`) kan redan räkna ut vad en given felstrategi *skulle*
ge för svar (se `testBorrowForget`, `testCarryForget` m.fl.). Istället för
att lita på att AI:n räknar rätt i huvudet bör föreslagna `customTasks`-tal
köras genom samma motor innan de sparas, och avvisas om de inte särskiljer
de aktuella felhypoteserna. Det är en nivå B-kontroll, inte en skrivregel.

## 5. Felkod-katalog: appens `patterns` ↔ NCM-koder

Grundad i `src/domains/arithmetic/analyzeError.js`, övriga domänfilers
felmönster, NCM:s officiella diagnoslista (ncm.gu.se/klassrum/diamantdiagnos)
och `NMC/processed/ncm_code_skill_map.csv`. Förkunskapskedjor markerade
**verifierade** är lästa direkt ur NCM:s facit-PDF:er (`Hermes Vault/Matematik`);
övriga är från den kortare webbsammanfattningen och bör verifieras mot
facit innan nivå B byggs.

### Addition / subtraktion

| `pattern`-kod | NCM-kod | Förkunskap | Grund |
|---|---|---|---|
| `carry_forget`, `carry_double`, `ones_digit_only` | AS1 | **AG3** (verifierat — ej AG4) | AS1-facit: "bygger på AG3". Fel ±1 → grundläggande addition (AG3); fel ±10/±100 → tiotalsövergång ej förstådd, procedur utan positionsförståelse. |
| `smaller_minus_larger`, `borrow_forget` | AS2 | **AG3** (verifierat) | AS2-facit, identisk struktur som AS1 men för subtraktion. "Störst minus minst" är NCM:s egen beskrivna missuppfattning. |

### Multiplikation / division

| `pattern`-kod | NCM-kod | Förkunskap | Grund |
|---|---|---|---|
| `table_off_by_one`, `ones_digits_only` | AG6 | — | AG6-facit/strategisteg (se nedan). |
| (multiplikationsfel i skriftlig uppställning) | AS4 | **AG6 + AG7** (verifierat) | AS4-facit: fel ±1/en faktor för mycket-lite → AG6; fel ±10/±100 → tiotalsövergång. |
| `quotient_off_by_one`, `reversed_operands`, `divisor_as_answer`, `dividend_as_answer` | AG8 | **AG6 + AG7** (verifierat) | AG8-facit: fel på 1a/1b/2a/2b → öva multiplikationstabellen (AG6); 3a/3b (rest) kräver ännu säkrare tabellkunskap, avgörande för lång/kort division och blandad bråkform. |
| (skriftlig division) | AS5 | **AG8, indirekt AG6+AG7** (verifierat) | AS5-facit: "fel beror ofta på att eleven inte har flyt i AG6, AG7, AG8". |

**AG6 strategisteg (verifierat, NCM-facit via Simon):**
1a Dubblorna (×2) · 1b Dubbelt-dubbelt (×4) · 2a ×3 · 2b Dubbelt×3 (×6) ·
3a ×5 · 3b Resten: enbart faktorerna 7, 8, 9.
Ger en färdig progression för att isolera *vilken* tabelldel som brister,
istället för att AI:n gissar talkombinationer.

### Decimaltal / positionssystem (facit-verifierat, RD1–3 lästa direkt från ncm.gu.se)

| `pattern`-kod | NCM-kod | Förkunskap | Grund |
|---|---|---|---|
| `place_value_error` (decimalkontext) | RD1 | **RB4** (verifierat — RD1-facit hänvisar uttryckligen till RB4) | "Uppgifterna är av ett liknande slag som i RB4 ... jämför med RB4". Läsfel `0,10` som "noll komma tio" → tror 0,10 > 0,9. |
| `place_value_error` (decimal +/−) | RD2 | **AG2 + AG3 + AG4** (verifierat) | RD2-facit: samma tiotalsövergång-logik som AS1/AS2, fast för tiondelar. |
| `place_value_error` (decimal ×/÷) | RD3 | **AG6 + AG7 + AG8** (verifierat) | RD3-facit: innehållsdivision med decimaltal kräver samma tabellflyt. |
| `place_value_error` (heltal, ×10/÷10-skalning) | AS1/AS2 (add/sub-kontext) eller AS4 (mult-kontext) | AG3 / AG6+AG7 | Kräver uppgiftskontext för rätt kod — se öppen fråga nedan. |

### Bråk / procent (facit-verifierat, RB1–5/RP1/RP3/RP4 lästa direkt från ncm.gu.se)

| `pattern`-kod | NCM-kod | Förkunskap | Grund |
|---|---|---|---|
| `wrong_denominator` (nämnarens innebörd) | RB1 | — (grundläggande) | Stambråk, "en del av en helhet". |
| `wrong_denominator` (täljarens innebörd) | RB2 | **RB1** (verifierat) | Täljare/nämnare har olika funktion. |
| — (del av antal) | RB3 | **RB2** (verifierat) | Förkunskap till proportionalitet (RP1). |
| `wrong_denominator` (storleksordning/likvärdiga bråk) | RB4 | **RB2** (verifierat) | Tallinje + gemensam nämnare. |
| — (räkna med bråk) | RB5 | **RB4** (verifierat) | Addition/subtraktion/multiplikation/division med bråk som taluppfattning. |
| `wrong_percentage` (proportionalitet) | RP1 | **RB3** (verifierat) | "Tolka text, välj modell, teckna, beräkna del av antal." |
| `wrong_percentage` (grundläggande procent) | RP3 | **RB3 + RD1** (verifierat) | Bråkform → procentform kräver båda. |
| `wrong_percentage` (procenträkning) | RP4 | **RP3** (verifierat) | |

### Algebra (facit-verifierat — TAu1/TAe1 korrigerar föregående gissning)

| `pattern`-kod | NCM-kod | Förkunskap | Grund |
|---|---|---|---|
| `forgot_coefficient`, `added_instead_of_multiplied`, `square_as_double` | **TAu2** (uttrycks värde — beräkna ett uttryck för givet x) | **TAu1** (verifierat) | TAu1 handlar specifikt om area-/omkretsuttryck för geometriska figurer (kvadrat, rektangel, parallellogram, triangel) — inte generella variabeluttryck. |
| `did_not_simplify`/`not_simplified`, `forgot_constant`, `combined_unlike_terms`, `simplify_error` | **TAu3** (förenkling av uttryck) | **TAu1** (verifierat) | Linjära uttryck, polynom, enkla rationella uttryck. |
| `wrong_order_of_operations` | — (ingen exakt NCM-kod) | AG6 (prioritetsregler) | Flaggas utan NCM-kod; beskriv fritt enligt öppna ventilen (§0). |
| (ekvationslösning, prövning) | TAe1 | **AG1 + delar av AG6** (verifierat — INTE TAu1) | TAe1-facit explicit: "problem med AG1 och delar av AG6", inte uttryckskedjan. Viktig rättelse: algebra har två separata förkunskapsspår — uttryck (TAu1→TAu2/TAu3) och ekvationer (AG1/AG6→TAe1→TAe2) — som inte automatiskt hänger ihop. |
| (ekvationslösning, formell metod) | TAe2 | TAe1 (rimligt, ej explicit uttalat i facit) | Gissa/pröva-elever (TAe1-nivå) får problem med TAe2:s formella annullering. |

### Medvetet utan NCM-koppling

`digit_reversal`, `calculation_error`, `wrong_answer`, `no_answer`,
`invalid_input` — mekanism-/inmatningsfel, inte förkunskapsluckor. Att
tvinga in dem i en NCM-kod vore exakt det "skohorn"-problem en sluten
katalog måste undvika (se §0).

`operation_swap` är ett specialfall: i en ren talfaktauppgift är det ett
mekanismfel utan NCM-kod (som ovan). Men om felet uppstår i en **textuppgift**
är det exakt vad AG5 (addition/subtraktion, "tolka texten, välj rätt
räknesätt") och AG9 (motsvarande för multiplikation/division) samt AS3/AS6
(samma sak med krav på skriftlig uträkning) är konstruerade för att mäta —
verifierat i deras facit. Koden bör alltså väljas efter uppgiftstyp:
ingen NCM-kod för ren beräkningsuppgift, AG5/AG9/AS3/AS6 för textuppgift.

### Utökad skriftlig räkning (facit-verifierat, delvis utanför mellanstadiescope)

| `pattern`-kod/sammanhang | NCM-kod | Förkunskap | Grund |
|---|---|---|---|
| textuppgift, addition/subtraktion | AS3 | **AS1 + AS2** (verifierat) | AS3-facit: "bygger på AS1, AS2". |
| textuppgift, multiplikation/division | AS6 | **AS4 + AS5** (verifierat) | AS6-facit: samma struktur. |
| decimaltal, addition/subtraktion | AS9 | **AS1 + AS2 + RD2 + RD4** (verifierat) | AS9-facit: räknefel → AG3/AS1/AS2; decimalfel → RD2/RD4. |
| flersiffrig multiplikation | AS7 | **AG6 + AG7 + AS4** (verifierat) | Utanför ncmScreeningTasks.v1.json idag — åk 7–9-nivå. |
| tvåsiffrig divisor | AS8 | **AS5 + AG6–8** (verifierat) | Samma — ej i nuvarande häften. |
| decimaltal, multiplikation | AS10 | **AS4 + AS7 + RD3 + RD5** (verifierat) | Samma. |
| decimaltal, division | AS11 | **AS5 + AS8 + RD3 + RD5** (verifierat) | Samma. |

**Utanför felmotorns nuvarande räckvidd:** `AF` (muntlig, förskoleklass —
inget skriftligt facit finns, bara kvalitativ bedömning), `AUn1–4` (negativa
tal) och `AUp1–5` (potenser/kvadratrötter) är alla facit-lästa men har
ingen motsvarighet i `analyzeError.js` eller andra domänfiler — appen
genererar/analyserar inte den typen av fel ännu. Relevant för en framtida
åk 7–9-utökning, inte för dagens katalog.

## 5b. Kompletterande forskningsgrund: "Förstå och använda tal" (McIntosh/NCM)

Finns som text på `Hermes Vault/Matematik/Förstå och använda tal..txt` (se
memory `ncm-forsta-och-anvanda-tal-bok`). Varje kapitel har en egen sektion
"Kända svårigheter och missuppfattningar" — samma avsändare som Diamant,
men med didaktisk *varför*-förklaring istället för bara uppgift+facit.
Lästa hittills: kap 3 (positionssystemet), kap 4–6 (bråk/decimal/procent),
kap 8–13 (uppskattning, räknesättsrepresentationer, parenteser, val av
beräkningsmetod), kap 14–17 (grundläggande och generaliserade
tabellkunskaper), kap 18–19 (huvudräkning), kap 20–21 (skriftliga
beräkningar) — dvs. hela "Att förstå tal" och "Att förstå operationer med
tal". Olästa: kap 7 (negativa tal — utanför appens scope), kap 22
(miniräknare), Aktiviteter och elevintervju-/test-delarna.

**Bekräftar och nyanserar befintliga koder:**
- `digit_reversal` (41 i stället för 14) beskrivs av McIntosh som en
  **positionssystem-missuppfattning**, inte nödvändigtvis slarv. Vår
  motor kategoriserar den idag som `category: 'inattention'`
  ([analyzeError.js:112-119](../src/domains/arithmetic/analyzeError.js)) —
  en hypotes byggd på `digit_reversal` bör alltså inte avfärdas som "bara
  slarv" utan kontrolleras mot bredare positionsförståelse.
- `smaller_minus_larger` bekräftas som en av fyra huvudfelkategorier vid
  subtraktion.
- McIntosh nyanserar också begreppet "slarvfel": fel som uppstår för att
  arbetsminnet överbelastas vid flerstegs-huvudräkning **felaktigt
  tolkas som slarv**, men är systematiska. Samma försiktighet som för
  `digit_reversal` ovan bör alltså gälla generellt — en hypotes om
  `inattention` behöver inte vara fel, men bör inte avfärda mönstret för
  snabbt om felet upprepas.

**Konkreta luckor i appens felmotor (fel som är kända/vanliga enligt
McIntosh men som `analyzeError.js` inte har en egen `pattern`-kod för):**

1. **Kolumnvis addition utan växling, sammanslaget som eget svar**
   (35 + 28 skrivet som "513" — kolumnsummorna 5 och 13 skrivna bredvid
   varandra istället för växlade). Skiljer sig från `carry_forget`.
2. **Distributiva lagen missförstådd vid multiplikation** — tiotalen
   *adderas* istället för att multipliceras i den andra delmultiplikationen.
3. **Additionsvanan läcker in i multiplikationsuppställningen** — eleven
   multiplicerar bara siffror som råkar stå i samma kolumn (som vid
   addition) istället för rätt platsvärdespar.
4. **Bråkaddition/-subtraktion: täljare och nämnare behandlas som separata
   heltal** (2/3 + 1/4 → 3/7). Enligt McIntosh den vanligaste
   missuppfattningen i området och inte samma sak som `wrong_denominator`.
5. **Decimalplacering via "räkna antal decimaler"-regeln** används fel vid
   multiplikation/division av decimaltal — separat från `place_value_error`.
6. **"Ta bort och sätt tillbaka nollor"-regeln** vid multiplikation/division
   av runda tal (120×40, 250×40, 2000÷4) — en tumregel eleven lärt sig
   utan att förstå den, som ger systematiskt fel antal nollor. Tydligt
   vanligare och allvarligare vid × och ÷ än vid + och − enligt McIntosh
   (kap 16–17); separat från `place_value_error`.
7. **"Skutträkning" i multiplikationstabellen** — svarar med en
   närliggande multipel (6×7 → 36, 48 eller 49) istället för exakt fel
   tabellvärde. Liknar `table_off_by_one` men är specifikt en
   talföljds-/skip-counting-mekanism, värd att skilja ut som kontrastledtråd.
8. **"Multiplikation gör alltid större, division gör alltid mindre"** —
   enligt McIntosh (kap 11) den enskilt mest dokumenterade missuppfattningen
   i hela boken: 50–90 % av 14-åringar i internationella studier. Slår till
   specifikt vid multiplikation/division med bråk eller decimaltal mindre
   än 1 (RB5/RD3-territoriet, redan i katalogen). Eleven byter medvetet
   eller omedvetet räknesätt för att få ett svar som "känns rätt" (t.ex.
   30 ÷ 0,5 besvaras 6 eller 15 istället för 60 — eleven tolkar "dela med
   en halv" som "halvera"). Detta är troligen den enskilt viktigaste
   kandidaten av de åtta att prioritera om bara en ska kodas, eftersom den
   direkt förklarar annars oförklarliga svar inom RB5/RD3.
9. **Omvänd operandordning pga. talspråk vid division** — "tre går i
   tolv" läses ibland som skrivordning 3÷12 istället för 12÷3. Delvis
   redan täckt av `reversed_operands`, men McIntosh pekar ut just
   *muntligt* uttal av divisionstecknet som källan — värt att ha med i
   kontrastledtråden snarare än som ny kod.

Punkt 1–8 är kandidater för nya `pattern`-koder i `analyzeError.js` (eller
motsvarande bråk-/decimaldomänfil) om ni vill att motorn ska kunna
upptäcka dem automatiskt — i dagsläget skulle AI:n bara kunna beskriva dem
fritt (öppna ventilen, §0) eftersom de inte triggas av befintlig kod.
Punkt 9 är snarare en nyans av befintlig `reversed_operands`. Detta är en
separat kodändring, inte del av dagens katalogarbete.

**Begreppsliga missuppfattningar (bråk/decimal/procent) — inte kodbara
som `pattern`, men viktiga för AI:ns hypotesformulering vid analysspecifik
screening:**

- Större nämnare tolkas som större tal (niondelar > tredjedelar, eftersom
  9 > 3) — den vanligaste bråk-storleksmissuppfattningen.
- Fler decimaler tolkas som större tal (0,1324 > 0,180) *eller* omvänt
  färre decimaler som större tal — båda förekommer, motsatta slutsatser
  av samma missförstådda princip.
- Tror att 0,5 ≠ 0,50, eller att det inte finns några tal mellan 0,5 och
  0,6 (överför hela-tal-logik om "inget mellan 5 och 6").
- Blandar ihop procentenheter med procent (”ökade med 2 % från 5 % till
  7 %” beskrivs som 2 %-ökning, borde vara 40 % ökning).
- Tror att +X % följt av −X % återställer ursprungsvärdet.
- Tror att 10 % av en del + 10 % av en annan del = 20 % av helheten.
- Bråkaddition/-subtraktion: se punkt 4 ovan (täljare/nämnare separat).

Dessa är naturliga kandidater till de NCM-kod-kopplade `defaultAlternativesSv`-
fälten i felkod-katalogen (nivå B, se §1) — de ger AI:n färdiga, forsknings-
grundade alternativa förklaringar att väga mot istället för att uppfinna egna.

## 6. Bakåtkedjning vid låsning

När en elev har upprepade fel på ett område i fri träning/uppdrag:
kontrastera målmomentet mot närmaste förkunskap istället för att stapla fler
uppgifter på samma nivå. Tabellen i §5 ger den verifierade kedjan för
addition/subtraktion/multiplikation/division. För övriga områden (decimal,
bråk, procent, algebra) används webbsammanfattningens kedjor tills de är
facit-verifierade på samma sätt.

## 7. Val av frågekälla och arbetsyta

1. **Katalogfrågor först** (`taskIds`) — kalibrerad formulering/facit finns
   redan i `diagnosticCatalog.js`/`ncmScreeningTasks.v1.json`.
2. **Egna självrättande frågor** (`customTasks` + `answerKey`) när katalogen
   saknar rätt kontrastpar eller eleven nyligen mött exakt den uppgiften.
3. **Lärarbedömd fritext** (`teacher_review`) när syftet kräver att eleven
   formulerar ett resonemang som inte syns i slutsvar + räknehäfte.
4. **`gridEnabled`** efter syfte: `true` för att se uppställning/växling/
   mellanled, `false` för att pröva huvudräkning/tabellflyt utan att
   gränssnittet styr mot skriftlig uppställning.

## 8. Öppna frågor innan nivå B byggs

1. `place_value_error` behöver kontext (decimal vs. heltal, vilket
   räknesätt) för att välja rätt NCM-kod. Ska detta bli separata interna
   koder, eller räcker en instruktion om att AI:n väljer utifrån
   uppgiftstyp?
2. **Uppdaterat igen:** samtliga 127 facit i NCM:s officiella Diamant-katalog
   är nu hämtade direkt från ncm.gu.se/media/diamantdiagnoserna/facit/ (inte
   bara den lokala aritmetik-delmängden). De 28 aritmetik-faciten (AF,
   AG1–9, AS1–11, AUn1–4, AUp1–5) samt RD1–3, RB1–5, RP1/RP3/RP4, TAu1–3
   och TAe1–2 — allt som berör appens nuvarande felmönster-katalog i §5 —
   är nu lästa och facit-verifierade, inklusive en felrättning: TAe1/TAe2
   (ekvationer) bygger på AG1+AG6, inte på TAu-uttryckskedjan som jag
   först gissade. Kvarvarande 100+ facit (geometri, mätning, statistik,
   TAt/TAg, resten av RB/RD/RP/TA) är nedladdade i
   `C:\Users\ximon\AppData\Local\Temp\ncm_facit` men inte lästa — de
   täcker inte appens nuvarande felmotor (`analyzeError.js` saknar
   geometri/mätning/statistik-fel) och är inte prioriterade för denna
   katalog.
3. `ncm_code_skill_map.csv` saknar koden `AF` och har en trolig
   STI→STl-felstavning (flaggat separat, task_37f8262b pågår).

## 9. Nästa steg (efter granskning av detta utkast)

**A. Använd nivå A redan imorgon, utan kodändring.** Be AI:n (via
`.agents/skills/assignment-authoring/SKILL.md` + den här filen som
referens) bygga en analysspecifik screening-förhandsgranskning för en
riktig elev i en riktig klass — bara preview, inget sparat. Det är den
enda vägen att se om principerna i §2–§7 faktiskt märks i resultatet,
innan mer tid läggs på nivå B.

**B. Mät innan nio nya felkoder byggs.** Innan §5b:s 9 gap-kandidater
(särskilt #8, "multiplikation gör alltid större") kodas som nya
`pattern`-värden: en enkel, läsande körning mot befintlig elevdata för att
se hur stor andel felsvar idag hamnar i `calculation_error`-fallbacket i
[analyzeError.js:141-145](../src/domains/arithmetic/analyzeError.js). Är
andelen stor finns det sannolikt odokumenterade mönster att fånga; är den
liten täcker motorn redan det som faktiskt händer i klassrummen. Ingen
kodändring, ingen elevpåverkan — bara en fråga mot loggad data.

**Känd kostnad att väga in:** `analyzeArithmeticError` returnerar vid
första träff i en fast ordning (se `analyzeMultiplication`/
`analyzeDivision` i samma fil). Nya hypoteser kan "stjäla" träffar från
befintliga koder — t.ex. kan gap #7 (skutträkning i tabellen) redan idag
fångas upp av `table_off_by_one`, och #8/#9 delvis av `operation_swap`/
`reversed_operands`. Gamla sparade analyser behåller sin ursprungliga kod,
men samma uppgift besvarad före och efter en sådan ändring kan få olika
kod — det gör longitudinell jämförelse (ett av nivå B:s syften) svagare
tvärs över en sådan ändring. Kontrollera därför överlapp mot befintliga
hypoteser innan en ny kod läggs till.

**C. Gör katalogen maskinläsbar.** `SCREENING_SELECTION_PRINCIPLES.md` är
ett designdokument med markdown-tabeller — inte något en server kan
validera mot. Nästa konkreta leverabel (separat från det här dokumentet)
är en importerbar datafil, t.ex.
`{ code, ncmCodes, mapsFromPatterns, prerequisiteNcm, defaultAlternativesSv, contrastHintSv }`
per rad, byggd direkt ur §5/§5b:s verifierade mappningar.

**D. Bygg nivå B enligt §1:s rättelse.** Valideringen måste gå via
`mapsFromPatterns` mot `interpretation.patterns` i varje supportRef —
exakt samma mekanism som `existing_signal`/`signalCode` i
`pupilAnalysis.js:58-61`, inte en svagare katalog-medlemskapskontroll.
Avgör samtidigt om samma spärr även ska gälla `analysisBasis` i
[_teacherMaterialPreview.js:39](../api/_teacherMaterialPreview.js).

Ordningsförslag: **A och B kan göras parallellt redan nu** (ingen kräver
kod). **C och D är den egentliga nivå B-leveransen** och väntar på ett
uttryckligt godkännande innan någon kod ändras, i linje med hur allt annat
i den här sessionen har hanterats.
