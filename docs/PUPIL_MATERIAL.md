# Generella och analysspecifika uppdrag och screeningar

Beslutad riktning 2026-10-28. Urvalsläsningen nedan är byggd lokalt;
materialutkastens lagring, godkännande och MCP-utdelning återstår att bygga.
Detta dokument specificerar nästa implementation, inte en färdig API-yta.

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

## Kontrakt för kommande utkast

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
  kräver lärarbedömning; godtyckliga nya numeriska frågor får inte utlovas
  automatisk rättning utan ett nytt verifierat kontrakt.
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
Träning återanvänder befintliga måltyper student/group/class. Screening får
behöva separata utdelningar per klass med explicita elevlistor. Ingen elev i
en annan klass får tappas eller läggas till tyst. Återförsök får inte skapa
dubletter; kvitto ska ange mottagare, uppdrags-ID:n och eventuella delfel.
Pågående uppdrag får inte ersättas genom ett oavsiktligt clear/deactivate.

Verifiering omfattar båda ingångarna × båda innehållstyperna × elev/grupp/klass,
inklusive klassöverskridande grupper, tomt underlag, ändrat medlemskap,
ändrad version, dubbelklick, timeout efter lyckad skrivning och elevens
faktiska åtkomst/svar/omladdning. Screening förblir diagnostic_only.
