# Analysrapport och läraravstämning, v1

Lokalt implementerat 2026-10-27. Läraren öppnar **Analys och avstämning** i
elevprofilen, väljer period/källa och skapar ett granskningsunderlag.
Förhandsvisning skriver ingenting. **Spara rapportversion** sparar rapporten;
**Spara avstämning** lägger till lärarens ställningstagande och nästa mål.
Inget av dessa steg delar ut uppgifter eller ändrar elevens progression.

**Visning sedan 2026-11-08 (Simons önskemål, lokalt):** elevprofilen öppnas under
Statistik & stöd med Analys och avstämning överst och öppen. Finns en sparad
rapport visas den senaste med avstämningen; annars skapas en förhandsvisning
direkt (träning och screening för administratörer, annars träning, och
träning om screening inte är tillgänglig). Varje misstanke är ett kort med
klartextrubrik, antal felsvar som stämmer och jämförbara rätta svar, och
elevens svar på egna rader (uppgift, svar, facit, källa, datum) utan klick.
Generiska observationer (`NOT_RIVALS` i `contrast.js`) visas hopfällda som
troligt slarv eller inmatning. Felsvar bland periodens första 20 som ingen
misstanke förklarar visas för sig. Reservationen om att misstankar inte är
diagnoser står en gång överst; varje kort behåller etiketten Misstanke eller
Enstaka svar. Rapportens data och validering är oförändrade.

Ingen modell-API eller MCP-server ingår. Knappen skapar ett **regelbaserat**
underlag från redan lagrade signaler. AI-formulerade rapporter kan lämnas via
samma API/kontrakt, med tydlig ursprungsmärkning och källreferenser.
Projektets skill är `.agents/skills/pupil-analysis/SKILL.md`.

## Vad rapporten betyder

- Servern räknar rätt, fel, partiella, obesvarade, ännu inte lärarbedömda och okända
  svar från [elevunderlaget](PUPIL_EVIDENCE.md). Rapportklienten får inte ange
  egna antal eller konfidensfält.
- Varje styrkeexempel måste referera ett faktiskt rätt svar. Varje hypotes
  kan ha stöd, valda motexempel, alternativa förklaringar och en nästa
  undersökningsfråga. Referenser måste finnas i rätt källsnapshot, vara unika
  per lista och inte samtidigt vara stöd och motexempel för samma hypotes.
- `existing_signal` kräver att den angivna signalkoden finns i varje stödsvar.
  `ai_interpretation` och `teacher_interpretation` är uttryckliga tolkningar.
  Varken befintliga feletiketter eller en giltig referens bevisar en felorsak.
- `rule_candidate` (”Beräknad felmodell” i lärarvyn) kräver att servern själv
  har räknat fram samma modell som träff i varje stödsvar, med samma
  `ruleVersion`. Motexempel måste vara rätta svar på jämförbart innehåll och
  samma kända nivå där modellen hade gett ett annat svar. När screening saknar
  träningsnivå kan samma kända heltalsstruktur jämföras: operation, talbredder,
  växlings-/minnesstruktur, genom-noll-struktur och divisionsstruktur enligt
  `arithmeticContentSignature`. Två motstridiga kända nivåer jämställs aldrig.
  Okända, negativa eller decimala strukturer får ingen sådan reservjämförelse;
  hjälp och metod behöver fortfarande granskas. Ett rätt slutsvar med observerat
  motsägande häftesresultat väljs inte som motexempel; båda observationerna finns
  kvar i underlaget. Nya regelrapporter märks `predictable-candidates-v2`;
  tidigare rapportversioner bevaras. Regelkandidaterna
  läggs ovanpå underlaget; källsnapshot och referenser beräknas på originalsvaren,
  så en ny regelversion ogiltigförklarar inte oförändrade källreferenser men
  stoppar en sparad hypotes med föråldrad regelversion. Se
  [regelmotorn](NCM_RULE_READINESS.md).
- Antalet stödenheter räknas med verklig observations-/försöksidentitet där
  den finns. Två motstridiga versioner av samma observations-ID blir inte två
  oberoende belägg. Legacypositioner behåller sin källbegränsning.
- Färre än två stödenheter ger `insufficient`. Fler ger endast
  `requires_teacher_review`, aldrig ”säker missuppfattning” eller sannolikhet.
  Detta är en försiktighetsmarkering, inte en statistisk signifikansregel.
- Regelunderlaget väljer högst åtta styrkor och åtta tidigare analyssignaler,
  med högst 20 referenser per stöd-/motexempellista. Rätta svar läggs inte
  automatiskt in som motexempel: jämförbarheten måste granskas.
- Fri rapportspråktext är **inte maskinellt sanningskontrollerad**. Servern
  kontrollerar schema, antal och referenser; läraren granskar slutsatser och
  om ett valt motexempel faktiskt prövar samma innehåll/mekanism.

Klicka på källsvaren för att jämföra fråga, faktiskt svar och facit. Även utan
felhypotes finns upp till 20 svar från periodens början, tydligt märkta som
exempel och inte som ett representativt frekvensurval. De utvalda
källsvaren och täckningsmetadata sparas med rapportversionen, inte som en ny
elevprofil. Screeningens räknehäfte hämtas separat från den exakta källrevisionen.
Om källan har ändrats ges en tydlig konflikt; ett nytt original får inte visas
som om det hörde till den äldre rapporten. Originalet ändras aldrig här.

## API

`/api/teacher-students/PUPIL_ID?resource=analysis&classId=CLASS_ID`

Samma lärarsession/header som befintliga lärar-API:er. Klassmedlemskap,
aktuell klassåtkomst och elev-/klasstombstones kontrolleras. Rapporter är
privata per lärarkonto, elev och klass. Screeningrapporter behåller
Screenings admin-/aktiverings-/pilotgränser, även efter att de sparats.
Rapporter som kontot inte längre får se filtreras från både läs- och skrivsvar;
`restrictedReports` anger att sådana versioner finns. Ingen elevåtkomst ges.

`GET` returnerar `revision`, `reports` och `restrictedReports`.
Varje rapport har eget `id`, `version`, `createdAt`, `report` och `checkIns`.

`POST` med `action: "draft"`, `from`, `to`, `source` ger `draft`, en
servervaliderad `preview` och aktuell lagringsrevision, utan skrivning.

`POST` med `action: "create_report"`, samma datum/källa, `requestId`,
`expectedRevision` och `report` sparar en ny, oföränderlig rapportversion.
Servern hämtar underlaget på nytt. Fel källrevision ger 409.

Exempel på `report` (REF/SNAPSHOT ersätts av verkliga referenser):

```json
{
  "schemaVersion": 1,
  "snapshotRevision": "SNAPSHOT",
  "scopeSv": "Undersök subtraktion med växling",
  "provenance": {"kind": "ai", "instructionVersion": "pupil-analysis-v1"},
  "strengths": [{"id": "right-example", "textSv": "Ett rätt exempel i urvalet.", "refs": ["RIGHT_REF"]}],
  "hypotheses": [{
    "id": "exchange",
    "basis": "ai_interpretation",
    "textSv": "Undersök om växling genom nolla påverkar metoden.",
    "supportRefs": ["WRONG_REF"],
    "counterRefs": [],
    "alternativesSv": ["Slutsvaret kan ha uppstått genom flera metoder."],
    "nextCheckSv": "Jämför ett nytt exempel med och utan nolla."
  }],
  "limitationsSv": ["Ett felsvar räcker inte för att fastställa elevens metod."]
}
```

`provenance.kind` är `rule`, `ai` eller `teacher`. Ange faktisk `model` när
känd, inte ett gissat modellnamn. Hypotesens `signalCode` är obligatorisk
bara för `existing_signal`. Rapportens period, källa, antal, täckning,
stödräkning och refererade källsvar fylls av servern.

`POST action: "check_in"` använder `reportId`, `requestId`,
`expectedRevision` och `checkIn`:

```json
{
  "goalSv": "Jämför elevens metod med och utan nolla.",
  "noteSv": "Stäm av muntligt innan träning väljs.",
  "decisions": [{"hypothesisId": "exchange", "decision": "revised", "interpretationSv": "Pröva först om problemet är avgränsat till nollor."}]
}
```

Varje hypotes stäms av exakt en gång: `undecided`, `accepted`, `revised`
eller `rejected`. `revised` kräver en ny formulering. Ett nästa mål krävs;
tom anteckning är tillåten. Avstämningar är historiska poster för den valda
rapportversionen, inte ändringar av AI-texten eller ett utdelningsgodkännande.

Skrivsvar returnerar den behörighetsfiltrerade historiken och
`affectedReportId`, så att en kvittens alltid pekar på rätt rapport.
`requestId` ska vara en unik sträng på 8–100 tecken. Samma exakt validerade
begäran kan återförsökas utan dubblering när källrevisionen fortfarande finns.
CAS på historikens `expectedRevision` stoppar samtidiga överskrivningar.
Vid nätfel/409: behåll texten och läs historiken innan återförsök; ett nytt
request-ID får inte användas för att kringgå en osäker kvittens eller konflikt.

## Bevarande och gränser

KV-nyckel: `pupil_analysis_reports:STUDENT:CLASS:TEACHER`. Ingen ny tjänst.
Högst 20 rapportversioner, 50 avstämningar per rapport och 2 MiB per historik.
Gräns ger 413; inga äldre poster raderas automatiskt. Det finns ingen separat
rapportspecifik raderingsknapp i denna version. Rapporter raderas av elevens
befintliga raderings-/anonymiseringsflöde. Tolkningar och läraranteckningar
förs inte till anonym statistik. Arkiverad/raderad klass eller flyttad elev
blockerar åtkomst; data i en arkiverad klass bevaras tills eleven pensioneras.

Osparad avstämning hålls bara i den autentiserade flikens minne över
SPA-navigering/rapportbyte. Omladdning/stängning varnar om osparad text;
inget autosparas till server, lokal fil eller beständig webbläsarlagring.
Sparad avstämning återläses från servern efter omladdning. Konflikt och nätfel
behåller formulärtexten. Läs senaste historiken för att jämföra före ny skrivning.

## Verifiering

Syntetiska tester täcker rätta/felaktiga svar, enstaka signaler, motstridiga
identiteter, saknade signaler, fabricerade referenser/antal, reviderad tolkning,
serverkonflikt, åtkomst, ägarskap och elevradering/anonymisering.
Roboten provar förhandsvisning utan skrivning, flera rapportversioner,
AI-märkt syntetisk rapport, avfärdande/ändring, konflikt, bevarad text,
omladdning och oförändrad elevprofil. Skärmbilder granskas i desktop- och
surfplatteformat. Det är inte verklig KV, fysisk iPad eller en kalibrering av
en ansluten språkmodells pedagogiska träffsäkerhet.

## Undervisning och kontrollobservationer i samma avstämningshistorik (E4)

Godkänt pilotpaket 2026-11-05: `decimal-component-multiplication-pilot`, version 1.
Ett `check_in` kan nu även ha `teaching`: `kind` (`teaching` eller
`control_observation`), `hypothesisId`, `packageId`, `packageVersion`, `draftId`,
`materialVersion`, `taughtOn` (lärarens datum), `help` (`unknown`, `given`,
`none_reported`) och `noteSv`. Serverns `createdAt` är när noteringen sparades,
inte ett intyg om när undervisningen eller kontrollen skedde.

Servern kontrollerar lärarägt material, rätt fryst version, elev/rapport/hypotes,
paket/steg och bekräftat utdelningskvitto. Samma CAS och begärandeidentitet som
övriga avstämningar används. Alla hypotesbeslut och nästa mål bevaras i den nya
avstämningen. Konflikt sparar inte över en annan flik; texten finns kvar och
läraren läser senaste version före nytt försök. Osparad text ligger bara i den
autentiserade flikens minne; omladdning varnar och inget autosparas till server.

Noteringar visas både vid materialets resultat och i rapportens gemensamma
avstämningshistorik. Att en lärare antecknar ingen hjälp är en läraruppgift,
ingen automatisk mätning av självständighet. Följande material fryser exakt
undervisningsnotering/avstämningsrevision och tidigare kontrollobservationer.
