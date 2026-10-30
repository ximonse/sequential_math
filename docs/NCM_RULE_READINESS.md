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

Den domängemensamma granskningen är klar som inventering, inte som komplett
implementation. Följande delmål är att pröva snävt strukturerade modeller
för bråk/procent/räkneordning mot granskade negativa fall och frågekontraster,
samt rätta de för breda tillämpningarna i befintliga modeller före automatisk
diagnostisk användning. Samma kandidatkontrakt ska återanvändas: domän,
appliceringsvillkor, förväntat felsvar, alla träffar, källankare och nästa fråga.
AI behövs inte för själva kandidatberäkningen eller det granskade grenvalet.
