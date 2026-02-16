# Lärarmanual

Den här manualen beskriver hur du arbetar i lärardashboarden.
Detaljerad datatolkning (kolumn för kolumn) finns i separata dokument:

- `docs/LARARDASHBOARD_LOGIK.md`
- `docs/EXPORTER_OVERSIKT.md`
- `docs/EXPORTER_RADATA.md`
- `docs/reflektion.md`

## 1. Logga in

1. Gå till startsidan och klicka `Lärare? Logga in`.
2. Ange lärarlösenord.
3. Du kommer till `/teacher`.

Notera:
- Lösenordet styrs av `TEACHER_API_PASSWORD` i Vercel.
- Om lösenord saknas i servermiljö visas felmeddelande i lärarinloggning.

## 2. Första setup

1. Skapa klass under sektionen `Klasser`.
2. Klistra in elevlista med en elev per rad.
3. Kontrollera att elever dyker upp i tabellerna.
4. Välj klassfilter högst upp (`Urval: klasser`) innan du analyserar data.

Notera:
- Toppfiltret styr hela dashboarden (en eller flera klasser/grupper).
- En elev kan ligga i flera klasser/grupper.

## 3. Daglig rutin (rekommenderat)

1. Kontrollera `Klass/gruppvy - snabbstatus` för vem som är aktiv nu.
   Du kan klicka kolumnrubrikerna för sortering (stigande/fallande).
   Samma typ av sortering finns även i `Gångertabell - sticky status per elev` och `Behöver stöd nu`.
   I `Resultatvy` går det också att klicka kolumnrubriker för sortering.
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
2. Aktivera det för alla.
3. Dela länken till elever.

Elever som loggar in via länken hamnar i rätt läge direkt.

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

## 12. Nollställ elevlösenord

Längst ner i lärardashboarden finns sektionen `Nollställ elevlösenord`.

Så använder du den:
1. Välj klass/grupp högst upp (urvalet styr vilka elever som visas).
2. Sök på namn, ID eller klass vid behov.
3. Klicka `Nollställ lösenord` på rätt elev.

Resultat:
- Nytt lösenord sätts till elevens inloggnings-ID.
- Status visas direkt i sektionen och i dashboardens statusrad.
