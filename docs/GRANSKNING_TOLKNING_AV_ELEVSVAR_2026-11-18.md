# Granskning: hur appen tolkar elevsvar och visar dem för läraren

Datum: 2026-11-18. Kodrevision: `20fc401` (grenen `claude/screening-result-wait`,
samma kod som produktion `63d09b6` plus dokumentation).
Uppdrag (Simon): granska om felförståelseanalysen och presentationen är
harmoniska och har dokumenterade beroenden och flöden. Tidigare beslut får
ifrågasättas. Var noggrann, linda inte in.

Granskningen ändrar ingen kod. Påståenden om beteende är kontrollerade i koden
och, där det står *testat*, med ett körbart test mot nuvarande kod. Testfilen
ligger inte i repot.

## 1. Sammanfattning

**Nej, analysen och presentationen är inte harmoniska, och flödena är inte
dokumenterade på ett ställe.**

- Ett elevsvar tolkas på minst **åtta ställen** med olika regler.
  Två av dem bestämmer på egen hand om läraren ska se en misstanke:
  `classifyPupilAnswers`, som används av screeningkorten, och elevrapporten.
  De ger olika svar på samma elevsvar.
- Samma svar kan i dag beskrivas på tre eller fyra olika sätt beroende på vy.
  Det tydligaste exemplet är ett enstaka fel räknesätt (avsnitt 4, K1):
  felförståelse i screeningkortet, "troligen slarv eller inmatning" i
  elevrapporten, ouppmärksamhet i den sparade posten och kunskapsfel i
  Elevprofilens tabeller.
- Önskan att rätta svar ska väga upp enstaka fel finns **inte** i koden, med
  ett undantag ("Kvoten blir ett fel"). Den fanns i förslaget till beslut 3
  den 12/11 men föll bort i genomförandet. Det är inte dokumenterat varför.
- Flera tidigare beslut fattades i ett sammanhang och används nu i ett annat
  (avsnitt 5). Det gäller särskilt kravet på tre olika uppgifter, som togs
  fram mot slumpträffar men nu också styr fel räknesätt, där slumprisken är låg.
- Rättningarna jag gjorde i går och i dag minskade synliga krockar men lade
  till ytterligare ett tolkningslager. Ett av mina påståenden om nivån var fel
  (avsnitt 7).
- Synteserapporten 2026-11-04 (`LEARNING_SYSTEM_SYNTHESIS.md`, F01) hade redan
  rekommenderat en gemensam beräkning för alla lärarvyer. Den är inte
  genomförd. Styrdokumentets steg 6, samma struktur för träningssvaren, är inte
  påbörjat.

## 2. Tolkningskällor

| # | Källa | Kod | När | Vad den avgör | Läses av |
| --- | --- | --- | --- | --- | --- |
| T1 | Svarstidens felanalys | `src/domains/*/analyzeError.js`, `errorHypotheses/` | När eleven svarar. Sparas. | `errorPatterns`, `errorDetail` och kategorin `knowledge`/`misconception` | Sparad post, export, äldre etiketter i felförståelsekartan, elevrapportens reservhypoteser, stödsignalen |
| T2 | Ouppmärksamhet | `studentProfileTimingHelpers.js` `classifyErrorCategory` | När eleven svarar. Sparas. | `inattention`: fel räknesätt (`isOperationSwapInattention`), eller a + b i stället för a − b i blandat läge | Adaptiv svårighet (`difficultyAdapter.js:101`, `difficultyAdapterProfileHelpers.js:154`), lärarsammanfattningen, lärartabeller |
| T3 | Felmodellerna | `src/domains/predictableErrors/`, katalog `catalog.js` | Räknas om varje gång underlaget läses | Vilka modeller som ger elevens svar | Alla nyare vyer, via T4–T6 |
| T4 | Täckning och screeningkort | `src/lib/errorCoverage.js` `classifyPupilAnswers` + `screeningMisconceptions.js` | Vid läsning | Sex grupper, kravet på tre uppgifter (observation under tre), "samma uppgift tre gånger", lärarens val, och i screening ett fel räknesätt som felförståelse redan första gången | Screeningkort, tabellcellens text (sedan 18/11), täckningsrapporten |
| T5 | Elevrapporten | `pupilRuleHypotheses.js`, `pupilAnalysis.js` **och** `PupilAnalysisReportView.jsx:67–72` | Vid läsning | Kort per modell, motexempel, "Enstaka svar" eller "Misstanke", och slarv eller misstanke (den sista indelningen görs i visningskomponenten) | Elevprofil → analys, MCP |
| T6 | Uträkningssignaler P, Ö, M | `diagnosticScreeningSummary.js`, `diagnosticSubtractionPattern.js` | Vid läsning, bara screening | Kolumnförskjutning, olika svar i häfte och ruta, och M (bara uppgift S2, 402 − 178) | Tabellcellen, dialogen, `addPredictableEvidence` |
| T7 | Lärarsammanfattning och stödsignal | `masteryCalculation.js` `computeTeacherSummary`, `buildAdaptiveSupportSignal` | När eleven sparar. Lagras. | Kunskapsfel och ouppmärksamhetsfel per dag och vecka, och stödsignal | Framstegsraderna, CSV-export, "Behöver stöd" |
| T8 | Lärarvyernas kategori (min ändring 18/11) | `practiceObservation.js:34` `teacherErrorCategory` | Vid läsning | Fel räknesätt sparat som ouppmärksamhet räknas som kunskapsfel | Elevprofilens nivåtabell, NCM-paneler, analysunderlag, export, felförståelsekartan |

Till detta kommer lärarens egna beslut. De följer olika vägar:

- **Lärarens bedömning i screening** (rätt, inskrivet svar, vald felförståelse) följer med till screeningkort, tabell och elevrapport, men tolkas olika (K4).
- **"Dölj som slarv"** i elevrapporten gäller bara elevrapporten (K5).

## 3. Vyerna och vad de läser

| Vy | Källor | Kommentar |
| --- | --- | --- |
| Screening → Resultat, kort och rutor | T3, T4 | Senaste försöket per uppgift och elev |
| Screening → Resultat, tabellcell | T4 (gruppen), T6 (P/Ö/M) och lärarens bedömning | Förklaringen säger "M · Möjligt metodfel" som om M vore allmän (K7) |
| Screening → elevgenomgång (dialog) | T6 och originalet | Visar inte kortets felförståelse |
| Elevprofil → analysrapport | T3, T5, T1 som reserv, lärarens val | Indelningen i slarv och misstanke görs i visningskomponenten |
| Statistik & stöd → felförståelsekartan | T3 (sedan 18/11), T1 som reserv, T2/T8, sparad kategori `misconception` | Röd varning "⚠ N historiska kategorimarkeringar" i rutnätet kommer från T1 (K8) |
| Statistik & stöd → Individanalys och NCM | T2/T8 | Kunskapsfel och ouppmärksamhet |
| Framsteg, raderna | T7 | Lagrade siffror |
| Behöver stöd | T7 (stödsignal) | Prioriterar vem läraren ska titta på, utan felorsak. Ingen krock. |
| Uppföljningens resultat ("Fråga igen") | Eget: rätt nu eller samma fel | "Rätt nu – troligen slarv eller stress" (K9) |
| MCP (`math_get_pupil_evidence`) | T1 och T3 i samma post | AI:n får båda lagren och måste själv hålla isär dem |
| Elevens egen vy | Ingen | Eleven ser inga felanalysetiketter. Kontrollerat. |

## 4. Krockar

Allvar: **H** betyder att läraren får motsägande besked om elevens förståelse.
**M** betyder att det kan leda läraren fel men är märkt eller ovanligt.
**L** gäller formulering eller kosmetik.

**K1 (H). Ett enstaka fel räknesätt beskrivs på fyra sätt.**
Exempel: en övningsuppgift 402 − 178 = 580, eller samma fel på en
screeningfråga.

- Screeningkortet: felförståelse "Annat räknesätt", märkt *en gång i
  screeningen* (`screeningMisconceptions.js:28`, catalog `screeningShowsSingle`).
- Elevrapporten: "Troligen slarv eller inmatning", eftersom kravet på tre
  uppgifter inte är uppfyllt (`PupilAnalysisReportView.jsx:71`, rubriken på
  rad 240).
- Täckningsrapporten och elevens täckning utanför screening: observation
  (`errorCoverage.js` `groupsBelowPattern`). I screeningvyn har rutan för
  observationer texten "Ingen felförståelse", men just fel räknesätt lyfts
  där till kort.
- Den sparade posten, bara för övningssvar: `inattention`
  (`studentProfileTimingHelpers.js:92`). Screeningsvar får ingen sådan kategori.
- Elevprofilens tabeller sedan 18/11: kunskapsfel (T8).
- Felförståelsekartan sedan 18/11: "Annat räknesätt", beräknad förklaring.

Katalogen säger samtidigt att fel räknesätt *inte* är slarv (`catalog.js:33`).

**K2 (H). Rätta svar väger inte upp fel.**
- Elevrapporten blir "Misstanke" vid två felsvar, oavsett antalet rätta svar på
  jämförbara uppgifter (`pupilAnalysis.js:85`). Motexemplen visas men påverkar
  inte bedömningen. Det enda undantaget är modellen "Kvoten blir ett fel"
  (`pupilRuleHypotheses.js:71`).
- Screeningkorten (`classifyPupilAnswers`) räknar inte rätta svar alls. Ett fel
  på en modell utan krav på tre uppgifter ger ett felförståelsekort, även om
  eleven har rätt på andra uppgifter i samma screening som prövar samma sak.
- "Fel på samma uppgift flera gånger" kräver tre fel, oavsett hur många gånger
  eleven svarat rätt på samma uppgift (`repeatedTasks.js:20`). Tre fel och 27
  rätt på 6 · 7 ger "Faktumet sitter inte ännu" (`PupilAnalysisReportView.jsx:224`).

**K3 (H). Elevrapporten och screeningkorten är två motorer.**
De delar kravet på tre uppgifter (`meetsPattern`) men inte resten:

| Regel | Screeningkort (T4) | Elevrapport (T5) |
| --- | --- | --- |
| Allmän modell döljs när en specifik förklarar (`yieldsToSpecific`) | Nej | Ja |
| Fel räknesätt redan första gången | Ja, i screening | Nej |
| Lärarens vald felförståelse gör svaret till felförståelse | Ja | Nej, listas separat |
| Snabbhetsträningens enstaka slarv | Grupperas som observation eller inmatning | Sammanfattas och visas inte |
| Slarv eller misstanke avgörs | I biblioteket | I visningskomponenten |

Kommentaren i `errorCoverage.js` om att rapporten "judges patterns the same
way" stämmer bara för kravet på tre uppgifter. Regel R-E i styrdokumentet
("elev, grupp och klass visar samma sak") är spärrad med ett test för klass
mot elev **inom** screeningvyn. Elevrapporten mot screeningkorten omfattas inte.

**K4 (H). Ett svar som läraren skrivit in tolkas olika.** *Testat.*
Eleven lämnade rutan tom men skrev 376 i räknehäftet, och läraren skriver in 376.

- Tabellcellen: "Fel svar enligt läraren".
- Screeningkorten: "Obesvarade med uträkning". Inget kort, eftersom
  `pupilOwnEntry` går tillbaka till elevens eget svar.
- Elevrapporten: misstanken "Större minus mindre i varje kolumn", eftersom
  `_pupilEvidence.js:44` analyserar lärarens svar.

R-C säger att räkningen utgår från elevens eget svar. Det gäller täckningen.
Screeningkorten är lärarens vy och följer samma regel som täckningen, inte
samma regel som rapporten.

**K5 (H). "Dölj som slarv" gäller bara elevrapporten.**
Undantagen tillämpas i `_pupilEvidenceRead.js:67`. Screeningkort, tabell och
felförståelsekarta läser inte undantagen. Ett svar läraren har dolt som slarv
kan stå kvar på ett felförståelsekort. Det bryter mot R2 ("Det jag valt ligger
kvar tills jag själv ändrar det") mellan vyer.

**K6 (M). Elevrapporten visar oförklarade fel bara bland de 20 äldsta svaren.**
`pupilAnalysis.js:89` tar `entries.slice(0, 20)` ur en lista sorterad från
äldst. Texten säger "Bland periodens första 20 svar", alltså ärligt, men ett
oförklarat fel bland senare svar syns inte i rapporten. Det går emot R-C
("Inget fel får försvinna"). Styrdokumentet säger att rapportens tak är lösta i
steg 4, men det här taket finns kvar.

**K7 (M). Signalen M gäller en enda uppgift men presenteras som allmän.**
`diagnosticSubtractionPattern.js:16` gäller bara uppgift S2 (402 − 178).
Tabellens förklaring säger "M · Möjligt metodfel"
(`DiagnosticScreeningMatrix.jsx:27`). Felmodellen "Större minus mindre i
varje kolumn" gör samma sak för alla uppgifter. M är en äldre dubblett.

**K8 (M). Röd varning från den gamla analysen i felförståelsekartan.**
Rutnätet visar "⚠ N historiska kategorimarkeringar" i rött
(`ClassMisconceptionHeatmap.jsx:188` och `:249`). Siffran räknar svar som den
gamla analysen (T1) märkte `misconception`, oavsett vad modellerna säger i dag.
Det är det mest framträdande i rutnätet och bygger på det äldsta lagret.

**K9 (L). "Fråga igen" tolkar ett rätt svar som slarv.**
`FollowUpResults.jsx:118` skriver "Rätt nu – troligen slarv eller stress" om
ursprungsfelet, även när det låg på ett felförståelsekort. Det är en tolkning
av ny information och kan vara rimlig, men orden krockar med kortet och med
regeln att ett fel är ett fel.

**K10 (L). Signalen Ö och rutan Inmatning säger olika saker.**
Ö säger "Skillnaden bevisar inte slarv". Rutan Inmatning säger "Rätt tänkt men
fel skrivet" när räknehäftet visar rätt resultat. Båda kan gälla samma svar.

**K11 (M). Mängdträning definieras på två sätt.**
- Analysen (`practiceModes.js:7`): tabeller, talkompisar, dubblor och talbilder.
  Inga följdfrågor, och enstaka slarv sammanfattas.
- Mastery och nivå (`evidenceContract.js:75`, `usePracticeCoreActions.js:318`):
  bara tabellträning påverkar varken mastery eller nivå. Talkompisar och dubblor
  i vanlig träning räknas till mastery och styr den adaptiva nivån.

Om det är avsikten är det inte dokumenterat som en avsikt.

## 5. Beslut som bör prövas

**B1. Kravet på tre olika uppgifter (beslut 3, 12/11) gäller nu också fel räknesätt.**
- Beslut 3 gällde slumprisk: "Angränsande produkt" förutsäger 3,8 svar per
  uppgift. Fel räknesätt förutsäger ett svar per uppgift (beslut 4:s underlag),
  så slumprisken är låg.
- Beslut 4 tog över kravet ("med samma krav på tre olika uppgifter").
- Sedan sorterar elevrapporten allt under tre uppgifter som "Troligen slarv",
  medan screeningen visar samma svar som felförståelse efter en gång.
- Kravet kommer alltså från ett annat sammanhang.

*Fråga:* Gäller kravet på tre uppgifter modeller med låg slumprisk? Och ska
"under kravet" heta *för lite underlag* i stället för *troligen slarv*?

**B2. Villkoret att rätta svar ska väga upp föll bort.**
Förslaget till beslut 3 innehöll "fler träffar än jämförbara rätta svar". I
genomförandet står bara "togs inte med" (STYRNING, rad 487, commit `331ad37`).
Det framgår inte om du valde bort det. Det du sa i dag pekar på att det behövs.

*Fråga:* Ska rätta svar på jämförbara uppgifter kunna dämpa en misstanke, i
alla vyer? Hur mycket? Exempelvis fler felträffar än jämförbara rätt, som
förslaget löd.

**B3. "Fel räknesätt är en felförståelse" (beslut 4) står bredvid en öppen fråga.**
Din fråga från 12/11, "tecknet, uppmärksamheten eller när man adderar
respektive subtraherar?", är inte besvarad. Samtidigt sparar appen fel
räknesätt som ouppmärksamhet och dämpar den adaptiva sänkningen.

*Fråga:* Vad ska fel räknesätt vara tills frågan är prövad: felförståelse,
uppmärksamhet, eller "ospecificerat, pröva"? Ska det skilja mellan
mängdträning och screening?

**B4. Lärarens inskrivna svar.**
Den 12/11 beslutade du att analysen ska läsa lärarens bedömning ("annars blir
analysen fel"). Täckningsregeln R-C utgår från elevens eget svar. Screeningkorten
följer R-C och rapporten följer 12/11-beslutet.

*Fråga:* När läraren har skrivit in vad eleven skrev i räknehäftet, ska korten
analysera det svaret?

**B5. "Samma uppgift fel tre gånger" (13/11).**
Ditt exempel var 6 · 7 fel tre gånger. Regeln ser inte de rätta svaren.

*Fråga:* Ska regeln kräva att felen är fler än, eller en viss andel av, svaren
på uppgiften?

**B6. Vad räknas som mängdträning (30/10 och i dag)?**
Du sa i dag att fel i mängdträningen inte ska påverka nivån. Koden gör så för
tabellträning men inte för talkompisar och dubblor i vanlig träning (K11).

*Fråga:* Vilka aktiviteter avser du?

## 6. Avsiktliga skillnader

De här skillnaderna är avsiktliga och har en angiven källa. Ingen av dem är
samlad i ett dokument:

| Skillnad | Källa |
| --- | --- |
| Tabellträning påverkar varken mastery eller nivå, men svaren sparas och analyseras | Kod `evidenceContract.js:75` och `usePracticeCoreActions.js:318`. Simon i dag. |
| Snabbhetsträning ger inga följdfrågor, och enstaka slarv sammanfattas | Simon 2026-10-30, `practiceModes.js` |
| Fel räknesätt visas efter en gång i screening men kräver tre uppgifter i elevrapporten | Simon 2026-11-14 och agentens val, STYRNING steg 5 |
| Täckningen räknar elevens eget svar, och lärarbedömda svar redovisas separat | R-C |
| Lärarens bedömning läses av analysen | Simon 2026-11-12, `evidenceTeacherAssessment.js` |
| Historiska etiketter bevaras och skrivs aldrig om | `practiceObservation.js`, LEARNING_SYSTEM_SYNTHESIS F01 |
| Lärarens val ur listan gör svaret till felförståelse i screening men inte i elevrapporten | STYRNING steg 4, 13/11 |

## 7. Mina egna ändringar 17–18/11, granskade på samma sätt

- **Tabellcellen följer korten (`f3186e4`).** Rätt i sak. Tabell och kort läser
  nu samma regel. Ändringen avgör inte K3: korten och elevrapporten skiljer sig
  fortfarande.
- **Felförståelsekartan visar aktuell förklaring (`c9074f5`).** Följer
  synteserapportens F01 för en vy. Den röda varningen K8 lämnades kvar.
- **`teacherErrorCategory` (`63d09b6`, ditt val A).** Har tre brister:
  1. Funktionen är ett nytt tolkningslager (T8) i stället för en gemensam
     beräkning.
  2. Den använder flaggan `screeningShowsSingle` ("visa efter en gång i
     screening") för att hitta fel räknesätt. Det är en annan betydelse. Den
     råkar ge rätt modeller i dag men går sönder om flaggan används för något
     annat.
  3. Den bygger på beslut 4, som har en öppen fråga (B3). Efter ändringen säger
     tabellerna kunskapsfel men elevrapporten "troligen slarv" för ett enstaka
     fel räknesätt. K1 fick ett läge till.
- **Fel påstående från mig 18/11.** Jag skrev att fel som klassats som
  ouppmärksamhet "inte sänker elevens nivå och inte påverkar vilka uppgifter
  eleven får". Det stämmer inte:
  - Mastery räknar dem som fel (`masteryCalculation.js:21`).
  - Den adaptiva svårigheten sänks, men mindre: −0,03 mot upp till
    `downHard` (`difficultyAdapter.js:101`).
  - Val A ändrade inget av detta, så beteendet är detsamma. Beskrivningen av
    vad A lämnade orört var fel.

## 8. Dokumentationsläget

- Flödena beskrivs i fem dokument från olika tidpunkter:
  `PRODUCT_FRAMEWORK_MAP.md` (sept), `data-flow.md`,
  `LEARNING_SYSTEM_SYNTHESIS.md` (4/11), `STYRNING_FELFORSTAELSER.md`
  (11–15/11) och `NCM_DIAGNOSTIK_PROJEKT.md`.
- Inget av dem beskriver alla tolkningskällor T1–T8, vilka vyer som läser vad,
  och vilka skillnader som är avsiktliga.
- STYRNING är antaget som styrande, men dess avsnitt 3 och beslut 4 är delvis
  inaktuella:
  - Beslut 4 säger att 4 + 3 = 12 inte fångas, men modellen `add_multiplied`
    finns.
  - "Fel räknesätt sorteras som slarv" står kvar som nuläge.
- Synteserapportens rekommendation F01, gemensam beräkning för lärarvyerna,
  är inte genomförd och inte avförd.
- Den här rapporten är ett nytt dokument. Den bör inte bli ett sjätte
  konkurrerande dokument. Se förslaget nedan.

## 9. Förslag till väg framåt

Det här är förslag, inga beslut. Inget är byggt.

1. **Besluten först.** Svara på B1–B6. Flera krockar försvinner av sig själva
   när besluten är tydliga, och andra kan inte rättas utan dem.
2. **En tolkning per svar.** Bygg en funktion som för ett elevsvar ger en
   versionsmärkt tolkning:
   - grupp
   - modeller
   - felförståelser
   - styrka: enstaka, mönster, eller motsagt av rätta svar
   - lärarens beslut: bedömning, val och dold som slarv

   Alla lärarvyer läser den: screeningkort, tabell, elevrapport, felförståelsekarta,
   tabeller och MCP. Slarv eller misstanke flyttas ut ur visningskomponenten.
   `teacherErrorCategory` ersätts av den.
3. **Rätta svar som motvikt** enligt B2, i samma funktion, så att alla vyer får
   samma regel.
4. **Sparade etiketter (T1, T2)** blir historik. De visas bara som historik och
   styr ingen lärarvy. Om ouppmärksamhet ska fortsätta påverka den adaptiva
   nivån (B3, B6) är det ett eget beslut om elevens träning, skilt från
   lärarvyerna.
5. **Ett dokument** för flödet: tolkningskällor, vyer, avsiktliga skillnader
   med källa. Det ersätter motsvarande avsnitt i de äldre dokumenten, som får
   en hänvisning. Spärra med ett test som jämför screeningkort och elevrapport
   på samma svar (R-E utvidgad).
6. **Småsaker efter det:** K6 (oförklarade fel bland alla svar), K7 (ta bort
   M eller gör den allmän), K8 (varningen läser aktuell tolkning), K9 och K10
   (orden).

Steg 2–5 är ett större arbete och kräver eget förslag och ditt godkännande
innan något byggs.

## 10. Vad som inte är granskat

- Domänernas `analyzeError` för bråk, procent, algebra och uttryck i detalj.
  Bara att de finns och var de används.
- Kontrastfrågornas och materialkedjans urval, som är frysta sedan tidigare.
  Synteserapportens F02–F04 är bara kontrollerade på nytt där de rör tolkning
  (F04 och F08 är åtgärdade).
- Fokus, Kontroll och Multi, alltså uppmärksamhetsprotokollen. De är egna
  signaler och ingen felorsak.
- Riktiga elevsvar. Inga produktionsdata har lästs för den här granskningen.
  Krockarna är visade i kod och test, inte räknade på klasser.
