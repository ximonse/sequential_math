# Klassöversikt och lärarens genomgång

Lokalt implementationssnitt 2026-10-06. NCM-flödet är fortsatt tillgängligt
för admin/huvudadmin med aktuell klassåtkomst och serverns pilotbegränsning.
Det påverkar inte vanlig träning, mastery eller adaptiv progression.

## Arbetsflöde

Under NCM-diagnostik väljer admin klass och ett befintligt uppdrag i
**Klassöversikt och genomgång**. Inget uppdrag väljs automatiskt.
Översikten visar nuvarande behöriga mottagare av just det uppdraget:

- Inte påbörjat: inget sparat försök för någon uppgift.
- Påbörjat: minst ett försök öppnat, men inte alla uppgifter inlämnade.
- Alla inlämnade: alla uppgifter har ett serverlagrat inlämnat försök.
- Inlämnade och kvar: antal uppgifter, oberoende av svarens korrekthet.
- Genomgångna: antal försöksrevisioner som läraren uttryckligen markerat.

**Uppdatera klassöversikt** hämtar en ny serverbild. Vyn gör ingen dold
automatisk polling. En uppgift väljs för genomgång; elever med sparat försök
visas som knappar med inlämningsstatus. Föregående/nästa elev bläddrar inom
den valda uppgiften. Elever utan försök finns i tabellen, inte i lösningskön.
Originalrutnät, händelseåterspelning och befintliga begränsade observationer
återanvänds. Pågående och inlämnade lösningar kan granskas.

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
