# Styrning: göra elevers felförståelser tydliga för läraren

Status: **ANTAGET av Simon 2026-11-11** som styrande över övriga filer i `docs/`
utom produktkontraktet. Frysningen i avsnitt 4 gäller som den står. Beslut 3
och 4 i avsnitt 10 är öppna. Arbetsregeln i avsnitt 11 ska föras in i
`AGENTS.md`; spärrarna i avsnitt 5 finns ännu inte och införs med steg 1–4.

Bakgrund och belägg: genomgången 2026-11-11 av kod, dokument och 17 884 riktiga
elevsvar i fyra klasser (Kumlaby åk 6, åk 5, åk 4, åk 6).

## 1. Målet

Appen har två uppdrag: **mängdträning** och att **fånga elevers felförståelser
och göra dem tydliga för läraren**, för enskild elev och för grupp/klass.

Just nu gäller ett enda arbetsmål:

> En lärare som öppnar en screening ska utan eget detektivarbete se vilka
> felförståelser som finns, hos vilka elever, och med vilka svar som belägg.

Fokus är **screeningar**. Hur läraren arbetar vidare efter upptäckten är inte
prioriterat nu.

## 2. Varför vi hamnade här igen

Frågan har tagits upp förut. Tidigare beslut skrevs som text i dokument. Inget
i koden eller i CI stoppade ett tillägg som bröt mot dem, och varje ny session
kunde välja egen riktning. Därför är varje regel nedan kopplad till en
**mekanisk spärr**. En regel utan spärr räknas inte som införd.

## 3. Nuläge som detta ska rätta

| Iakttagelse | Belägg |
| --- | --- |
| Felförståelser saknas i rutinen för ny domän | Checklistan i `ARCHITECTURE.md` har sju steg, inget om felmodeller |
| Två felanalyser per domän utan koppling | `analyzeError` (krav, får vara tom etikett) och `predictableErrors` (frivilligt register) |
| En felmodell är utspridd i lösa listor | 23 av 62 modeller saknade rubrik, 40 saknar beskrivning; inget test krävde dem (räknat 2026-11-12; första räkningen 52 missade tio modeller) |
| Modeller har inga krav på träff och icke-träff | "Angränsande produkt" ger slumpträffar; fel räknesätt sorteras som slarv |
| Luckor passerar tyst | Se baslinjen per elevsvar nedan; appen mätte inte detta |
| Screeninguppgifter kan inte analyseras | 0 av 48 NCM-uppgifter har strukturerat innehåll; 5 av 54 screeningfel fick modellträff |
| Svar går förlorade i screening | Kumlaby: 52 av 155 obesvarade, 35 med uträkning i räknehäftet |
| Klassnivå är en annan konstruktion än elevnivå | Ingen vy visar "denna felförståelse, dessa elever" |

Siffrorna är baslinjen. Framsteg mäts mot dem.

### Baslinje per elevsvar, 2026-11-12

Mätt med `scripts/error-coverage.mjs` på 17 884 svar från 73 elever i fyra
klasser, 15 aug–11 nov. Varje fel räknas en gång, efter elevens eget svar.
*Syns i elevrapporten* är en separat siffra: fel som dagens rapport visar på
något kort eller bland periodens första 20 svar. (Den tidigare siffran 260 av
1 900 för åk 5 räknade kortens stödsvar, inte svar, och ersätts av denna.)

| Klass | Fel | Felförståelse | Observation | Inmatning | Oförklarat | Syns i rapporten |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Kumlaby åk 6 | 223 | 29 | 28 | 6 | 160 (72 %) | 173 (78 %) |
| Åk 5 | 1 900 | 225 | 109 | 71 | 1 495 (79 %) | 553 (29 %) |
| Åk 4 | 412 | 80 | 60 | 26 | 246 (60 %) | 316 (77 %) |
| Åk 6 | 354 | 82 | 34 | 11 | 227 (64 %) | 144 (41 %) |
| Totalt | 2 889 | 416 | 231 | 114 | 2 128 (74 %) | 1 186 (41 %) |

Av de 2 128 oförklarade ger ingen modell svaret för 1 735, och 393 nådde aldrig
modellerna. Av dessa 393 är 342 decimaluppgifter i träning: de sparas med
operationen `positions_decimal`, som analysens inläsning inte känner igen.
1 550 av alla fel kommer från snabbhetsträning. 93 screeningsvar är obesvarade,
46 av dem med uträkning i räknehäftet.

**Rättat lokalt 2026-11-12:** analysens inläsning läser nu räknesättet ur
`skill` när `operation` är `positions_decimal`. Mätt med
`--reanalyse` på samma svar:

| Mått | Före | Efter |
| --- | ---: | ---: |
| Når aldrig modellerna | 393 | 51 |
| Felförståelse | 416 | 423 |
| Observation | 231 | 247 |
| Inmatning | 114 | 115 |
| Ingen modell ger svaret | 1 735 | 2 053 |
| Syns i elevrapporten | 1 186 | 1 163 |

Decimalfelen når nu modellerna men saknar nästan alla en modell som förklarar
dem; det är nästa lucka att fylla i steg 5. Att färre fel syns i rapporten
beror på att fler misstankar konkurrerar om rapportens åtta platser, ett tak
som hör till steg 4.

## 4. Det som ligger still

Tills steg 1–4 i avsnitt 8 är klara byggs **inget** nytt i:

- kontrastfrågor, Fråga igen och gemensam prövning,
- materialgranskning, utdelningskedja och didaktikpaket,
- rapportavstämning och undervisningsnoteringar,
- nya träningslägen, nya vyer och visuell harmonisering.

Befintliga funktioner behålls som de är. Fel som stoppar elever eller lärare
rättas. Allt annat i listan väntar.

## 5. Fem regler med spärr

**R-A. En katalog är enda källan för felmodeller.**
Varje felmodell är en post med alla fält i avsnitt 6. Rubriker, beskrivningar,
sortering som slarv, rivaler och klassvy härleds ur katalogen.
*Spärr:* ett test som faller om en modell saknar ett fält eller om en lös
lista utanför katalogen nämner ett modell-ID.

**R-B. Ingen screeninguppgift utan felsvarsnyckel.**
Varje uppgift i en screeningbank anger vad den prövar och vilka fel den kan
avslöja, enligt avsnitt 7. Lärarens egna frågor är undantagna men märks tydligt
som "utan felanalys" i resultatet.
*Spärr:* bankens test faller om en uppgift saknar nyckel.

**R-C. Inget fel får försvinna.**
Varje felsvar hamnar i exakt en av fyra: *felförståelse*, *observation*,
*inmatning* eller *oförklarat*. Ett svar som flera modeller förklarar tar den
första arten i den ordningen. Ett oförklarat svar anger varför: ingen modell
ger svaret, eller svaret nådde aldrig modellerna. Varje obesvarad uppgift
redovisas som obesvarad, med uppgift om det finns uträkning. Räkningen utgår
från elevens eget svar; lärarbedömda svar och svar dolda som slarv redovisas
på egna rader. Summan ska alltid stämma med antalet svar.
*Spärr:* `errorCoverage` i `src/lib/errorCoverage.js` kontrollerar summorna
och kastar fel i stället för att lämna en rapport som tappar svar.
Rapportens och klassvyns egna tak (8 kort, 20 svar per kort) ligger i ett
schema som delas med den frysta avstämningen. Testet att de vyerna visar allt
och att summorna stämmer flyttas därför till steg 4, när vyerna byggs om.

**R-D. Täckningen syns alltid.**
För varje screening och varje område visas hur många fel som är förklarade,
slarv och oförklarade, och de vanligaste oförklarade svaren.
*Spärr:* täckningen på ett syntetiskt underlag ur katalogens exempel sparas i
`docs/coverage/synthetic.json` och jämförs i testerna. En ändring i felmodellerna
syns som en ändrad fil i samma commit. Riktiga elevsvar körs bara lokalt, med
`node scripts/error-coverage.mjs --evidence FIL` och resultat utanför repot.
Elevsvar committas aldrig, inte heller för att låta CI se dem.

**R-E. Elev, grupp och klass visar samma sak.**
Klassvyn är elevernas resultat lagda bredvid varandra, inte en egen beräkning.
*Spärr:* ett test som räknar fram klassens siffror ur elevernas och kräver
likhet.

## 6. Felmodellens form

En post i katalogen har alltid:

| Fält | Innehåll |
| --- | --- |
| id, område | stabilt ID och vilket innehåll modellen hör till |
| gäller när | villkor på uppgiften, uttryckt i uppgiftens strukturerade innehåll |
| beräkning | vad en elev med felet svarar, räknat i kod |
| slag | felförståelse, slarv eller inmatning |
| rubrik och beskrivning | klartext för läraren: hur eleven tänker |
| källa | var felet är beskrivet (till exempel NCM-boken), eller "egen iakttagelse" med datum |
| ska träffa | minst tre exempel på uppgift och svar som modellen måste fånga |
| får inte träffa | minst tre exempel som modellen inte får fånga |
| slumprisk | hur många olika svar modellen förutsäger per uppgift |

En modell med hög slumprisk får inte ensam visas som misstanke. Tröskeln
beslutas av Simon, se avsnitt 10.

## 7. Screeninguppgiftens form

En uppgift i en screeningbank har alltid:

| Fält | Innehåll |
| --- | --- |
| uppgift och facit | som i dag |
| strukturerat innehåll | talen och operationen, så att modeller kan räkna på uppgiften |
| prövar | vilket kunnande uppgiften är till för |
| felsvarsnyckel | de felsvar som avslöjar något, var och en med felmodell eller en kort förklaring |

Felsvarsnyckeln fylls på två sätt: modeller ur katalogen räknar fram svar, och
uppgiftsspecifika svar skrivs in för hand där ingen modell passar. Det senare
gör att bråk, procent och textuppgifter kan ingå innan generella modeller finns.

Eleven lämnar ett svar per uppgift eller väljer uttryckligen "vet inte". Tomt
svarsfält med ifylld uträkning ska inte kunna lämnas in utan fråga.

## 8. Ordning, screening först

Varje steg har ett klart-när som går att kontrollera. Nästa steg påbörjas inte
förrän det föregående är klart.

1. **Katalogen.** Flytta de 62 befintliga modellerna till katalogformen utan att
   ändra vad de räknar. Fyll i saknade rubriker och beskrivningar. Inför spärr R-A.
   *Klart när:* testet är grönt och analysen ger samma träffar som före flytten
   på sparat underlag.
   *Läge 2026-11-12, lokalt:* katalogen finns i
   `src/domains/predictableErrors/catalog.js` med alla 62 modeller. Rubriker,
   sortering som slarv eller inmatning, rivalfamiljer och snabbhetsundantag
   härleds ur den. `catalog.test.js` är spärr R-A. Varje modell har tre svar
   den ska fånga och tre den inte får fånga i `catalogExamples.json`; de är
   maskinvalda ur nuvarande beteende och inte didaktiskt granskade. Öppen skuld
   som testet håller synlig: 40 modeller saknar beskrivning av tankefelet och
   23 nya rubriker väntar på Simons läsning. Fälten *källa* och *slumprisk* i
   avsnitt 6 finns ännu inte i katalogen, och *gäller när* finns bara i
   beräkningskoden.
2. **Täckningsrapport.** Bygg måttstocken och kör den på befintligt underlag.
   Inför spärr R-C och R-D.
   *Klart när:* rapporten återger baslinjen i avsnitt 3 och summorna stämmer.
   *Läge 2026-11-12, lokalt:* `errorCoverage` och `scripts/error-coverage.mjs`
   finns, baslinjen ovan är mätt med dem och summorna stämmer. Avgränsning:
   detta är en läsande beräkning och ett lokalt verktyg. Rapporten och klassvyn
   är oförändrade; deras summatest hör till steg 4.
3. **Screeninguppgifternas nyckel.** Ge de 48 NCM-uppgifterna och bankens 42
   uppgifter strukturerat innehåll och felsvarsnyckel. Inför spärr R-B. Lös
   tomt svarsfält.
   *Klart när:* varje uppgift har nyckel, och en ny screening inte kan lämnas in
   med tomt svar utan fråga.
   *Redan levererat 2026-11-11 (e72973c, d4c132c, i produktion):* eleven varnas
   vid inlämning om svarsrutor är tomma, och läraren kan skriva in ett glömt
   svar, räkna ett svar som rätt och anteckna en felförståelse i fritext.
   Kvar att mäta: hur många obesvarade med uträkning som återstår i nya
   screeningar. Lärarens fritext kopplas till katalogen i steg 4.
4. **Screeningresultatet.** En vy per screening: felförståelser överst, under
   varje vilka elever och vilka svar, sedan oförklarade fel och obesvarade.
   Samma data för en elev, en grupp och klassen. Inför spärr R-E.
   *Klart när:* Simon öppnar en riktig screening och kan säga vilka elever som
   har vilken felförståelse utan att öppna enskilda elever.
5. **Fyll luckorna efter måttstocken.** Ta de vanligaste oförklarade svaren ur
   täckningsrapporten, i tur och ordning, med rutinen i avsnitt 9.
6. **Samma struktur för träningssvaren.** Först därefter.

## 9. Rutin för nytt område eller ny felmodell

Samma fem steg varje gång, inget annat sätt:

1. Lista kända felförståelser ur källa. Ange källan.
2. Skriv modellen med exempel som ska träffa och inte får träffa.
3. Kör mot riktiga felsvar. Redovisa träffar, slumprisk och vad som blir kvar
   oförklarat.
4. Simon godkänner modellen och dess beskrivning.
5. Lägg in den i katalogen. Täckningsrapporten visar skillnaden.

Ett nytt område räknas som infört först när det har uppgifter med nyckel,
modeller i katalogen och en rad i täckningsrapporten.

## 10. Beslut som Simon behöver ta

1. Antas dokumentet som styrande, över övriga filer i `docs/` utom produktkontraktet?
   **Ja, Simon 2026-11-11.**
2. Gäller frysningen i avsnitt 4 som den står? **Ja, Simon 2026-11-11.**
3. Tröskel för slumprisk: hur många olika svar får en modell förutsäga per
   uppgift innan den kräver minst tre träffar för att visas som misstanke?
4. Ska upprepat fel räknesätt räknas som felförståelse i stället för slarv?
   Förslag: ja, från tre träffar.

## 11. Arbetsregel för agenter

Gäller från antagandet och förs då in i `AGENTS.md`:

- Före varje uppdrag: ange vilket steg i avsnitt 8 uppdraget hör till. Hör det
  inte till något steg, säg det och fråga innan arbetet börjar.
- Ett uppdrag som rör det frysta i avsnitt 4 kräver Simons uttryckliga besked
  i samma samtal.
- Ingen ny felmodell, ny screeninguppgift eller ny domän läggs in utanför
  rutinen i avsnitt 9.
- Varje leverans redovisar täckningen före och efter.
- Ett grönt test är inte belägg för att läraren ser felförståelsen. Belägget är
  avsnitt 8, steg 4: en riktig screening, läst av Simon.
