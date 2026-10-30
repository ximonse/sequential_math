# Regelmotor: gemensam genomgång för alla domäner

2026-10-30. Principen **regelmotor först, AI vid tolkningsbehov** gäller alla
domäner. Den här genomgången skiljer körbara svarskandidater från breda
feletiketter. Den ersätter inte [hela NCM-inventeringen](NCM_DIDACTIC_COVERAGE.md).
Inget originalunderlag eller äldre felanalys skrivs om.

## Vad finns, och vad saknas?

Alla sex domäners analyskod och aritmetikens hypotesfiler är lästa.
Samtliga 33 tidigare inventerade filbundna signalposter är klassificerade
i [den maskinläsbara genomgången](NCM_RULE_READINESS.json). Varje post har
filhash och klass: kandidatberäkning som behöver avgränsas/provas, heuristik,
egenskapskontroll, inmatningstillstånd eller generell feletikett.
Att en kandidatberäkning finns betyder inte att den är didaktiskt validerad.

| Domän | Befintligt stöd | Viktigaste lucka för kända felsvar |
|---|---|---|
| Aritmetik | Flera beräknade kandidater för fyra räknesätt | Domängränser, breda toleranser, minnessiffrors position och konkurrerande träffar. Växling genom noll utökad offline nedan. |
| Bråk | Bråkvärde, förenkling och nämnaravvikelse | Beräknade komponentfel och begreppskontraster; fel nämnare visar inte varför. |
| Procent | Generell markering av fel svar | Kandidater för del/helhet, procentenheter och successiva ändringar; skilj från beräkningsfel. |
| Algebra | Några koefficient-/kvadratkandidater och textheuristiker | Knyt till faktisk uttrycksstruktur; nivå och svarstext räcker inte för exakt mekanism. |
| Räkneordning | Generell markering av fel svar | Räkna ut vad olika felprioriteringar ger. Nuvarande kod kallar alla numeriska fel fel räkneordning. |
| Talpar/dubblor | Generell markering av fel svar | Förutsägbara svar där de kan särskiljas; slutsvaret bevisar inte ett minnes-/återkallningsproblem. |

Maskinlistan behåller källpekare till alla 11 referensavsnitt, 30 mappningar,
9 luckor, 7 begrepp, 3 nyanser, 6 AG6-steg, 126 CSV-koder samt omappade
signaler, områden utanför motorn och kompletterande luckor. Ursprungliga
statusar är kvar där inget nytt byggts. M02 anger uttryckligen offlinekod,
inte produktion. Detta är en källbunden arbetsöversikt, ingen konkurrerande
diagnoskatalog eller ny källvalidering av alla NCM-facit.

Återskapa den läsande genomgången med:

```text
node scripts/audit-ncm-rule-readiness.mjs
```

Verktyget läser lokala filer och skriver JSON till stdout. Det gör inga
nätverksanrop och ändrar inga filer. Ändrad referenshash eller en signal som
inte längre finns i angiven fil stoppar genomgången för avstämning.

## Första genomförande: växling genom noll

`src/domains/arithmetic/subtractionCandidates.js` beräknar kandidater och
behåller alla träffar. Två befintliga kolumnberäkningar återanvänds; den gamla
nollkolumnsberäkningen är extraherad till en delad funktion med samma beteende.
Två nya, snävt avgränsade modeller har tillkommit:

| Modell för 402 − 178 | Felaktig representation av 402 | Beräknat felsvar |
|---|---|---:|
| Givande hundratal minskas inte | 4 hundratal, 9 tiotal, 12 ental | 324 |
| Tio tiotal behålls efter vidare växling | 3 hundratal, 10 tiotal, 12 ental | 234 |

Applicerbarheten kräver ett tresiffrigt icke-negativt heltal som minuend,
en inre nolla och ental som faktiskt kräver växling genom noll. Modellen
används inte för decimaler, negativa resultat, flera nollor i rad eller ett
godtyckligt +100-fel. Felrepresentationen räknas fram före jämförelsen med
svaret. Saknat borrowCount ersätts inte av en gissad felorsak; tillämplighet
och felrepresentation härleds här direkt ur de kontrollerade operanderna.

Exakt rätt svar ger ingen felsignal. Ett otolkbart svar rundas inte till en
kandidat. NCM-kopplingen är området AS2/M02, inte ett påstående att våra nya
modellnamn är officiella NCM-koder.

**Överlapp är ett resultat:** på 100 − 5 ger både större-minus-mindre per
kolumn och tio-behållna-tiotal svaret 105. Båda kandidaterna visas. En ny
kontrast eller granskat arbete behövs för att skilja dem åt.

## Från kandidat till följdfråga

Befintliga `decidePilot` är utökad till `synthetic-as2-v2`, inte ersatt.
För genom-noll-området väljer en ny kandidatmatchning en oanvänd parallell
kontrast. Efter två olika matchande uppgifter stoppas automatiken för
metodgranskning; ingen elevmetod fastställs av slutsvaren ensamma.
Kandidatlistan följer beslutet med observationsref och källrevision där den
finns. Befintliga spar-, metodkonflikts-, budget- och avbrottsspärrar gäller.

Hela utredningskedjan har nu också ett separat genom-noll-fall med mål,
undervisningsförslag, nya ohjälpta kontroller och senare överföring till ett
annat sammanhang. Se [körningen](evaluations/ncm-didactic-2026-10-30/investigation-prototype.md).
Alla metodbedömningar och undervisningstillfällen är simulerade där.

## Andra genomförande: beräknade felmodeller i alla sex domäner

`src/domains/predictableErrors/` ger ett gemensamt kandidatkontrakt per domän
(`predictable-errors-v1`, nu v2): applicerbarhet, rätt svar räknat i kod, alla
förutsagda felsvar, alla träffar och NCM-ankare. Ingen träff väljs som säker
orsak; överlapp visas.

| Domän | Exempel på beräknade modeller |
|---|---|
| Aritmetik | byte av räknesätt, minnessiffra glömd, större minus mindre, växling glömd, växling genom noll, delare/täljare som svar, platsvärdesskalning; decimaladdition/-subtraktion i platsjusterade kolumner (M26) |
| Bråk | täljare och nämnare var för sig, första nämnaren behålls, addition i stället för multiplikation, heltal i nämnaren |
| Procent | procenttalet som belopp, del/helhet omvänd, bara förändringen, omvänd förändring, kvot ej omräknad, division med procenttalet |
| Algebra | ej lika termer slås ihop, koefficient tappad/adderad, konstant/variabel tappad, kvadrat som dubbling |
| Räkneordning | uttryck utvärderade med felprioriteringar; ett godtyckligt fel blir inte en räkneordningsetikett |
| Talpar/dubblor | summa i stället för saknad term, känd term/mål returnerat, dubbel i stället för halv, tabellgranne |

Modellerna går nu hela vägen i elevunderlaget: `addPredictableEvidence` lägger
en projektion på varje fullständigt bedömt svar utan att ändra källetiketter,
rättning eller elevprofil. Konflikt mellan beräknat och lagrat facit, eller
mellan modellens och källans rättning, ger ingen kandidat. Regelrapporten
skapar `rule_candidate`-hypoteser med stöd, jämförbara motexempel och en
granskad, ej utdelad särskiljande följdfråga. Lärarvyn märker dem
”Beräknad felmodell”. MCP-verktyget `math_preview_analysis` beskriver att
kända modeller inte behöver räknas om av AI.

Verifierat lokalt 2026-10-30: 197 testfiler/1051 tester, produktionsbuild,
MCP-kontrollerna (19), robotarna för elevunderlag, analysrapport och vanliga
räknesätt. Analysroboten prövar både tomläget (402 − 178 besvarat 213, ingen
modell) och att 376 på samma uppgift ger ”större minus mindre” som beräknad
modell med otillräckligt underlag (ett svar), inte som elevens metod.
Modellerna är byggda och syntetiskt testade, inte granskade mot verkliga
elevsvar eller godkända för automatisk diagnostik.

## Tredje genomförande: skärpt befintlig felanalys i elevappen

Simon beslutade 2026-10-30 att elevappens befintliga felanalys
(`src/domains/arithmetic/analyzeError.js`) ska bli mer träffsäker. Ändringen
gäller nya svar; sparade etiketter skrivs inte om. Kategorin ouppmärksamhet
påverkar mastery och svårighet, så heltalsbeteendet är oförändrat.

- Platsvärdesfel kräver exakt skalning (×10, ×100, ×0,1, ×0,01), inte en
  kvot mellan 9,5 och 10,5.
- Decimaluppgifter jämförs exakt. Avrundningsmarginalen 0,5 gäller bara
  heltalsuppgifter med icke-heltaligt facit, till exempel division.
- Kolumnmodeller (minnessiffra, växling, större minus mindre) körs på
  platsjusterade decimalkolumner och aldrig på negativa kolumnfall.
- Behov av minne/växling räknas ur talen; saknad metadata hoppar inte längre
  över modellen. Heltalsmodeller (tabellgranne, bara ental) gäller bara heltal.

| Uppgift och svar | Före | Efter |
|---|---|---|
| 52 − 38, svar 26, utan metadata | beräkningsfel | större minus mindre |
| 47 + 35, svar 72, utan metadata | beräkningsfel | minnessiffra glömd |
| 40 + 45, svar 830 | platsvärdesfel | beräkningsfel |
| 3 × 4, svar 118 | platsvärdesfel | beräkningsfel |
| 6,27 − 5,84, svar 12 | fel räknesätt (ouppmärksamhet) | beräkningsfel |
| 3,48 + 2,67, svar 5,05 | beräkningsfel | minnessiffra glömd |
| 6,42 − 2,17, svar 4,35 | beräkningsfel | större minus mindre |
| 7 × 8, svar 63 / 24 ÷ 6, svar 6 | tabellgranne / delaren | oförändrat |

Kvar: analysen väljer fortfarande första träff och visar inte överlapp.

## Första prövning mot verkliga felsvar (2026-10-30)

Simon godkände prövning med elev-ID/pseudonym utan personnamn. Underlag:
alla 471 felsvar i två åk 6-klasser 1–30 oktober (skrivskyddad export, lagrad
utanför repot). Regelmotorn kördes lokalt utan AI. Här redovisas bara summor.
Uppgiftstexten tolkades till operander; facit stämde i alla tolkade fall.

| Problemtyp | Felsvar | Beräknad modell | Vanligaste modell |
|---|---:|---:|---|
| Tabellträning | 321 | 89 | tabellgranne 81, platsvärdesskalning 8, fel räknesätt 3 (överlapp 3) |
| Talpar | 85 | 6 | summa, måltal, känd term (2 vardera) |
| Dubblor | 44 | 7 | minnessiffra glömd 4, talet oförändrat 3 |
| Procent | 5 | 3 | procenttalet som belopp |
| Övrigt (decimal-, uttrycks-, bråk-, algebrauppgifter) | 16 | 1 | algebra tolkades inte ur exporttexten |

Mönster bland omatchade svar, som ännu **inte** är modeller:

- **Ett ifrån facit:** talpar 26, tabeller 22, dubblor 6. Kan vara uppräkning
  ett steg fel, men också gissning; särskiljande fråga behövs.
- **Bara en siffra av facit** (t.ex. 9 + 9 → 1, 3 × 4 → 1): första siffran 13,
  sista siffran 10. Tyder på avbruten inmatning snarare än räknefel; svarstid
  och inmatningslogg behövs innan det tolkas som kunskap.
- **Heltal och decimal multiplicerade var för sig** (7 × 6,7 → 42,49;
  6 × 2,8 → 12,48): 2 av 2 i den uppgiftstypen. Tydlig, förutsägbar modell.
- **Annan produkt i samma tabell** (87 tabellsvar) är vanligt även av en slump
  och räcker inte som orsak.
- Den gamla analysen kallade 4 × 2,2 → 6,6 för fel räknesätt (ouppmärksamhet)
  på grund av toleransen 0,5; 4 + 2,2 = 6,2. Den skärpta analysen gör inte så.

## Nya modeller från prövningen (regelversion v2)

Simon godkände 2026-10-30 tre modeller utifrån de verkliga felsvaren:

| Modell | Var | Hur den används |
|---|---|---|
| Heltal och decimal multiplicerade var för sig (`decimal_parts_multiplied_separately`) | regelmotorn och elevappens analys | Missuppfattning, t.ex. 7 × 6,7 → 42,49. Gäller heltal gånger tal med en decimal. |
| Bara första siffran i facit (`partial_answer_entry`) | regelmotorn och elevappens analys (aritmetik, talpar, dubblor) | Kategori ouppmärksamhet, inte kunskapsfel, så att mastery inte sänks för en avbruten inmatning. Sista siffran ensam räknas inte hit. |
| Ett ifrån facit (`answer_off_by_one`) | bara regelmotorn (talpar, dubblor, tabellfakta upp till 10 × 10) | Kandidat som alltid kräver en särskiljande fråga. Elevappens analys ändras inte, så den räknas aldrig ensam som orsak. |

Regelversionen höjdes till `predictable-errors-v2`; sparade v1-hypoteser
måste byggas om från nytt underlag. Omkörning mot samma oktoberexport:
tabellträning 117 av 321 (tidigare 89), talpar 35 av 85 (6), dubblor 11 av 44
(7) och decimalmultiplikation 2 av 2 (0).

## Gräns för denna leverans och nästa steg

Verifierat lokalt: 195 testfiler/1019 tester passerar, inklusive 13
kandidat-/routingprov, två täckningsprov och befintliga beslutsprov.
Produktionsbuild, riktad ESLint, arkitektur- och kartkontroller passerar.
Elevroboten ”Svarar fel på allt i Subtraktion” passerar mot ett eget lokalt
produktionsbygge och minnesdatabas, 40 svar och noll regelbrott. Den provar
regression i vanlig träning, inte de nya offlinekandidaternas elevintegration.
Inga verkliga elever, produktionsskrivningar eller fysisk iPad ingår.

Nya kandidatberäkningar och frågerouting är körbara **offline**. Elevappens
vanliga felanalys får ännu inte de nya modellnamnen och progression/mastery
ändras inte. Refaktoreringen av den återanvända gamla beräkningen ändrar inte
dess avsedda beteende. Det är ingen publicering eller verklig elevprovning.

Den domängemensamma granskningen är klar som inventering och modellerna är
nu kopplade till lärarens granskningsunderlag. Kvar: pröva modellerna mot
granskade negativa fall och verkliga felsvar (kräver klarlagd AI-miljö för
elevdata), rätta de för breda tillämpningarna i de äldre modellerna, och låta
elevappens vanliga felanalys och den adaptiva screeningen använda samma
kandidatkontrakt före automatisk diagnostisk användning. Samma kandidatkontrakt ska återanvändas: domän,
appliceringsvillkor, förväntat felsvar, alla träffar, källankare och nästa fråga.
AI behövs inte för själva kandidatberäkningen eller det granskade grenvalet.
