# Screeningutkast för genomgång och revidering

Publicerat 2026-10-28. Sparade utkast är privata; elevutdelning är separat.

Publicerat genom PR #22: **Materialbibliotek → Privata utkast**
visar även material som sparats via material-API/MCP. **Öppna granskning**
leder till materialets listade version med analys och godkännandeflöde.
Fristående screeningutkast öppnas som tidigare med **Öppna utkast**. De två
lagringarna behålls; öppning skapar ingen kopia och delar inte ut något.

## Autentiserad produktionskontroll 2026-10-29

På avsett primärt administratörskonto skapades ett separat neutralt
kontrollutkast i den publicerade lärarvyn. Version 1 kunde hittas och öppnas
från Materialbiblioteket. Ändrad fråga och ändrat facit sparades som version 2.
Full omladdning och öppning från biblioteket återställde version 2 korrekt;
version 1 behöll sin ursprungliga fråga och sitt facit. Avbruten navigering
med osparad testtext bevarade texten. Testtexten återställdes sedan utan en
ny sparning. Kontrollutkastet ligger kvar privat som version 2.

Ingen mottagare valdes, ingen utdelning utfördes och inga befintliga
elevutkast ändrades. Kontrollen gäller fristående screeningutkast.
Material-API/MCP:s separata versions- och granskningsflöde omfattas inte.
Bildbevis och kontrollkvitto finns utanför repot; inga elevdata sparades här.

Under **Screening: dela ut → Utkast för genomgång** kan läraren skapa ett
nytt utkast, spara samlingen och öppna sparade utkast. Samlingens namn,
valda bankfrågor och arbetsytor, egna facitfrågor, bildfrågor och den
lärarbedömda skrivfrågan följer med. Även en ofullständig fråga som ännu
redigeras sparas, inklusive facitfält och vilken fråga som redigeras.

**Förhandsvisa frågor och facit** visar tillagda frågor i utdelningsordning.
En pågående fråga är tydligt skild från samlingens tillagda frågor.
Frågorna redigeras med de befintliga frågeredigerarna, inte som JSON.

Varje uttrycklig sparning skapar en ny version. Versionsväljaren kan öppna
tidigare versioner; dessa ändras inte. En äldre version kan revideras och
sparas som en ny senaste version. **Spara som nytt utkast** gör en oberoende
kopia. **Läs senaste version** läser om det öppna utkastet. Osparade ändringar
kräver ett uttryckligt val innan ett annat utkast eller en annan version
öppnas. Vid omladdning varnas om osparade ändringar finns.
Även byte från screening till ett annat arbetsläge varnar innan osparad
text lämnas. Byte mellan screeningens utdelning och resultat bevarar
redigeraren som tidigare.

Utkast innehåller enbart frågesamlingen. Mottagarvalet ändras inte när ett
utkast öppnas och sparas inte i utkastet. Mottagare väljs separat i den
befintliga utdelningsvyn. Sparande och förhandsvisning skapar inga
elevuppdrag, ändrar inga elevsvar eller mastery och gör inget elevsynligt.
Återanvändning av redan utdelade samlingar fungerar som tidigare; dessa
delas ut oförändrade och sparas inte som redigerbara utkast här.

## Privat lagring och skydd mot dataförlust

Den befintliga adminbegränsade screeningrouten hanterar
`GET /api/teacher-diagnostic-assignments?resource=drafts` för en privat lista,
med `draftId` för innehåll och historik, och `POST` med `action: save_draft`.
Aktuell lärarinloggning och screeningens befintliga pilotgräns gäller.
Ägaren bestäms alltid från sessionen. Elevkonton och andra lärarkonton kan
inte läsa utkasten. Bildreferenser valideras och uppladdade bilder måste
tillhöra läraren, även i ofullständiga bildfrågor.

`screening_draft:<teacherId>:<draftId>` och `screening_drafts:<teacherId>`
lagrar privata versioner och deras index. Utkasten har inga elevreferenser
eller kopplingar till elevens uppdragsindex. Högst 100 utkast per lärare,
20 versioner per utkast, 60 000 tecken per innehåll och 2 MiB historik stöds.
Vid uppnådd gräns bevaras tidigare versioner och en ny kopia kan skapas.

Sparandet använder atomisk Redis-CAS mot `expectedRevision`. En äldre flik
får 409 och behåller sin text. Samma `requestId` med samma innehåll återläser
en redan utförd sparning utan en extra version. Klienten behåller både
utkast-ID och den exakta begäran vid osäker nätkvittens. Ett nytt utkastbyte
eller kopieringsförsök tillåts först när samma sparning har följts upp.
En återbekräftad äldre version visas med sitt eget versionsnummer även om
ytterligare versioner har sparats under tiden.

## Verifiering

`api/screeningDraftStore.test.js` provar privat lagring, ofullständiga frågor,
separata historiska versioner, konflikt, samtidiga skrivningar, idempotens
efter förlorad kvittens och främmande bilder. `robots/screening-drafts.robot.js`
provar den verkliga frågeredigeraren, förlorad serverrespons, omladdning,
fråge-/facitrevidering, arbetsytor, två flikar, historik, kontoisolering och
oförändrade elevdata. Lärarvyn granskas renderad i liggande och stående
iPadstorlek. Det är emulering med syntetiska konton, inte fysisk iPad eller
produktionslagring. Elevutdelning och godkännandeflödet för den separata
materialmodulen införs inte av denna funktion.

Arkitektur: utkastlagring, utkastkontroller, förhandsvisning och gemensam
frågeredigerarstatus är separata moduler. Den befintliga stora
`DashboardLayout.jsx` ändras enbart med en referens, en callback och en
varning i dess befintliga arbetslägesväxel; ingen fråge- eller lagringslogik
läggs där. Det finns inga nya bibliotek eller globala designändringar.

Slutkontroll 2026-10-28: 174 testfiler/877 tester och produktionsbuild
godkända, liksom riktad lint och arkitekturkontroll. Tio riktade browserfall
passerade för utkast, facit, bildredigering, befintligt sparande och
gruppresultat. Arbetslägesbytet reproducerade därefter dataförlust i ett
robotprov före rättning. Efter rättning passerade fyra omkörda fall,
inklusive utkastets samtliga revisions-/nätfels-/kontogränser och den nya
navigeringskontrollen. Lärarvyn granskades visuellt i två skärmformat.
De åtta individuella samlingarna med 64 frågor är nu sparade i appen som
privata utkast, med innehåll och facit återlästa från verklig lagring.

## Produktionsverifiering 2026-10-28

PR24 är sammanslagen efter gröna GitHub-kontroller. Kodversionen är
`acae69714dfee79dc0072f5a9fb4f86096af9d5b`; sekvens-deployment
`dpl_2hVYVSa738dzkSQihBRaJMhxHSiD` är READY med
`matematik.ximon.se` som alias. Aktiv app serverar `index-D8igdzpf.js`.

Åtta avsedda privata utkast sparades som version 1 genom det autentiserade
lärar-API:t. Alla 64 frågor och facit återlästes och jämfördes med respektive
sparbegäran. Återförsök med samma requestId för första utkastet gav ingen
extra version. Alla åtta finns i den privata utkastlistan. Klassens
elevuppdrags-ID:n är oförändrade före och efter: inga uppdrag delades ut.
Kvittens och personanknutet innehåll finns enbart utanför repot. Detta
verifierar riktig API-/KV-lagring, inte autentiserad visuell produktion eller
fysisk iPad. Frågorna nås via Screening: dela ut → Utkast för genomgång.

## Återställning till rätt lärarkonto 2026-10-29

Den tidigare importen sparade de åtta utkasten under exportskriptets
lärarkonto. Den öppna lärarvyn använde ett annat konto och visade därför en
tom privat lista. Utkasten och alla 64 frågor fanns kvar oförändrade.

Åtta kopior har återställts genom den befintliga inloggade lärarvyn till
det avsedda kontot; originalen är kvar. Alla frågor, facit, enheter,
bråkvillkor och räknehäftesval kontrollerades efter serveråterläsning.
Den redan öppna screeningen sparades separat före återställningen.
Alla åtta syns under **Screening: dela ut → Materialbibliotek → Privata
utkast** i det publicerade UI:t från PR #26. Ingen elevutdelning gjordes.
Personanknutna kvittenser och skärmbild ligger enbart lokalt utanför repot.

Det separata MCP-flödet identifierar nu sitt konto i capabilities och kräver
uttrycklig kontobindning före sparande mot en godkänd appmiljö; se PUPIL_MCP.md.
