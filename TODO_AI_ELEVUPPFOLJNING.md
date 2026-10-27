# Plan: AI-stödd elevanalys och riktad uppföljning

Datum: 2026-10-27. Status: planen avstämd med Simon, kompletterad med krav på
rättade och kommenterade egna uträkningar. Etapp 1 är lokalt byggd och testad;
senare analys-, MCP- och dokumentsteg är inte byggda.
Projektkort: `ai-pupil-followup` och dess delkort.

## Mål och arbetsflöde

Simon ska kunna be en ansluten AI granska en elev under en period, diskutera
resultatet och därefter skapa riktade screenings, träningsuppdrag eller ett
förklarande elevdokument. AI:n föreslår; läraren väljer vad som delas ut.

1. Välj elev och period: exempelvis ”granska subtraktion de senaste tre veckorna”.
2. Läs tillgängliga observationer från vanlig träning och, vid behörighet, Screening.
3. Redovisa konkreta svar, återkommande mönster, fungerande kunskaper,
   motexempel, alternativa förklaringar och begränsningar.
4. Stäm av: läraren bekräftar, ändrar eller avfärdar hypotesen och väljer nästa mål.
5. Skapa ett utkast med frågor/material, facit, avsikt och namngiven mottagare.
6. Läraren granskar och godkänner den aktuella versionen före utdelning.
7. Följ upp med nya observationer och jämför på ett innehållsmässigt rimligt sätt.

Läsning, analys och utkast får aldrig aktivera ett elevuppdrag. En ny rapport
skriver inte över elevens svar, lärarens bedömning eller tidigare rapportversion.

## Verifierat nuläge i koden

- `scripts/teacher-data.mjs` och `docs/teacher-data.md`: lärarinloggning,
  elev-/klassfilter, datumfilter och lokal CSV/JSON. Ingen MCP-server.
- Den nya träningsprojektionen används av vanlig export och av det nya
  versionsbundna läs-API:t. `problemLog` eller reservlistan `recentProblems`
  är inte garanti för full historik. Källrevision, täckningsmetadata och okända
  felkategorier bevaras nu. `--evidence` läser även Screening vid rätt behörighet
  och detaljanrop kan återge arbetsytor. Se `docs/PUPIL_EVIDENCE.md` för det
  lokala kontraktet; detta innebär inte att API:t redan är publicerat.
- `api/teacher-class-assignment.js`: vanliga uppdrag kan aktiveras för en elev.
  `src/lib/assignments.js` styr befintliga generatorer genom typer, nivåer och
  inställningar. Valfri AI-skriven uppgift är inte ett generellt träningsformat.
- `api/teacher-diagnostic-assignments.js`: screening kan tilldelas en elev,
  med frysta frågor, textfrågor och bildfrågor. Egna textfrågor bedöms av lärare;
  bildval har serverrättning. Godtycklig ny numerisk fråga kräver ett tydligt
  innehålls- och facitkontrakt innan automatisk rättning kan utlovas.
- `api/teacher-diagnostic-attempts.js`: uppställning, förlopp, bedömning och
  versionsidentifierat underlag kan läsas. Screening kräver admin/skoladmin,
  aktiverat API, aktuell klassåtkomst och eventuellt piloturval.
- Ingen sammanhängande AI-rapport, godkänd materialversion eller MCP-utdelning
  har byggts. Denna plan innebär ingen ny produktionsverifiering.

## Föreslagen arkitektur

Återanvänd appens domäner, generatorer, verifierare, API-behörigheter och KV.
MCP blir en tunn adapter. Skillen beskriver analys- och undervisningsarbetet;
appens server ansvarar för åtkomst, validering och utdelning.

Första pilot: lokal MCP med stdio och lokal hantering av lärarinloggning.
Det passar befintligt datorflöde utan att kräva en publik MCP-tjänst direkt.
Kontrollera vald klients faktiska stöd med syntetiska data innan beroenden väljs.
Fjärranslutning med Streamable HTTP och avgränsad, återkallningsbar
auktorisering blir en senare etapp för klienter som behöver det. MCP:s
[arkitektur](https://modelcontextprotocol.io/docs/learn/architecture) och
[auktorisering](https://modelcontextprotocol.io/specification/latest/basic/authorization)
är tekniskt underlag; klientkompatibilitet måste provas separat.

Lokal MCP betyder inte lokal AI: verktygsresultat kan skickas till modellens
leverantör. Befintliga regler förbjuder att elevdata skickas till externa tjänster.
Piloten byggs med syntetiska elever. Före verklig analys måste vald AI-miljö och
vilka data den får ta emot vara uttryckligen klarlagda; pseudonym räcker inte
automatiskt som anonymisering. Detta blockerar inte utveckling med testdata.

## Etapp 1 — tillförlitligt läsunderlag

Lokalt levererat 2026-10-27: [läskontrakt och begränsningar](docs/PUPIL_EVIDENCE.md).
177 testfiler/852 tester och build godkända. Bred robotkörning 151/154 direkt;
de tre fallen godkända vid sekventiell omkörning. Båda nya underlagsrobotarna
godkända, inklusive originaluträkning efter omladdning (155 unika robotfall
verifierade inklusive omkörningar och det tillagda originalfallet). Ingen helt
grön bred engångskörning påstås. Endast syntetisk minneslagring, inte riktig
KV, fysisk iPad eller produktion. Nästa etapp är analysrapport och avstämning.

Bygg en gemensam, testbar lästjänst bakom export och MCP. Hämta bara relevant
elev och period; undvik att ge AI:n hela profiler eller andra elevers uppgifter.

- Entydig elevidentifiering med stabilt ID; flera namnträffar kräver ett val.
- Kalenderdagar enligt Europe/Stockholm, även vid sommartidsbyte; validera
  datum, omvänt intervall och specificera periodens slut exklusivt internt.
- Stabil källreferens, källa, fråga, elevsvar, facit/bedömning, tid och känt
  uppgiftssammanhang. Screening inkluderar arbetsyta/förlopp när det finns.
- Håll träning, screening, obesvarat, ogiltigt och manuell bedömning åtskilda.
  Bevara okända kategorier som okända, utan att gissa fram kunskapsfel.
- Redovisa begärd/tillgänglig period, antal, begränsad historik, luckor och
  paginering. Saknade data kan inte återställas genom AI-analys.
- Deduplikera endast med säker identitet. Äldre poster utan stabilt ID får
  källposition och snapshotreferens, tydligt skilda från riktiga observation-ID:n.
- Kontrollera aktuell elev-/klassåtkomst vid varje anrop, inklusive detaljläsning.

Klart när samma period ger återspelbart underlag med spårbara referenser,
utan åtkomstläckor, och ofullständig historik syns uttryckligen.

## Etapp 2 — analysrapport och avstämning

Skapa en skill och ett versionsbestämt rapportformat. Använd både rätta och
felaktiga svar. Befintliga regelmönster är observationer/ledtrådar, inte facit
om elevens förståelse. AI:n får formulera nya hypoteser med tydliga belägg.

Rapporten innehåller:

- elevreferens, period, avgränsning, källsnapshot och omfattning;
- fungerande innehåll och återkommande fel med konkreta svarsexempel;
- varje hypotes med stödsvar, motexempel, alternativa förklaringar och vad
  som skulle skilja förklaringarna åt i nästa screening;
- bedömningen ”otillräckligt underlag” när metoden inte går att avgöra;
- ett kort förslag till nästa undervisnings-/undersökningsmål.

Siffror och referenser kontrolleras maskinellt. Rapporten skiljer observation,
regelbaserad signal, AI-tolkning och lärarens ställningstagande. Inga påhittade
sannolikheter. Svarstid ensam belägger inte slarv eller bristande förståelse.
Förändrad rättandel över olika svårigheter kallas inte automatiskt utveckling.

Spara rapport och lärarens avstämning separat från elevprofilen, med version
och källrevision. Läraren kan ändra/avfärda hypotesen och ange ett annat mål.
Rapportlagring omfattas av åtkomst, radering och bevarande; ingen separat
osynlig elevhistorik i MCP-loggar eller repot.

Klart när läraren kan följa varje påstående tillbaka till underlaget, korrigera
tolkningen och återuppta samma avstämning utan att originalet ändras.

## Etapp 3 — MCP för läsning och utkast

Föreslagna verktyg, namnen är arbetsnamn:

| Verktyg | Ansvar |
|---|---|
| `find_pupils` | Behörigt, begränsat elevurval; entydig identitet. |
| `get_pupil_evidence` | Filtrerat/paginerat underlag och täckningsmetadata. |
| `get_evidence_detail` | Fråga, svar och eventuell arbetsyta för en källreferens. |
| `save_analysis_draft` | Validera och spara en rapportversion som utkast. |
| `list_followup_capabilities` | Tillgängliga generatorval, screeningtyper, figurer och gränser. |
| `create_followup_draft` | Skapa en versionerad förhandsvisning, utan elevutdelning. |
| `publish_approved_followup` | Publicera exakt granskad version till exakt vald elev. |
| `get_followup_result` | Kvitto och senare svar för den uttryckliga uppföljningen. |

Verktygsresultat och fel är strukturerade. Inga lösenord/token i modellkontext
eller loggar. Skrivförmåga är separerad från läsning. Svarstexter och uppladdat
material behandlas som data, aldrig som instruktioner till AI:n.

Mänsklig publiceringsbekräftelse krävs i lärarvyn eller en verifierad klientfunktion;
AI:n får inte själv skapa ett godkännandebevis. Första pilot kan använda
lärarvyn som slutsteg. Ändrad mottagare, innehåll eller facit kräver ny granskning.
Servern omkontrollerar roll/klass/medlemskap även efter godkännande. Samma
publiceringsförsök ska kunna återförsökas utan dubbla uppdrag och ge ett kvitto
med uppdrags-ID och mottagare; timeout får inte felaktigt betyda ”utdelat”.

Klart när en verklig MCP-klient klarar syntetisk läsning → rapport → utkast
och en spärrad publicering före mänskligt godkännande.

## Etapp 4 — riktat innehåll och uttrycklig utdelning

Tre materialtyper, med samma mål-/källreferens men olika beteende:

1. **Screening:** ett kort urval med kontraster som prövar hypotesen. Använd
   befintliga granskade frågor/typer och egna frågor inom deras faktiska
   kontrakt. Frågor, alternativ och facit fryses. Alltid `diagnostic_only`.
2. **Träningsuppdrag:** befintlig generator med stödda typer, nivåer och
   inställningar. Visa exempel och exakt träningsram; lova inte en viss
   uppgiftsföljd om generatorn inte fryser den. Saknas tillräcklig precision
   ska AI:n säga det och föreslå screening, dokument eller en separat
   generatorutökning. Befintliga evidensregler gäller för riktiga träningssvar;
   rapport eller godkännande skapar aldrig mastery.
3. **Elevdokument:** kort mål, enkel förklaring, genomräknade exempel,
   några egna uppgifter och en kontrollstrategi. Separat lärarfacit.
   Första versionen är ett utskrivbart dokument/PDF, inte en ny dokumentinkorg
   för elever. Inga diagnosetiketter eller andra elevers uppgifter i elevtexten.

   **Elevens egen uträkning som rättat exempel** är ett uttryckligt krav från
   Simon (2026-10-27). När relevant underlag finns ska dokumentet använda
   elevens eget tal och arbete, exempelvis från det digitala räknehäftet:

   - Visa originalet och en separat, tydligt märkt rättad version i anslutning
     till varandra. Bevara kolumnplacering, minnessiffror, växlingar och streck
     så att eleven känner igen sitt arbete. Originalobservationen ändras aldrig.
   - Markera det konkreta felsteget och kommentera vad som behöver ändras,
     varför det matematiskt fungerar och hur eleven kan kontrollera svaret.
     Behåll korrekta steg och visa den fortsatta korrekta uträkningen, inte
     bara ett utbytt slutsvar. Skillnaden ska vara begriplig även utan färg.
   - Skilj synligt räknefel från osäker tolkning av elevens metod. Om arbetet
     inte visar hur eleven tänkte får AI:n inte hitta på mellanled och kalla
     dem elevens. En kompletterad lösning märks som ett lösningsförslag.
   - Knyt exemplet till källans uppgifts-/försöksreferens och revision i
     lärarunderlaget. Läraren granskar både rättning och kommentar före
     utdelning. Elevtexten är saklig och stödjande.
   - Följ gärna det rättade exemplet med en liknande uppgift att lösa själv.
     Saknas användbar egen uträkning används ett tydligt märkt konstruerat
     exempel eller bara det faktiska slutsvaret; inget fabriceras som elevens arbete.

Kontrollera matematiskt facit med domänens oberoende verifierare där stöd finns.
Läraren granskar uppgifter utan sådan verifierare; AI:ns egen omräkning räknas
inte som oberoende kontroll. Bedömningstyp och verifieringsstatus syns i utkastet.
Dokumentets exempel och facit ska överensstämma med det godkända innehållet.

Klart när granskad version kan delas ut till bara den valda eleven, återläsas
och besvaras, och läraren kan se den elevens faktiska svar med rätt kontext.

## Etapp 5 — uppföljning och eventuell fjärranslutning

Jämför ett nytt underlag med föregående hypotes, på jämförbart innehåll och
med hjälpkontext/urval bevarat. Redovisa kvarstående, försvagat eller otillräckligt
stöd utan att hävda att ett litet test bevisar varaktigt lärande.

När den lokala kedjan fungerar: pröva en vald fjärrklient med syntetiska data,
implementera dess autentiseringsflöde och dokumentera en faktisk kompatibilitetsmatris.
”MCP” innebär inte att alla AI-appar stöder anslutningen. Ingen permanent
server, ny lagringstjänst eller AI-leverantör införs utan avstämt behov.

## Verifiering och leveransordning

- Börja med syntetiska fall: systematiskt fel, blandade metoder, enstaka fel,
  få svar, motsägande rätta svar, legacydata och begränsad historik.
- Testa tidsgränser/DST, paginering, identitet, källrevisioner, påhittade
  referenser, felaktiga antal, ogiltigt facit och instruktioner inuti elevsvar.
- Testa obehörig klass/elev, vanlig lärarroll kontra screeningadmin, återkallad
  åtkomst, ändrad elevklass och utdaterat godkännande.
- Robotprova läsning → avstämning → ändrat utkast → godkännande → utdelning
  → elevsvar → omladdning → lärargranskning. Inget får delas ut under analysen.
- Testa dubbelklick, upprepade anrop, timeout efter lyckad skrivning och
  samtidig utkaständring. Existerande uppdrag får inte ersättas av misstag.
- Granska elevdokumentets rendering och faktiska uppgifter. Kontrollera särskilt
  original mot källrevision, rättade mellanled och facit, kommentaren vid
  felsteget samt läsbarhet i utskrift. Prova även otydligt/saknat elevarbete så
  att påhittade mellanled aldrig presenteras som elevens. Skilj lokal
  syntetisk provning, riktig KV, produktionsprov och fysisk iPad.
- Kör relevanta tester, build, robotar, arkitektur och projektkartans kontroller
  vid implementation. Leverera avgränsade lokala commits; publicering separat.

Första sammanhängande leverans: **en syntetisk elev, ett avgränsat
aritmetikmål, en spårbar analys, läraravstämning och en riktad screening**.
Använd befintliga kontrasterande frågor där det går. Följ med generatorträning
och elevdokument när samma granskningskedja fungerar. Bredda därefter ämnesområde
och klientstöd. Inget fast datum utlovas innan dataprov och klientanslutning är verifierade.

## Beslut inför respektive steg

- Rekommendation för start: lokal MCP-pilot, befintlig KV och syntetiska elever.
- Vilken faktisk AI-klient ska vara första stödda klient väljs före etapp 3;
  underlags- och rapportkontrakt kan byggas oberoende av det valet.
- Verkliga elevdata kräver klarlagd AI-miljö och tillåten dataöverföring.
  Gemini kan användas för riktad granskning med syntetiska exempel och
  icke-känsliga kontrakt, inte verkliga elevsvar enligt nuvarande regler.
- Befintlig screeningroll ligger fast. Allmän läraråtkomst kräver eget beslut.
- Båda uppföljningsvägarna ingår som förslag. Exakta träningsfilter och
  rättningsbara nya frågetyper får inte antas finnas innan de verifierats.

Planen ändrar inte det äldre beslutet att elevdataexporten kunde levereras
utan MCP, eller den levererade bildfunktionens avgränsning. MCP föreslås här
som ett nytt, efterföljande arbete för hela uppföljningskedjan.
