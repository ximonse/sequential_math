# NCM-diagnostik – levande ExecPlan

Status: aktiv arbetsplan, startad 2026-09-29. Styrande produktbeslut finns i
[projektinriktningen](NCM_DIAGNOSTIK_PROJEKT.md),
[produktkontraktet](PRODUCT_CONTRACT.md) och
[funktionskontrakten](FUNCTION_CONTRACTS.md). Denna fil är arbetsstatus, inte
ett påstående om levererad funktion.

## Mål och gräns

Bygg ett kort diagnostiskt uppdrag där elevens inmatade uppställning
och händelseförlopp bevaras, analyseras med versionsbestämda regler och visas
som spårbart, försiktigt lärarunderlag. Alla nya observationer ska vara
`diagnostic_only` och hållas utanför vanlig träningsmängd, mastery och
adaptivitet. Inga NCM-originaluppgifter byggs in utan klarlagd rätt.

## Arbetsloop

För varje etapp: läs berörda kontrakt och faktisk kod, gör ett avgränsat
arbete, verifiera elev–lagring–analys–lärarledet, uppdatera denna plan och
gör en liten lokal commit. Kodändringar verifieras med `npm run test` och
`npm run build`; logikändringar även med `npm run robots`. Publicering är
ett separat beslut.

## Etapp 0 – kontrakt och nulägesgräns (lokalt levererad)

Syfte: ge samma försök entydig betydelse i elevvy, lagring, analys,
lärarvy och export innan ett nytt elevflöde byggs.

- [x] Kartlägg gammal NCM-kod och dess faktiska dataväg, completion och evidens.
- [x] Definiera försökslivscykel från utdelning till lärargranskning, inklusive
      avbrott, återupptagning, inlämning och okänt resultat.
- [x] Definiera `diagnostic_only` i uppgiftsurval, observation, lokal/serverlagring,
      merge, mastery, adaptivitet, lärarunderlag och export.
- [x] Specificera fyra egna analysfall: två additioner och två subtraktioner.
      Varje fall anger matematisk avsikt, exempel, motexempel och okänt läge.
- [x] Definiera ett gemensamt versionsmärkt uppgiftsunderlag för elevvy samt tom
      Word/PDF. Utskriftsformaten ska läsa samma uppgiftsversion.
- [x] Granska kontraktet mot M1/M2, P3–P8, F1–F6 och den faktiska koden.

Leverans: ett granskningsbart etappkontrakt och en kodförankrad nulägeskarta.
Inga nya elevfunktioner eller utskriftsgeneratorer ingår i Etapp 0.

## Senare etapper

1. Isolerat rutnät och serialiserbart händelseförlopp; elevtest av minnessiffra
   och lån före interaktionsbeslut.
2. Deterministisk rekonstruktion och versionerad analys med matchning,
   motexempel och `okänt`.
3. Lärargranskning av original, analys och osäkerhet; utskrift av genomförd
   diagnos.
4. Liten klassrumspilot och kalibrering mot lärares granskning.
5. Lärarstyrda förslag till uppföljande uppdrag.
6. Expansion först efter nytt innehållskontrakt och nytt beslut.

## Etapp 1 – första isolerade prototypsnittet (pågår)

- [x] Dev-/QA-route `/qa/diagnostic-grid` läser de fyra uppgifterna från
  manifestet som markerbar text. Normal produktionsbuild exponerar inte routen.
- [x] Rutnät med fokuserbara inmatningsfält för enhetens tangentbord, pilar,
  tabulator, direkt rutval, radering, operatorer och en separat
  anteckningsposition. Två visuella placeringar av anteckningen kan jämföras
  utan att observationsformatet ändras.
- [x] Append-only-förlopp med versionsnummer, cellföre/-efter, markör,
  anteckningsläge, svar, paus/fokusförlust och inlämning. JSON-återläsning
  återskapar slutbilden eller stoppar vid mismatch.
- [x] Arbete i flera uppgifter bevaras i den öppna prototypfliken när eleven
  byter uppgift. Det är endast minnesstate, inte sparat elevunderlag.
- [ ] Prova antecknings-/låneinteraktionen med elever på avsedd iPad och välj
  sedan metod. Den nuvarande prototypen gör inget pedagogiskt metodanspråk.
- [ ] Anslut en säker serverauktoritativ försökslagring med idempotent synk,
  storleksgräns och återupptagning. Granska först hela event-/mergevägen.

Den isolerade prototypen har ingen lärartilldelning, ingen diagnostisk analys,
ingen vanlig mastery-/adaptivitetspipeline och ingen Word/PDF-renderare.
Att JSON går att återläsa i en flik bevisar ännu inte lagring efter avbrott,
serverbekräftelse eller att en elev naturligt kan skriva minnessiffra/lån.

### Lagringsaudit inför nästa implementation (första kodpasset)

- `api/me/events.js` kontrollerar levande elevsession, ursprung och CSRF och
  skickar sedan till `api/student/[studentId]/events.js`. Den senare accepterar
  bara nuvarande händelsetyper. `problem_result` hamnar i `recentProblems` och
  `problemLog`, som kapas till 250 respektive 5 000 poster. En ny observation
  får därför inte skickas som `problem_result`, även med `diagnostic_only`.
- Event-API:t begränsar en händelse till 32 KiB, en batch till 256 KiB och
  sorterar efter tidsstämpel före applicering. Rutnätsordning måste i stället
  valideras med försöks-ID och sekvens; en stor slutbild kan inte antas rymmas
  i ett vanligt event. Befintligt API returnerar ack för även redan applicerade
  händelser, vilket är rimligt för retry men inte bevisar att en ny typ lagrats.
- `pilotStudentRuntime.js` håller en krypterad IndexedDB-kö, delar batcher,
  kräver ack och bevarar avvisade original lokalt. Den sparar samtidigt
  elevprofilssnapshot. Eventets storlek kontrolleras först vid synk; för ett
  diagnostiskt försök behövs storlekskontroll före lokal acceptans och en
  synlig gräns mellan lokalt köad och serverbekräftad revision.
- `api/student/_profileMerge.js` slår ihop elevprofiler efter färskhet och
  kapar vanliga resultatfält. Ett nytt diagnostikfält på profilen skulle kunna
  överskrivas av äldre klienter eller blandas i statistik. En separat
  serverauktoritativ försöksresurs är därför arbetsförslaget; dess exakta
  nyckel, kvot, CAS-/konfliktregel, behörighet och raderingslivscykel återstår
  att specificera och testa.
- Gammalt `kind: ncm` i `assignments.js` är ett kodfilter med `targetCount`.
  Ny diagnostisk tilldelning behöver fryst uppgiftslista och serververifierad
  koppling till elev/klass; en länkpayload ensam får inte ge rätt att skriva
  ett försök. Lärarens läsrätt ska följa aktuell klassåtkomst medan
  `classIdAtAttempt` bevarar historiskt sammanhang.

Detta är en kodgranskning, inte en körbar garanti för en ny lagringsväg.
Innan serverkod skrivs krävs en konkret resursmodell och tester för parallella
enheter, dublett/retry, sekvensglapp, avbrott, kvotfel, klassbyte och radering.

## Beslut och öppna frågor

- Antaget: första omfattningen är flersiffrig addition och subtraktion med
  tangentbordsinmatad uppställning; diagnostik är skild från mängdträning.
- Beslutat av Simon: siffrorna skrivs med enhetens tangentbord. Prototypens
  egen sifferpanel har tagits bort.
- Antaget: egna uppgifter används tills rätt till originalmaterial klarlagts.
- Föreslaget i [Etapp 0-kontraktet](NCM_DIAGNOSTIK_ETAPP0.md): läraren avslutar
  ett försök uttryckligen. Detta är ännu inte ett antaget pedagogiskt beslut.
- Öppet för Etapp 1: naturlig inmatning av minnessiffra och lån avgörs genom
  elevtest, inte av Etapp 0:s datakontrakt.
- Öppet för senare etapper: vilka hypoteser som är tillräckligt säkra för
  klassöversikt respektive endast elevdetalj.

## Verifiering och status

- Etapp 0-underlag: [försökskontrakt och nulägeskarta](NCM_DIAGNOSTIK_ETAPP0.md)
  samt [uppgiftsmanifest v1](../src/domains/arithmetic/diagnosticTasks.v1.json).
- Etapp 1-prototyp: lokal QA-route utan elevkonton eller serverlagring.
  Prototypens JSON är en synlig arbetskopia, inte en säker sparfunktion.
- Verifierat lokalt efter ändringen till enhetens tangentbord: `npm run test`
  110 filer/544 tester, `npm run build` och `npm run robots` 68 godkända,
  0 regelbrott. Normal produktionsbuild innehöll ingen prototyproute.
  QA-bygget prövades med Playwright i mobilvy 390×844: inget automatiskt
  rutnätsfokus, fokus vid tryck, siffror, pilflytt, anteckning, radering och
  JSON-återläsning. Skärmbilden granskades. Detta är webbläsarkontroll, inte
  bevis för hur iPadens tangentbord visas eller fungerar med elever. Bygget gav
  befintliga varningar om gammal Browserslist-data, blandad statisk/dynamisk
  import och stor bundle.
- Nästa steg: prova rutnät och minnessiffra/lån med elever på avsedd iPad.
  Specificera samtidigt en separat serverresurs och dess konflikt- och
  raderingsregler utifrån lagringsauditen ovan, före serveranslutning.
