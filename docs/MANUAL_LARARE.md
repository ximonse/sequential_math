# Lärarmanual

Den här manualen beskriver hur du arbetar i lärardashboarden.
Detaljerad datatolkning (kolumn för kolumn) finns i separata dokument:

- `docs/LARARDASHBOARD_LOGIK.md`
- `docs/EXPORTER_OVERSIKT.md`
- `docs/EXPORTER_RADATA.md`
- `docs/reflektion.md`

## 1. Logga in

1. Gå till startsidan och klicka `Lärare? Logga in`.
2. Ange ditt användarnamn och lösenord.
3. Du kommer till `/teacher`.

Lärarkontot skapas av administratören. Kontakta administratören om du saknar konto, har glömt lösenordet eller behöver åtkomst till en annan skola eller klass.

Högst upp i lärarvyn visas ditt kontonamn och din roll. Bakgrunden är ljusgrön för **Lärare**, ljusorange för **Skoladministratör** och ljuslila för **Huvudadministratör**, så att det syns direkt vilken behörighet du använder.

## 2. Första setup

1. Välj en klass som administratören har tilldelat dig.
2. Öppna **Klasser & elever** och klistra in elevlistan med en elev per rad, eller separera elever med kommatecken eller semikolon.
3. Kontrollera att elever dyker upp i tabellerna.
4. Välj klassfilter högst upp innan du analyserar data.

Notera:
- Toppfiltret styr hela dashboarden (en eller flera klasser/grupper).
- En elev kan ligga i flera klasser/grupper.

### Skolor och klasser

Administratören skapar skolor och tilldelar varje lärare en eller flera skolor. Du ser bara dina direkt tilldelade klasser. Behöver du en ny klass eller skola kontaktar du administratören.

Varje klass har ett oföränderligt **klass-ID**. Klassnamnet kan däremot ändras, exempelvis `4B` till `5B`, utan att elevernas ID, träningshistorik eller elevlänk ändras. Samma klassnamn kan bara finnas en gång på samma skola.

Administratören tilldelar ansvariga lärare under **Administration → Klasser**. En lärare får då se och arbeta med klassens elever, resultat, elevkoder, klasslänk och inställningar.

Elever använder en klasspecifik länk eller QR-kod och loggar in med sitt namn och sin fyrsiffriga kod. De väljer aldrig själva skola eller klass.

### Radera en elev

Permanent radering görs av skoladmin eller huvudadministratör. Som lärare kan du flytta eleven mellan klasser på samma skola och ändra elevens kod.

### Nytt läsår

Administratören använder **Administration → Klasser → Nytt läsår**. Välj skola och kontrollera förhandsgranskningen innan `Genomför årsbyte`. Namn som börjar på årskurs 4–8 höjs automatiskt, till exempel `4B` → `5B`. Om ett nytt namn skulle krocka med en befintlig klass stoppas årsbytet tills det är löst.

## 3. Huvuddelar

Lärarvyn är indelad i **Klasser & elever**, **Uppdrag & exit tickets**, **Tabeller & kunskapsområden** och **Statistik**. Klassurvalet högst upp styr innehållet och sparas på enheten. Highscore ligger sist på sidan.

## 4. Daglig rutin (rekommenderat)

1. Kontrollera `Klass/gruppvy - snabbstatus` för vem som är aktiv nu.
   Du kan klicka kolumnrubrikerna för sortering (stigande/fallande).
   Samma typ av sortering finns även i `Gångertabell - sticky status per elev` och `Behöver stöd nu`.
   I `Resultatvy` går det också att klicka kolumnrubriker för sortering.
   Klicka på `i`-ikoner vid kritiska kolumnrubriker för kort tolkning direkt i vyn.
2. Titta på `Behöver stöd nu` för prioriterad lista.
3. Klicka `Elevvy` på en elev för individnivå.
4. Exportera vid behov (`Export översikt`, `Export rådata`, `Export aktivitet`, osv.).

## 4. Logik och Kolumnförklaringar

För full logik per sektion i dashboarden:
- `docs/LARARDASHBOARD_LOGIK.md`

För full kolumnordlista i exporter:
- `docs/EXPORTER_OVERSIKT.md`
- `docs/EXPORTER_RADATA.md`

För pedagogisk motivering samt reliabilitet/validitet:
- `docs/reflektion.md`

## 5. Aktivitetsfärger

- Grön: sidan i fokus + interaktion senaste 2 minuter.
- Orange: sidan i fokus men ingen interaktion senaste 2-4 minuter.
- Svart: varit inne idag men inte aktiv just nu.
- Röd: ingen aktivitet idag.

## 6. Elevvy (lärare)

Sektionen `Elevvy (lärare)` visar per elev:
- total/vecko/dagsdata,
- tid på uppgift,
- aktuell/högsta nivå,
- `Framsteg` per räknesätt,
- gångertabellens sticky-status (dag/vecka/star),
- svagast/starkast typer i svensk kompakt notation.

Du kan exportera elevens vy via `Exportera elevvy CSV`.

## 7. Uppdrag via länk

I sektionen `Uppdrag via länk` kan du:
1. Skapa ett uppdrag.
2. Skapa `NCM-uppdrag` genom att välja en eller flera NCM-koder och/eller NCM-förmågor.
3. Aktivera det för alla.
4. Dela länken till elever.

Elever som loggar in via länken hamnar i rätt läge direkt, även på annan enhet/browser, eftersom länken innehåller ett säkert uppdragspayload.

## 8. Ticket (start/exit)

I `Ticket`-sektionen kan du:
1. Skapa ticket-frågor manuellt.
2. Importera CSV (`Fråga;Svar` eller `Fråga;Svar;Taggar`).
3. Skapa utskick från frågemallen.
4. Välja målgrupp (klass/grupp och/eller enskilda elever).
5. Publicera ticket på elevens startsida (`publicerad till startsidan`).
6. Kopiera direktlänk (`Kopiera länk`).
7. Styra om elever ska se rätt/fel direkt.
8. Visa/avslöja korrekthet i efterhand för alla svar.

Ticket-uppföljning finns i:
- `Svar för valt utskick`
- `Elevhistorik i tickets`

## 9. Exporter (lärardashboard)

Tillgängliga exporter i huvudtabellen:
- `Export översikt`
- `Export rådata`
- `Export skill`
- `Export tabeller`
- `Export aktivitet`

I elevvy finns:
- `Exportera elevvy CSV`

Tips:
- Exportera översikt dagligen.
- Exportera rådata/aktivitet veckovis för djupare analys.

## 10. Bra arbetssätt i klass

1. Sätt ett tydligt passmål (t.ex. 10 minuter).
2. Följ `Klass/gruppvy - snabbstatus` under passet.
3. Efter pass: kontrollera tid på uppgift + antal försök.
4. Använd `Elevvy` för elever som sticker ut positivt/negativt.

## 11. Viktigt om data mellan enheter

Om elever kör på iPad/mobil och du vill se allt i lärarvyn:
1. Aktivera cloud-sync i Vercel (`VITE_ENABLE_CLOUD_SYNC=1`).
2. Se till att Redis/KV-integration finns.

Annars syns bara data som finns lokalt i samma browsermiljö.

## 12. Elevkoder och inloggningssignal

Varje ny elev får en fyrsiffrig personlig kod. Dela koden enskilt. Under `Klasser` väljer du `Visa QR-kod` för att visa en stor skannbar kod på skärmen, eller `Kopiera elevlänk` för att dela länken på annat sätt.

När en elev inte kommer in: välj rätt elev i din tilldelade klass och använd `Byt kod`. Du kan också se hur många felaktiga kodförsök som har registrerats, så att du kan avgöra om eleven behöver hjälp eller en ny kod.

Eleven väljer aldrig skola eller klass. Klasslänken avgör klass och elevens namn och kod identifierar eleven inom just den klassen.
