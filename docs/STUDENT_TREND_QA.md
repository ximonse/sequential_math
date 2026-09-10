# Elevprofil: 14 dagars träning

Lokal UX-leverans, 2026-09-09. Ingen push eller deploy ingår.

## Verifierat

- Full testsvit: 174 tester i 41 filer passerar.
- Produktionsbuild lyckas. Vite varnar för paket över 700 kB och
  Browserslist för gammal caniuse-lite-data. Inga beroenden har ändrats.
- Regressionstester omfattar Stockholm-midnatt, 23/25-timmarsdygn,
  årsskifte, skottår, tomma dagar, fem/sex svar, ogiltiga/framtida poster,
  avkortad historik, föredragen datakälla och renderad tabell.
- UI-kopplingen testas för sparad hopfällning, vanlig dashboard och
  användning av full profil i detaljens sammanfattningsrad.

- Datumtesterna passerar även med värdtidszon America/Los_Angeles.

## Lokal visuell kontroll

Chrome med isolerad lagring och en lokal Vite-server. API-kodvägen aktiverad
med `VITE_ENABLE_CLOUD_SYNC=1`; alla API-anrop i testfliken ersattes av
syntetiska svar. Inga riktiga elevprofiler eller molndata användes.

- Direktlänk öppnade elevdetaljen trots sparat `detail: true`.
- Listan levererade två senaste svar för testeleven; separat detaljanrop
  levererade 191 svar. Diagram och tabell visade 191 svar och 138 rätt.
- Samtliga 14 tabellrader kontrollerades mot diagrammens data.
- Visuellt kontrollerat vid desktopbredd, 768 px och emulerad 390 px.
  Vid 390 px var dokumentet 390 px brett; diagrammen rullade inuti panelen.
- Elevbyte till fem sparade svar gav begränsningsmarkering och en grå
  fristående punkt. Tom profil gav noll punkter och 14 tabellrader.
- Inga konsolfel eller varningar under den första kompletta desktopkontrollen.

Detta verifierar den lokala UI-kodvägen med simulerade API-svar. Det är
inte ett test av produktionsserver, autentisering eller fysisk touch.

## Avslutande kontroll 2026-09-10

- Lokal syntetisk elev kunde logga in, starta träning och registrera ett rätt och ett felaktigt svar. Felåterkopplingen visade facit och elevens svar.
- Befintlig elevvyexport skapade en CSV med rätt MIME-typ, kolumnrubriker och data (22 709 byte i testfallet).
- En redan öppen dashboard återöppnade elevdetaljen vid byte via direktlänk efter manuell hopfällning.
