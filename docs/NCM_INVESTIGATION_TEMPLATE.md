# Utredningsmall: från felsvar till hållbar förståelse

Datum: 2026-10-30. **Första genomarbetade designfall, inte inkopplat i appen.**
Alla svar och förlopp nedan är konstruerade. De är inte elevobservationer.
Regler för antal frågor och senare uppföljning är förslag, inte validerade
gränser. Syftet är att precisera didaktiska beslut före implementation.

## Gemensam struktur, två ingångar

Fri träning/uppdrag ger en signal att undersöka. En lärarstartad bred
kartläggning söker också efter områden där tidigare underlag saknas.
Båda går in i samma utredning; ett helt diagnoshäfte är inget obligatoriskt
försteg. Befintligt relevant kunnande ska minska behovet av nya frågor.
Ett enstaka fel kan motivera en billig kontroll, inte en färdig diagnos.

```mermaid
flowchart TD
    A[Signal från träning eller uppdrag] --> C
    B[Lärarstartad översiktskartläggning] --> C
    C[Granska tidigare svar och arbete] --> D
    D[Avgränsa fråga och alternativa förklaringar] --> E
    E[Särskiljande kontroll] --> F{Vad visar underlaget?}
    F -->|Talar emot hypotesen| G[Avför eller omformulera hypotesen]
    F -->|Oklart| H[Kort följdfråga eller lärargranskning]
    H --> D
    F -->|Stödjer hypotesen| I[Oberoende kontrast och relevant förkunskap]
    I --> J{Tillräckligt motiverat stöd?}
    J -->|Nej| H
    J -->|Ja| K[Precisera lärandemål och undervisning]
    K --> L[Träna med återkoppling och avtagande stöd]
    L --> M[Självständig kontroll med nya tal]
    M -->|Svårigheten kvarstår| D
    M -->|Fungerar| N[Senare kontroll och förändrat sammanhang]
    N -->|Osäkert eller återfall| D
    N -->|Håller| O[Avsluta aktiv utredning med avgränsat besked]
```

Oklart underlag får inte skapa en obegränsad frågeloop. Följ pilotens budget
om högst fem nya diagnostiska frågor per pass; lämna kvar osäkerhet och en
konkret lärarfråga när budgeten är slut. Undervisning och senare uppföljning
är separata tillfällen, inte ett sätt att kringgå frågebudgeten.

## Första fall: subtraktion med en växling

**Utredningsfråga:** förstår eleven varför ett tiotal behöver bytas mot tio
ental och hur det förändrar båda positionerna i en skriftlig subtraktion?

Källankare är M02/N2 (AS2), med AG3 som relevant förkunskapskontroll enligt
[pilotens källkontroll](NCM_ADAPTIVE_SCREENING_PILOT.md). AS2 är en
diagnosreferens, inte en elevetikett eller en bekräftad felorsak. Kopplingen
AS2–AG3 är kontrollerad i lokala facit; undervisningssekvensen och de egna
uppgifterna nedan är vårt designförslag, inte ett påstående om NCM:s ordalydelse.

Hela [NCM-inventeringen](NCM_DIDACTIC_COVERAGE.md) ligger kvar som ryggrad.
Ett genomarbetat AS2-fall täcker inte decimaler, växling genom noll, andra
räknesätt eller katalogens övriga begrepp och luckor.

### 1. Upptäck och avgränsa

Konstruerad startsignal: **642 − 217 = 435**. Facit är 425. Svaret stämmer
med att ta större siffra minus mindre i varje kolumn, men visar inte att
eleven faktiskt gjorde så. Läs eventuell uträkning och relevanta historiska
rätta och felaktiga svar innan följdfrågan väljs.

| Möjlig förklaring | Vad behöver skiljas åt? |
|---|---|
| H1: större minus mindre i varje kolumn | Ger felregeln rätt prognos även på en annan särskiljande uppgift? Stämmer arbetet med den? |
| H2: växlingen genomförs men tiotalet minskas inte | Båda reglerna kan ge samma slutsvar. Kräver granskning av växlingssteget eller förklaring, inte bara ytterligare facitkontroll. |
| H3: osäker tiotalsövergång i mindre tal | Pröva relevant AG3-liknande förkunskap utan att tvinga fram en uppställning. |
| H4: tillfällig beräkning eller fel överföring till svarsfält | Jämför sparad uträkning med slutsvaret och välj en ny jämförbar uppgift. |

Tomt svar, gammalt fel följt av relevanta fungerande exempel eller enbart en
automatisk felkod ger inte stöd för att fastställa H1. Arbete utan slutsvar
bevaras som arbete, inte som ett konstaterat matematiskt fel.

### 2. Undersök med minsta nödvändiga frågor

| Egen kontrolluppgift | Facit | H1 ger | Funktion |
|---|---:|---:|---|
| 764 − 231 | 533 | 533 | Valfri baslinje om jämförbart underlag saknas. Kan inte utesluta H1. |
| 642 − 217 | 425 | 435 | Startobservation eller ny kärnkontrast; återanvänd inte som oberoende bekräftelse. |
| 753 − 428 | 325 | 335 | Parallell kontrast med en växling. Bevara elevens arbete. |
| 13 − 8 | 5 | Ej tillämpligt | Förkunskapsfråga om underlaget gör den relevant. |
| 14 − 6 | 8 | Ej tillämpligt | Alternativ kontroll vid osäker förkunskap och kvarvarande budget. |

H1 och H2 kan ge samma felsvar på kärnkontrasterna. Fråga därför exempelvis:
**”Vad händer med tiotalen när du växlar ett tiotal till ental?”** Låt eleven
förklara sin egen lösning. Ge inte instruktionen hur växlingen ska göras
och räkna sedan det hjälpta svaret som självständigt diagnostiskt belägg.
En förklaring som inte kan tolkas automatiskt lämnas till läraren.

Föreslagna beslut:

- Rätta särskiljande svar med förenlig, granskad metod talar emot den
  aktuella misstanken. Fel på en annan svårighet får inte flyttas hit.
- Upprepade modellförenliga fel plus förenlig granskad metod ger stöd för
  en avgränsad metodhypotes, inte en säker allmän kognitiv orsak.
- Fungerande mindre-tal-kontroller men svårighet med skriftlig växling
  motiverar undervisning om representation och växling.
- Osäker mindre-tal-kontroll motiverar att också undersöka förkunskapen.
  Säg inte att den bevisligen orsakade det ursprungliga felet.
- Rätt slutsvar med motsägande metod eller olika regler som ger samma svar
  lämnas öppet. Fler likadana tal löser inte den oklarheten.

### 3. Välj undervisning utifrån vad som faktiskt framkom

**Lärandemål:** eleven ska kunna omgruppera ett tal utan att ändra dess värde,
använda det i subtraktionen och förklara varför tiotal och ental ändras ihop.

För växlingsspåret föreslås denna korta sekvens:

1. Använd ett mindre exempel: 32 − 17. Låt eleven jämföra
   **32 = 30 + 2 = 20 + 12**. Värdet är detsamma; uppdelningen förändras.
2. Beräkna **(20 + 12) − (10 + 7) = 10 + 5 = 15** och knyt delarna till
   elevens skriftliga uppställning. Fråga varför svaret 25 inte kan följa
   av att samma 32 har behållits hela vägen.
3. Eleven arbetar med 43 − 18 = 25 och förklarar vad som ändras i båda
   positionerna. Ge återkoppling på det observerade steget.
4. Flytta till tresiffriga tal när omgrupperingen fungerar. Minska stödet
   från gemensam lösning till elevens förklaring och självständigt arbete.

Vid osäker förkunskap föregås detta av riktat arbete med tiotalsövergång
och uppdelning av mindre tal. Vid enbart felöverföring behövs i stället
uppföljning av svarsinmatningen; hela växlingsundervisningen är inte given.
Träningsmängden bestäms av vad eleven visar, inte ett fast antal felsvar.

### 4. Skilj träningsframgång från självständig kontroll

Alla hjälpta lösningar märks som sådana. Träningsfeedback kan visa framsteg
men stänger inte utredningen. En separat kontroll använder nya uppgifter,
utan visat exempel, ledtråd eller korrigering före det första sparade svaret.

| Kontroll | Facit | H1 ger | Vad den prövar |
|---|---:|---:|---|
| 831 − 416 | 415 | 425 | Ny självständig uppgift med samma kritiska växling. |
| 972 − 548 | 424 | 436 | Annan sifferkombination med samma mekanism. |

Föreslagen pilotregel: två olika särskiljande kontroller med förenlig granskad
metod ger status **”fungerar självständigt nu; senare uppföljning återstår”**.
Detta är ett granskningsbart designval, inte statistiskt bevis eller en
generell två-frågorsregel för hela appen. En uppgift som eleven redan fått
hjälp med räknas inte som en ny oberoende kontroll.

### 5. Kontrollera senare och i ett förändrat sammanhang

Planera nästa kontroll till ett senare undervisningstillfälle, skilt från
den just genomförda träningen. Exakt intervall är ännu inte beslutat eller
kalibrerat och får inte döljas bakom en påhittad standardgräns.

- **752 − 436 = 316**, medan H1 ger 324: ny kontroll av samma delmoment.
- **”Du har 83 kr och betalar 46 kr. Hur mycket har du kvar?” = 37 kr**:
  förändrat sammanhang; H1 skulle ge 43 om samma kolumnregel används.

Textuppgiften tillför språk och räknesättsval. Ett fel där, samtidigt som
den rena beräkningen fungerar, ska därför undersökas separat och inte
automatiskt återöppna samma växlingshypotes. Eleven får använda en egen
giltig metod; uppställning krävs bara när just den metoden ska undersökas.

Avslutande lärarbesked ska beskriva omfattningen, exempelvis:
**”Eleven har nu visat självständig subtraktion med en växling på nya tal,
även vid senare uppföljning. Den tidigare felregeln framträder inte i dessa
kontroller. Växling genom noll och decimaler har inte prövats.”**

Undvik ”felförståelsen är permanent borta”. Ett återkommande fel öppnar en
ny uppföljning med bevarad historik, inte en omskrivning av tidigare belägg.

## Det appen behöver hålla reda på

Varje aktiv utredning behöver mål/delmoment, ingång, källreferenser och
revisioner, observationer för och emot varje hypotes, alternativa förklaringar,
valda frågor och deras syfte, granskarbedömning, stöd som eleven fått,
undervisningsmål samt beslut, version och nästa uppföljning.

Tänkbara tillstånd är **signal → undersöks → hypotes stödd → undervisning →
självständig kontroll → senare uppföljning → avslutad för prövat delmoment**.
”Otillräckligt underlag” och ”behöver lärargranskning” måste kunna bevaras
utan påtvingad diagnos. En avförd hypotes och ett avbrutet pass är egna utfall.

Detta är en begreppsmodell, inte en beslutad databas- eller API-migration.
Återanvänd befintlig evidens, rapporthistorik, granskning och materialutkast;
skapa inte en konkurrerande profil eller separat kopia av elevens original.
Fri träning samlar underlag utan att i smyg byta elevens aktivitet. Läraren
startar utredningen och godkänner utdelning enligt befintligt flöde.
Diagnostiska kontroller ändrar inte automatiskt vanlig mastery/progression.

## Klart-när och nästa byggsteg

En första körbar tillämpning av kontraktet för subtraktion och bråkjämförelse
finns nu i [den fristående utredningsprototypen](NCM_INVESTIGATION_PROTOTYPE.md).
Den prövar även undervisning och uppföljning; det är fortfarande ingen elevväg.

Den första mallen är beskriven när varje övergång har observation, alternativ
förklaring, nästa handling och begripligt stoppbesked; särskiljande tal har
kontrollerat facit och träningsstöd hålls isär från självständiga kontroller.
Detta dokument uppfyller beskrivningssteget, inte didaktisk elevvalidering.

Nästa byggsteg är en revisionsbunden evidensadapter till den befintliga
offlineprototypen, med stöd för originalarbete, metodkonflikt, jämförbarhet
och hjälpta/ohjälpta försök. Representera okänd stödnivå som okänd. Därefter
kan syntetiska förlopp pröva övergångarna ovan, innan en elevväg kopplas in.
Testa även ett andra område (bråkjämförelse) mot mallen före bred generalisering.

Inget i denna leverans sparar elevdata, reviderar tidigare elevutkast,
tilldelar träning eller publicerar appfunktioner.
