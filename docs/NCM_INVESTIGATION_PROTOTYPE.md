# Utredningskedjan som körbart kontrakt

Datum: 2026-10-30. **Fristående offlineprototyp, inte en funktion i elevappen.**
Ingen elevdata läses från nätet eller skrivs av prototypen. Alla publicerade
granskningsfall här är konstruerade. Mallen är beskriven i
[NCM_INVESTIGATION_TEMPLATE.md](NCM_INVESTIGATION_TEMPLATE.md).

## Leverans och återanvändning

- `scripts/prototypes/ncm-investigation.mjs` väljer nästa steg i hela kedjan.
  Subtraktionsutredningen anropar befintliga `decidePilot`; den ersätts inte
  med en andra subtraktionsmotor. Ingen app/API/MCP importerar modulerna.
- `ncm-investigation-content.mjs` beskriver mål, undervisningsförslag och
  egna kontrollfrågor för en växling respektive en avgränsad bråkhypotes.
- `ncm-investigation-evidence.mjs` tar ett redan behörigt läst, komplett
  evidensexport enligt befintligt kontrakt. Den gör inga egna API-anrop.
  Explicit urval binder fråga och motivering till originalref och revision.
- `run-ncm-investigation.mjs` skriver två syntetiska granskningsförlopp till
  stdout. [Läsbar körning](evaluations/ncm-didactic-2026-10-30/investigation-prototype.md)
  och [hela spåret](evaluations/ncm-didactic-2026-10-30/investigation-prototype.json)
  innehåller underlag, beslut, syfte och regelversion.

Adaptern bevarar originalpost, originalarbete, bedömningsstatus, täckning
och ej valda referenser. Den vägrar blandade elev-/klass-/källrevisioner,
förväxlad fråga, upprepade urval och listor som ännu har nästa sida.
Frågetext eller strukturerade operander ska stämma med den valda uppgiften;
den mappar inte godtyckliga träningsfrågor till en liknande katalogfråga.

Okänt stöd förblir `unknown`, och metodgranskning förblir `unreviewed` utan
originalarbete och en uttrycklig granskningsmotivering. Historiska poster
kan starta en undersökning men räknas inte som nya frågor. Hjälpta eller
okända historiska försök blir inte självständiga bekräftelser.
Historikens ålder/jämförbarhet väljs ännu av en granskare, inte en automatisk
poäng. Adaptern hittar inte på sessions-ID eller pålitlig kontrolltid från
källans klienttidsstämpel.

## Övergångar och stopp

1. **Undersöka:** välj särskiljande frågor med syfte och kort budget. Ett
   felkodnamn är ingen orsaksdiagnos. Baslinjen kan vara rätt med fel regel.
2. **Granska hypotes:** en explicit granskning med alternativa förklaringar
   refererar till exakta källrevisioner. Inga diagnostiska observationer får
   gömmas genom att lämnas utanför granskningen. I denna pilot krävs två
   olika relevanta felkontraster och förenlig metodgranskning för stödd hypotes.
3. **Undervisa:** visa mål och ett konkret undervisningsförslag. En sparad
   undervisningsnotering måste knytas till granskningen och ett tillfälle.
   Prototypen kontrollerar noteringens kontrakt, inte faktisk undervisningskvalitet.
4. **Självständig kontroll:** nya särskiljande uppgifter efter undervisningen.
   Hjälp, okänt stöd, saknad metodgranskning eller obesvarat lämnar frågan öppen.
   Undervisningsnoteringen anger använda frågor; en tränad fråga får inte
   senare räknas som en ny oberoende kontroll bara för att hjälpen tagits bort.
5. **Senare uppföljning:** kräver ett annat tillfälle efter de självständiga
   kontrollerna, med både beräkning och förändrat sammanhang. Två olika
   tillfällen är en försiktig prototypregel; exakt tidsintervall är inte kalibrerat.
6. **Avsluta:** beskedet gäller stabil förståelse i prövade situationer.
   Ett nytt kontrollfel ger en ny lärarfråga, inte automatiskt samma felorsak.

Väntande sparande stoppar alla övergångar. Motstridiga originalkopior,
saknade referenser, förbrukade kontraster och ändrade granskningsrevisioner
ger tydliga stopp. Tidigare fel behöver inte raderas för att en senare
framgång ska kunna dokumenteras; utredning och efterföljande kontroller
har olika roller.

## Andra området: bråkjämförelse

NCM-ankaret är M14/RB4 med RB2 som förkunskapsreferens enligt den bevarade
referensen. **Antal saknade delar är en lokal hypotes, inte en påstådd
specifik NCM-felkod.** Ingen ny kontroll av samtliga RB-källor påstås här.

4/7 jämfört med 4/9 särskiljer en större-nämnare-regel men inte regeln
”färre saknade delar betyder större bråk”. Därför får den inte ensam stödja
eller avfärda den senare hypotesen. Kärnkontrasterna är i stället
3/4 mot 7/9 samt 9/11 mot 4/5. Rätt sida varierar; alltid-vänster/höger ska
inte ge full framgång. Exakta bråkvärden jämförs med korsprodukter.

Undervisningsförslaget synliggör samma helhet och delarnas storlek:
3/4 = 27/36 och 7/9 = 28/36. De saknade delarna är 1/4 respektive 2/9,
så antalet i sig avgör inte. Senare uppgifter använder andra tal:
5/6 mot 11/13, 13/15 mot 6/7, 8/9 mot 17/19 och lika stora flaskor med
19/21 respektive 9/10 av innehållet kvar. Alla särskiljer denna felregel.
Nämnarregeln är en alternativ förklaring, inte ett andra färdigbyggt
utrednings-/undervisningsspår.

## Nästa avgränsade steg

Lokalt verifierat: 193 testfiler och 1000 tester passerar, inklusive 32 nya
kontrakts-/adapterprov och befintliga 23 subtraktionsprov. Körningen är
`npm run test -- --exclude '.claude/**'` för att inte blanda in andra
agenters inbäddade worktrees. Produktionsbygget passerar med befintliga
varningar om paketstorlek och blandad dynamisk/statisk import. Riktad ESLint,
arkitektur- och projektkartskontroll passerar. Ingen elevrobot eller UI-QA:
denna offlinekod importeras inte av appen och ändrar inget elevflöde.

Det gemensamma kontraktet fungerar syntetiskt för båda områdena. Hela
[NCM-inventeringen](NCM_DIDACTIC_COVERAGE.md) kvarstår; två exempel innebär
inte att övriga begrepp har implementerats eller källgranskats.

Uppdaterad prioritering 2026-10-30: följ
[beslutet om regelmotor först och AI vid tolkningsbehov](NCM_INVESTIGATION_TEMPLATE.md#beslut-regelmotor-först-ai-vid-tolkningsbehov).
Granska befintliga regler mot NCM-ryggraden och fyll först luckorna i
växling genom noll. Bind sedan modellkandidater till befintlig frågeväljare
utan AI-anrop för kända fall. Detta är planerat arbete, inte ny levererad kod.

Därefter är produktsteget en lärargranskad ingång via befintlig analys/materialväg:
visa original, föreslagen utredningsfråga, frågor med syfte och kvarstående
osäkerhet. Då behöver livscykelns gransknings-/undervisnings-/kontrollhändelser
få ett beslutat lagringskontrakt och åtkomstväg som återanvänder befintlig
historik. Varken UI, nya API-skrivningar, automatisk utdelning eller påverkan
på mastery har införts här. Metodflaggor och tillfällen i granskningsfallen
är simulerade bedömningar; syntetiska prov visar inte didaktisk effekt.
