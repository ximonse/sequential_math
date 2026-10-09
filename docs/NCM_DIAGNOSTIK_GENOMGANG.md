# Klassöversikt och lärarens genomgång

Lokalt implementationssnitt 2026-10-06. NCM-flödet är fortsatt tillgängligt
för admin/huvudadmin med aktuell klassåtkomst och serverns pilotbegränsning.
Det påverkar inte vanlig träning, mastery eller adaptiv progression.

## Arbetsflöde

Under **Screening → Grupp** väljer admin klass och ett befintligt uppdrag i
**Klassöversikt och genomgång**. Inget uppdrag väljs automatiskt.
Översikten visar nuvarande behöriga mottagare av just det uppdraget:

- Inte påbörjat: inget sparat försök för någon uppgift.
- Påbörjat: minst ett försök öppnat, men inte alla uppgifter inlämnade.
- Alla inlämnade: alla uppgifter har ett serverlagrat inlämnat försök.
- Inlämnade och kvar: antal uppgifter, oberoende av svarens korrekthet.
- Genomgångna: antal försöksrevisioner som läraren uttryckligen markerat.

**Dela ut** och **Grupp** är separata vyer. Valt uppdrag ligger kvar när man
växlar mellan dem. Gruppmatrisen visar en elev per
rad och en uppgift per kolumn, med det faktiska inskrivna slutsvaret.
Rätt svar är gröna; obesvarat eller ofullständigt är grått; fel utan
identifierat mönster är rött. Ofullständig inmatning visas som den är.

Befintliga evidensregler ger separata markeringar:

- P (lila): entalen i en entydig två-radsuppställning står i olika kolumner.
- Ö (blå): entydigt resultat i räknehäftet skiljer sig från svarsfältet.
- M (orange): den smala regeln för 402−178 med synligt resultat och slutsvar
  376 matchar större minus mindre per kolumn.

Rätt slutsvar förblir grönt även om uträkningen har en markering. Det är inte
ett besked att metoden är korrekt. Ingen automatisk slarvdiagnos, decimalanalys
eller generell växlingsanalys har lagts till. Dessa var designexempel, inte
befintliga mätningar. Färger kompletteras med bokstäver och förklaringar.

Hover och tangentbordsfokus visar elevsvar, facit, inlämningsstatus och samtliga
befintliga signaler. Escape stänger informationsrutan. Klick/touch öppnar
originalunderlaget och befintlig läraranteckning i en modal overlay. Native
dialog ger fokusfångst; stängning återför fokus till öppningsknappen.
Föregående/nästa elev bläddrar inom den valda uppgiften, och uppgiftsknappar
byter uppgift för samma elev. Elever utan försök kan inte öppnas.

**Uppdatera klassöversikt** hämtar en ny serverbild. Vyn gör ingen dold
polling. Varje besvarad cell beräknas från en validerad lagrad försöksrevision
med samma versionerade analysregler som detaljvyn. Klasssvaret innehåller
bara kompakta svar/signaler, inte händelser eller lärarens fria text. Original
händelsehistorik läses för att validera och analysera senaste försök för varje
cell; större klasser innebär därmed fler databasläsningar. Ett saknat eller
inkonsistent sparat försök ger läsfel, inte ett påhittat obesvarat resultat.

Genomgången visar möjliga frågor till eleven när befintlig analys observerar
förskjutna entalskolumner, olika svar i häfte och svarsfält eller det smala
subtraktionsmönstret. Varje fråga visar sitt underlag och en tydlig gräns:
observationen bevisar ingen felorsak. Okänt underlag eller ett felsvar ensamt
ger inga signalbaserade frågor. Uppgiftens allmänna lärarstöd visas fortfarande.
Frågorna visas bara i lärarens befintliga behörighetsskyddade detaljvy och
skickas inte till eleven. Ingen ny analys, lagring eller mastery-påverkan införs.

Utskrift, återlämning, elevsynliga kommentarer och nya uppföljningsuppgifter
ingår inte i denna etapp.

## Gemensam anteckning och revisionsskydd

Varje försök har en gemensam läraranteckning på högst 1000 tecken och en
uttrycklig genomgångsmarkering. Det är lärarens egen anteckning, inte en
automatiskt härledd felorsak eller elevfeedback. Eleven får den inte via sitt
API. Sparandet sker enbart genom **Spara genomgång**, med synlig serverkvittens.

Separat nyckel `diagnostic_review:<attemptId>` innehåller elev-ID för
livscykelstädning, text, markering, lärar-ID/tid och både genomgångens egen
revision och den elevrevision/händelsesekvens som visades. Elevens försöksdata
och händelser ändras inte. Redis-CAS kontrollerar att båda revisionerna är
aktuella samt elevtombstone, klass, aktuellt medlemskap och fryst tilldelning
före skrivning. API:t kräver levande adminsession och aktuell klassåtkomst.

Om eleven ändrat sitt underlag räknas tidigare markering inte som genomgång
av den nya revisionen. Den äldre texten visas med en tydlig varning när den
nya bilden öppnas. **Öppna senaste underlag** hämtar den aktuella bilden.
En samtidig lärarändring eller elevändring ger konflikt utan att skriva över
den andra ändringen; den egna texten ligger kvar i formuläret. Vid nätfel
ligger den också kvar och kan skickas igen. Den sparas inte i en lokal kö.

Byte av elev, uppgift, uppdrag eller klass i genomgångsvyn varnar när text
är osparad; omladdning/stängning använder webbläsarens beforeunload-varning.
Att lämna hela lärarsektionen via appens andra flikar skyddas inte av denna
avgränsade navigationskontroll. Spara anteckningen innan du lämnar sektionen.
Ingen automatisk sammanslagning av fria texter eller full anteckningshistorik
ingår; nästa sparade revision ersätter den gemensamma texten efter CAS.

## Radering och anonymisering

Radering och anonymisering tar båda bort läraranteckningen och
genomgångsmarkeringen tillsammans med elevens originalförsök. Städningen
hittar nyckeln genom försöksindex och befintliga försök samt separat
elev-ID-kontroll av anteckningsnycklar. Text, lärar-ID och genomgångsmetadata
kopieras aldrig till det anonyma statistikarkivet. Tombstonekontrollen i
skrivtransaktionen hindrar att en pågående anteckningsskrivning återupplivar
data efter städning.

## Verifiering och kvarvarande begränsningar

Enhetstester täcker behörighet för klassläsning och skrivning, exakta
statusantal, revisionskonflikter, storleksgräns och livscykelstädning.
Klickroboten använder riktiga API-handlers mot isolerad minnesdatabas och
prövar klass med inlämnat, pågående och oöppnat arbete, elevbläddring,
återöppnad sparad text, nätfel, två lärarflikars konkurrerande ändringar,
avbruten navigation samt ny elevrevision efter genomgång.
Lua-transaktionen är emulerad i dessa kontroller, inte verifierad mot verklig
Redis. Klassrumsprovning och produktion av detta snitt återstår.

Verifierat lokalt: 135 testfiler/650 tester, produktionsbuild, riktad lint och
hela robotsviten med 80 godkända fall och 0 regelbrott. Skärmbilden av
klassöversikt och genomgångsformulär har granskats.

## Screeningmatris: verifiering 2026-10-06

Enhetstester kontrollerar att ett felsvar ensamt inte blir en metoddiagnos,
att de befintliga uppställningsreglerna styr markeringarna och att korrekt,
obesvarat och ofullständigt förblir olika observationer. Klickroboten prövar
riktiga API-handlers i isolerad minnesdatabas, serverlagrade svar, väntande
elev, hover med facit, statusfärger, Escape, touch-öppning, elevnavigation och
återställt fokus. Befintlig robot täcker även anteckningskonflikter och
omläsning av en ny läraranteckning trots oförändrad elevrevision.

Verifierat lokalt: 136 testfiler/652 tester, produktionsbuild, riktad lint och
hela robotsviten med 81 godkända fall och 0 regelbrott. Uppdragsvalet ligger
kvar vid byte mellan Dela ut och Grupp. Skärmbilder av den faktiska matrisen,
hoverinformationen och genomgångsöverlägget har granskats. Ej pushat eller
publicerat.

## Samlingar och arbetsytor – lokalt ändringssjok 2026-10-09

Detta avsnitt ersätter äldre beskrivningar av enskild frågeinlämning för den
nya lokala versionen. Det innebär inte att ändringarna är publicerade.

- Läraren namnger en samling, väljer frågor och anger siffer-/skrivsvar,
  räknehäfte och/eller rityta per fråga. En egen skrivfråga kan också läggas
  till. Valen fryses i samlingens uppgiftssnapshots.
- Aktiva, ej inlämnade samlingar syns direkt på elevens översikt. Inlämnade
  samlingar finns i dropdown med status Inlämnad eller Återkoppling finns.
- Svara och Spara arbetet sparar utan att låsa. Förra/Nästa fråga sparar
  aktuell fråga innan navigation. Eleven kan ändra tills samlingen lämnas in.
- Lämna in svaren sparar först kvarvarande arbetskopior, varnar för frågor
  utan slutsvar och fryser hela samlingen i en gemensam revisionskontrollerad
  transaktion. Bekräftad inlämning är skrivskyddad; återlämning/redigerings-
  revisioner är inte införda. Nätfel eller konflikt får inte frysa halva
  samlingen. Tidigare frysta original lämnas oförändrade.
- Räknehäftet har fasta sifferknappar utan systemets numeriska tangentbord,
  svarsfält direkt under nätet, kompakt knapppadding och formaterad hjälp.
  Suddverktyget raderar genom dutt eller drag; nya dragna streck ligger på
  rutgränserna. Äldre originals streck flyttas inte. Resultatanalys v2 känner
  även igen ett entydigt nytt rutgränsstreck.
- Rit- och suddstreck sparas som normaliserade punkter i händelsehistoriken
  och visas i lärarens återspelning. Textsvar rättas inte automatiskt och
  räknas inte som felaktiga numeriska svar eller vanlig mastery.
- Elevsynlig återkoppling har ett separat textfält. Skicka återkoppling
  publicerar uttryckligen texten för det aktuella inlämnade originalet.
  Intern läraranteckning och genomgångsmarkering blir aldrig elevfeedback.
  Äldre/stale återkoppling visas inte på en annan elevrevision.
- Samlingsinlämning använder `_diagnosticCollectionStore.js`. Alla revisioner,
  medlemskap, frysta uppgiftsidentiteter och tombstones kontrolleras innan
  första skrivningen. Lua skriver ursprungliga JSON-strängar för att bevara
  tomma arrayer och händelsernas exakta innehåll. Lokala tester emulerar Redis;
  den nya Lua-transaktionen har ännu inte provats mot verklig Redis.

Issue #13 gäller framtida val av ritytemönster: högställda rektanglar,
kvadratiska rutor eller olinjerat. Mönsterväljaren byggs inte i detta sjok.

Slutkontroll lokalt: 140 testfiler/671 tester, build, riktad lint och hela
robotsviten 83/83 med 0 regelbrott. Renderad iPad-layout granskad. Kontroller
täcker dutt/drag-sudd, faktisk linjegeometri, lärarvalda arbetsytor,
återläst skriv-/ritoriginal, explicit återkoppling utan privat textläckage,
obesvarat-varning, nätavbrott och atomisk inlämning. Ett fullt original med
1024 händelser tillåter exakt en avslutande submit-händelse, inte fortsatt
skrivande. Verklig Redis för nya samlingstransaktionen och fysisk iPad med
den nya versionen återstår. Inget i detta sjok är pushat eller publicerat.

## Verklig lagringskontroll – 2026-10-09

Den nya samlingstransaktionen har nu körts mot den Redis-anslutning som
Vercel-projektet `sekvens` använder. `scripts/verify-diagnostic-collection-redis.mjs`
anropar den faktiska JS-lagringsgränsen och dess Lua-skript, inte robotarnas
emulator. Varje läs- och skrivnyckel får en slumpmässig separat namnrymd;
inga elevkonton, klassindex eller vanliga träningsresultat används. Befintliga
autentiseringsuppgifter användes utan att skrivas ut eller sparas på disk.

12 kontroller godkända: gemensam inlämning/återläsning; tomma JSON-arrayer;
retry efter borttappad kvittens; siffer-/skrivsvar och rithistorik; saknade,
dubbla och gamla revisioner; revisions- och händelseloppskonflikter precis
före Lua; borttaget medlemskap; arkiverad klass; stängd samling; enbart
testnycklars tombstone; samtidiga inlämningar; full 1024-händelsehistorik
med en slutlig submit; samt skrivskyddat inlämnat original. Inget scenario
gav en halvt inlämnad samling. Efter sista kontrollen rensades testets tio
spårade nycklar och deras frånvaro verifierades. Ingen FLUSHDB eller bred
nyckelsökning används. Skriptets namnrymd, TTL och begränsade rensning har
egna säkerhetstester.

Detta verifierar serverlagringsgränsen för lokal kod i b81f007; det är inte
en publicering, ett test av en ny driftsatt HTTP-handler eller ett fysiskt
iPad-prov. Borttappad kvittens prövades genom återförsök utan att använda
första svaret, inte genom ett verkligt nätverksavbrott. Avbrottsprovning
genom hela klient/API-flödet och fysisk iPad med nya versionen återstår
efter separat godkänd publicering. Inga produktionsinställningar ändrades.

Slutkontroll för verifieringssjoket: 141 testfiler/674 tester, build och
riktad lint godkända. App/API-kod har inte ändrats i detta sjok; den senaste
fulla robotsviten för samma appkod är fortfarande 83/83. Kartan uppdaterad.

## Samlad publicering – 2026-10-09

Efter Simons uttryckliga begäran pushades samlings-/arbetsytepaketet,
återkopplingen, räknehäftets förbättringar och verifieringen via GitHub
master till `1395e65`. Vercel-projektet `sekvens` är READY för samma fulla
SHA `1395e659febb0d47730cee311cafb659c9a24b8e` och domänen
`matematik.ximon.se` är tilldelad denna deployment.

Den publika domänens huvudpaket, `StudentDiagnosticAttempt` och
`DiagnosticGridPrototype` jämfördes byte för byte med lokalt verifierat
build: alla tre matchar. Avgränsad fel/fatal-loggkontroll för just den nya
deploymenten gav inga poster vid kontrollen; detta är ingen garanti om
framtida drift eller en provning med riktiga elever. Fysisk iPad-provning
och faktisk nätavbrottsprovning genom hela driftsatta klient/API-flödet
återstår. Inga riktiga elevdata ändrades vid publiceringskontrollen.

Kartan har även fått Nytt kort / idé, verifierat med skyddat API och ett
isolerat webbläsartest. Kartan körs fortfarande bara lokalt; att verktygets
källkod ligger på GitHub betyder inte att kartservern är publicerad.
