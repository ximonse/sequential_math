# Generella och analysspecifika uppdrag och screeningar

Beslutad riktning 2026-10-28. Urvalsläsning och servervaliderad förhandsvisning
är byggda lokalt, liksom versionerad utkastlagring och återläsning.
Lärargranskning, versionsbundet godkännande och uttrycklig utdelning är också
lokalt byggda och syntetiskt provade. Ingen produktionspublicering har gjorts.

## Två ingångar och separat mottagarval

Generellt innehåll utgår från lärarens instruktioner, innehållsmål eller givet
material. En analys är inget förkrav. Specifikt innehåll utformas utifrån
analys av just klassen, gruppen eller eleven. Utkastet visar vilka konkreta
belägg, fungerande kunskaper, osäkerheter och valda mål som motiverar
uppgifterna. Att välja en mottagare gör inte ett generellt uppdrag specifikt.

Klass/grupp ska kunna få ett gemensamt innehåll; individuella varianter väljs
uttryckligt. Tillgänglig data per elev redovisas separat. Inga data är inte
noll kunskap. Gruppens felandel eller hypotes får inte tillskrivas alla elever.

## Befintlig läsning av mottagare

`GET /api/students?resource=groups&query=...&limit=...&offset=...` ger endast
behöriga grupp-ID:n och namn. Dubblettnamn behålls och kräver exakt ID-val.
MCP: `math_find_groups`. Klasser söks med befintliga `math_find_classes`.

`GET /api/students?resource=audience&targetType=student|group|class&targetId=ID`
ger ett skrivskyddat, aktuellt urval. MCP: `math_get_audience`. Svaret har
`pupils` med elev-ID, kodnamn och åtkomliga aktiva klass-ID:n, `total`,
`rosterRevision`, `nextOffset`, `membershipBasis=current` och
`historicalMembership=unknown`. Även elever utan träningssvar ingår.
Nästa sida ska bära samma rosterRevision; ändrat urval ger 409.
En grupp med saknad eller otillgänglig medlem ger ett uttryckligt fel.
Inga elevprofiler, privata namn, klassinloggningstoken eller läraretiketter ingår.

Läs därefter underlag per elev via befintligt elevunderlags-API/MCP, med
vald period och exakt klasskontext. För gruppmedlemmar med flera klasser får
screening inte tyst begränsas till en godtycklig klass. Ange klasskontexten
eller läs relevanta behöriga klasser och deduplicera bara säkra identiteter.
Gruppval visar nuvarande medlemmars tillgängliga underlag; historiskt
gruppmedlemskap rekonstrueras inte. Återläs urvalet efter längre analys och
före utkast/godkännande om medlemskapet kan ha ändrats.

## Kontrakt för materialutkast

### Lokal förhandsvisning utan lagring

`POST /api/teacher-material` med `{action: "preview", material: ...}` eller
MCP `math_preview_material` validerar ett förslag utan skrivning. Capabilities
anger `materialPreview=true` och `followupDrafts=true`; `assignmentPublication=false`
ligger kvar. Sparande kräver `materialDraftWritesEnabled=true`. Den nya MCP-ytan kräver att
klienten laddar om servern; en redan ansluten process kan ha äldre verktygslista.

Material v1 har `schemaVersion:1`, `kind:practice|screening`,
`mode:general|specific`, `titleSv`, `goalSv`, `instructionSv`,
`sourceMaterials:[{label,excerpt}]`, `audience:{targetType,targetId,rosterRevision}`,
`basis`, `content` och valfri `classContexts:{elevId:klassId}`. Okända fält avvisas.
Klasskontext hämtas från valt klassmål eller elevens enda åtkomliga klass;
screening för en elev med flera klasser kräver ett uttryckligt val.
Vid specifikt innehåll krävs minst
ett basis-objekt med elev-ID, klass-ID, from/to, source, snapshotRevision,
supportRefs, counterRefs och reasonSv. Referenser/revision, aktuell åtkomst
och urval kontrolleras; servern bevisar inte rationale-textens pedagogiska
riktighet. Elever utan analysbelägg listas i pupilsWithoutAnalysis.

Träningscontent är en ram i appens befintliga payload-format utan id/title/
createdAt, exempelvis `{kind:"table",tables:[7],targetCount:10}`. Specificerade
val som inte överlever befintlig validering avvisas; inga nya generatorfilter
uppfinns. Screeningcontent har taskIds och/eller customTasks samt itemOptions
enligt befintligt screeningkontrakt. Samma förberedelsefunktion används av
verkligt skapande och förhandsvisning, men bara skapandefunktionen skriver.
Matematikövningens talintervall måste vara säkra heltal, omfatta högst
10 001 tal vardera och innehålla tal som matchar valt filter. Tomma filter
avvisas för att förhindra generatorns befintliga återgång till ofiltrerade tal.
Om `settings` anges måste hela objektet innehålla `maxTimePerProblem`,
`randomizeOrder` och `hideCountdown`; ett partiellt objekt skulle ändras av
normaliseringen och avvisas därför. `hideCountdown:true` döljer visningen,
men tar inte bort tidsramen. Ange och granska tidsinställningen uttryckligt.
MCP återger `invalid_material` med säker formatvägledning; rå feltext eller
innehåll från API-svaret vidarebefordras inte till modellen.
Svaret innehåller fulla frågesnapshots/bedömningsunderlag eller träningsram,
exakta mottagare, contentRevision, saved=false, assigned=false och
approval=not_requested. Ingen elev får uppdrag av denna operation.

### Lokal versionerad lagring

Spara med `POST /api/teacher-material` och `action:save`, samma materialindata,
`requestId` (8–100 tecken), `expectedRevision` och `expectedContentRevision`
från förhandsvisningen. Ange `draftId` när ett befintligt utkast får en ny
version. Servern kör valideringen på nytt; ändrad källa eller mottagarlista
kräver en ny förhandsvisning. Versioner skrivs inte över. Återanvänd samma
requestId efter osäker kvittens; läs lagrat utkast innan nytt skrivförsök.

`GET /api/teacher-material?draftId=...` återläser lärarens privata historik.
Aktuell åtkomst till samtliga historiska mottagare, grupper och analyskällor
kontrolleras även på läsning. Indragen åtkomst kan därför blockera ett helt
utkast med äldre känslig text. Läsningen påstår inte att gammalt underlag
eller medlemskap fortfarande är aktuellt för utdelning.

KV-nyckel: `teacher_material:TEACHER:DRAFT`, index
`teacher_material_index:TEACHER`. Högst 100 utkast, 20 versioner och 2 MiB per
historik. CAS för lagringsrevision och tombstone-kontroller stoppar samtidiga
överskrivningar och återupplivning efter elevradering. Vid radering/anonymisering
av en berörd elev tas hela utkasthistoriken bort, inklusive fria formuleringar;
den förs inte till anonym statistik. Ingen automatisk rensning av äldre versioner.

MCP `math_get_material_draft` läser summary/history/content/audience/basis/input/publication
för en vald version; listsektioner har offset/limit. `math_save_material_draft`
finns bara med separat startflagga `--allow-material-writes` eller
`MATH_MCP_ALLOW_MATERIAL_WRITES=true`. Rapportskrivflaggan ger inte denna rätt.
Inget utkast godkänns eller delas ut av sparandet.

### Lokal lärargranskning och godkännande

Kvittot från sparande innehåller `reviewPath`, en relativ väg till
`/teacher/material/DRAFT?version=N`. Den kräver lärarinloggning. Vyn visar
frågor, figurer, facit/lärarbedömning, hela träningsramen, analysmotiv och
exakta mottagare. Stöd-/motexempel kan öppnas från samma källrevision, med
ursprungligt räknehäfte när det finns. Ändrad källa ger konflikt.
Rubrik, undervisningsmål och innehållsbeställning kan ändras och förhandsvisas
innan en ny version sparas. Osparad text bevaras över versionsbyte.

Läraren kryssar att innehåll, bedömning och mottagare är granskade och
godkänner den senaste sparade versionen. `action:approve` kräver en aktuell
HttpOnly-lärarcookiesession och betrodd origin, inte x-teacher-token.
MCP exponerar ingen godkännandeoperation. Servern omkontrollerar hela
förhandsvisningen, inklusive källrevisioner och medlemslista. Godkännandet
binds till innehållsversion, contentRevision och rosterRevision; upprepning
med samma requestId ger samma kvitto. Lagringsrevisionen ökar utan att skapa
en ny innehållsversion. Högst 100 godkännandeposter; tidigare poster raderas
inte automatiskt. Godkännandet delar inte ut något; utdelning har en separat knapp.

Lokal webbläsarprovning av cookie-mutationer körs med `ROBOT_DEV=1` eftersom
HTTP-localhost bara är en betrodd origin i utvecklingsläget. Standardrobotens
produktionslika API-läge nekar sådan cookie-mutation. Provet ändrar inte
produktionsreglerna eller verifierar HTTPS-produktionsflödet.

Ett versionsbestämt utkast ska innehålla:

- Typ: träning eller screening; generellt eller specifikt innehåll.
- Mål, instruktion, innehåll och källa till eventuellt givet material.
- För specifikt innehåll: vald analysperiod, underlagsrevisioner per
  elev/klass och explicita kopplingar från belägg till uppgiftsval. En
  grupphypotes redovisar stöd/kontraster och vilka elever underlaget gäller.
- Exakt mål-ID (elev/grupp/klass), rosterRevision och den upplösta
  mottagarlistan med klasskontext. Listan är granskningsbar.
- Screening: frysta frågor, facit/bedömningssätt och avsikt per fråga.
  Återanvänd katalogfrågor och stödda egna text-/bildfrågor. Egna textfrågor
  kräver lärarbedömning om `answerKey` saknas. Egna frågor med validerat och
  fryst `answerKey` rättas automatiskt enligt det lokala kontraktet i
  [SCREENING_CUSTOM_ANSWER_KEYS.md](SCREENING_CUSTOM_ANSWER_KEYS.md).
- Träning: validerad generatorram, exempel, stödda innehållsval/nivåer och
  antal. Ange att exempel inte är en fryst uppgiftsföljd. Ingen tyst
  breddning när generatorn saknar den önskade innehållsprecisionen.

Utkast ska kunna återläsas och ändras utan elevutdelning. Lagring behöver
versionskontroll, samma återförsöks-ID vid osäker kvittens och tydliga gränser.
Förhandsvisning, sparat utkast, lärargodkännande och utdelning är skilda steg.

## Godkännande och utdelning

Läraren granskar innehåll, facit/bedömningssätt och den exakta mottagarlistan.
Godkännandet binds på servern till aktuell utkastversion och mottagarrevision;
AI:n får inte själv utfärda godkännandebevis. Ändrat innehåll eller urval kräver
ny granskning. En MCP-flagga med approved=true räcker inte som bevis.

Vid utdelning omkontrolleras levande läraråtkomst, pilotgränser och medlemskap.
Träning för elev/grupp/klass lagras som befintliga individuella uppdrag till
den frysta mottagarlistan. Senare tillkommande klass-/gruppmedlemmar är inte
granskade mottagare och ärver därför inte utdelningen. Screening skapar
separata samlingar per vald klass med explicita elevlistor, högst 100 elever
per samling. Ingen elev i
en annan klass får tappas eller läggas till tyst. Återförsök får inte skapa
dubletter; kvitto ska ange mottagare, uppdrags-ID:n och eventuella delfel.
Pågående uppdrag får inte ersättas genom ett oavsiktligt clear/deactivate.

`POST /api/teacher-material` med `action:publish`, `draftId`, `version`,
`contentRevision`, `expectedRevision` och `requestId` kräver samma betrodda
cookieinloggning som godkännandet. MCP erbjuder varken godkännande eller
utdelning; dess `assignmentPublication=false` beskriver den gränsen.
Senaste godkända versionen och käll-/mottagarrevisionerna omkontrolleras.
Högst fem utdelningsenheter behandlas per anrop; lärarens uttryckliga
knapptryck fortsätter med samma requestId medan `hasMore=true`.

Deterministiska uppdrags-ID:n för utkast/version/klassdel gör återförsök
idempotenta. Befintlig full lista med 20 aktiva uppdrag ger 409 och bevaras.
Delvis lyckad utdelning rullas inte tillbaka. Nytt uttryckligt återförsök
behandlar återstående mottagare och bevarar tidigare bekräftelser.

`teacher_material_dispatch:TEACHER:DRAFT:VERSION` lagrar CAS-skyddade kvitton
med mottagare, uppdrags-ID, status och senaste försöks-ID. Läsning via samma
GET som utkastet returnerar `dispatches`. Bekräftat, misslyckat, osäkert och
ännu obehandlat redovisas separat. En förlorad lyckad respons följs upp genom
återläsning; den betyder inte att inget delats ut. Kvittona är historiska
utdelningsbelägg, inte ett löfte att ett senare avslutat uppdrag är aktivt.
Elevradering/anonymisering raderar berörda utkast och deras kvitton.

Verifiering omfattar båda ingångarna × båda innehållstyperna × elev/grupp/klass,
inklusive klassöverskridande grupper, tomt underlag, ändrat medlemskap,
ändrad version, dubbelklick, timeout efter lyckad skrivning och elevens
faktiska åtkomst/svar/omladdning. Screening förblir diagnostic_only.

### Lokal verifiering 2026-10-28

187 testfiler/896 apptester, 19 MCP/CLI-prov och produktionsbuild passerade.
Robotfallen `material-publication` provar alla tolv kombinationer och faktisk
elevåtkomst, svar, omladdning och läraruppföljning. `material-publication-boundaries`
provar kapacitet, delfel/återförsök, ändrat medlemskap/analysunderlag, förlorad
lyckad respons och sidvis utdelning till sju elever. `assignment-capacity`
var röd före rättningen som bevarar alla gamla uppdrag. Fyllda kvittovyer
har granskats visuellt. Cookieproven kräver `ROBOT_DEV=1` och en testport,
exempelvis `ROBOT_PORT=5398`, samt `ROBOT_WORKERS=1`.
Alla elevdata i proven är syntetiska. Materialets Lua/CAS har därefter
verifierats mot en isolerad riktig Redis: tolv kontroller och verifierad
städning av 22 nycklar. Se [Redis-provet](MATERIAL_REDIS_VERIFICATION.md).
Upstashs REST-transport, fysisk iPad, HTTPS-produktion och oberoende didaktisk
modellkalibrering är inte verifierade.

Versionsregressionen med samma normaliserade innehåll i två versioner är
också rättad: åtgärds-ID:n i lärarvyn innehåller versionsnumret och servern
avvisar återanvändning av ett annat versionsgodkännande. Robotprovet var rött
före rättningen och passerar efteråt. Därefter passerade 188 testfiler/900 tester.

### Integration med publicerad frågeredigering 2026-10-29

Integrationsgrenen utgår nu även från master `177c92d` (PR #26). Den
publicerade screeningöversikten, dess utkastbibliotek och mottagarflöde
bevaras. Materialgranskningen återanvänder samma katalogval, facitredigerare
och bildfrågeredigerare under **Bearbeta screeningfrågor**. Frågornas ordning
bevaras, även när egna frågor av olika typer ligger blandade.

Sparandet skapar en ny `teacher_material`-version med befintliga analysbelägg,
källmaterial och mottagarkontext. Ett gammalt godkännande följer inte med.
Halvfärdig frågeredigering finns kvar vid versionsbyte under den öppna
sessionen och blockerar förhandsvisning, sparande, godkännande och utdelning
tills frågan sparas eller redigeringen avbryts. Omladdning varnar om osparat
arbete; halvfärdiga materialfrågor lagras inte automatiskt på servern.

Fristående `screening_draft` är fortsatt ett separat innehållsutkast utan
analys eller materialgodkännande. Att öppna eller spara ett sådant utkast
importerar inte ett materialgodkännande. Det finns ingen automatisk kopiering
mellan de två lagringarna. MCP kan fortsatt revidera både träningsram och
screeninginnehåll genom den befintliga versionslagringen.

Lokalt verifierat efter integrationen: 193 testfiler/951 tester, 19 MCP-prov,
produktionsbuild och tolv berörda webbläsartester. Redigeringsprovet täcker
blandad frågeordning, ändrat facit med bevarad rityta, bildfrågor, katalogval,
halvfärdig text över versionsbyte, avbryt och nytt godkännande. Rityteprovet
var rött före rättningen. Fyllda liggande och stående surfplattevyer har
granskats visuellt i lokal Chromium-emulering. Ingen fysisk iPad, riktig
elevdata, Upstash-transport eller produktionspublicering ingår i dessa prov.
