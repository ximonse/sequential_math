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

## Etapp 1 – adminbegränsad interaktionsprototyp (pågår)

- [x] Adminbegränsad route `/teacher/ncm/diagnostic-grid` läser de fyra
  uppgifterna från manifestet som markerbar text. Vanliga lärare och elever
  får inte öppna prototypen; NCM-modulen har orange bakgrund.
- [x] Rutnät med fokuserbara inmatningsfält för enhetens tangentbord, pilar,
  tabulator, direkt rutval, radering och operatorer. Vanliga rader ligger
  direkt efter varandra. Stor siffra och minnessiffra använder samma ruta;
  minnessiffran visas mindre och kan vara tvåsiffrig. Båda lägena begär
  siffertangentbord. Håll/släpp växlar storlek, håll/drag växlar lånestreck,
  och synliga knappar samt högerklick ger samma val. Ändringarna kan ångras.
- [x] Append-only-förlopp med versionsnummer, cellföre/-efter, markör,
  anteckningsläge, svar, paus/fokusförlust och inlämning. JSON-återläsning
  återskapar slutbilden eller stoppar vid mismatch.
- [x] Arbete i flera uppgifter bevaras i den öppna prototypfliken när eleven
  byter uppgift. Det är endast minnesstate, inte sparat elevunderlag.
- [ ] Prova antecknings-/låneinteraktionen med elever på avsedd iPad och välj
  sedan metod. Den nuvarande prototypen gör inget pedagogiskt metodanspråk.
- [x] Gör en kodförankrad avgränsning mot befintlig event-, synk- och
  profilmergeväg och skriv en [föreslagen separat försöksresurs](NCM_DIAGNOSTIK_LAGRING_V1.md)
  med CAS, sekvens, kvot, behörighet och raderingsfall.
- [x] Lägg till en isolerad append-validator som kontrollerar återspelning,
  sekvens, exakt retry, konkurrerande revisioner och kvoter utan att röra
  elevprofilen eller KV. Den är inte en färdig lagrings- eller API-väg.
- [x] Lägg till en separat serverlagringsmodul för append till ett redan
  serverregistrerat försök. Den återläser händelselista och slutbild, kör
  validatorn och gör revision, sekvens och append atomiskt i Redis. Test med
  lagringsdubbel täcker återläsning, samtidig skrivning, retry, korruption och
  tombstone. Modulen är ännu inte ansluten till ett API eller elevvyn.
- [x] Lägg till serverstyrd frysning av uppgiftsmanifestets innehåll och
  atomiskt öppnande av högst ett aktivt försök per elev och uppdragspost.
  Test med lagringsdubbel täcker parallell öppning, återupptagning, ändrat
  klassmedlemskap, tombstone och stoppad tilldelning. Lärare/elev kan ännu
  inte anropa detta via API.
- [ ] Implementera och testa serverauktoritativ försökslagring, idempotent
  synk, storleksgräns och återupptagning enligt det granskade resurskontraktet.

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
- Beslutat av Simon: en elevs historiska diagnostiska statistik ska finnas
  kvar utan namn efter radering, så att elevens tidigare utveckling kan
  jämföras över tid. Serien fryses vid radering; den ska inte följa elevens
  eventuella fortsatta användning av appen. En individuell historisk serie
  behandlas som pseudonymiserade personuppgifter.
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
- Separata minnessifferrutor och tvåsiffrig inmatning: 110 testfiler/545 tester,
  normal build, QA-build och riktad browserkontroll av tryck, `12`, Backspace,
  pilflytt, lagerväxling och JSON-återläsning passerade lokalt. En full
  robotkörning stannade efter majoriteten av fallen utan slutrapport och
  avbröts; den är inte verifierad för detta snitt.
- Efter korrigeringen av rutlayouten passerade 545 tester, normal build och
  QA-build. Browserkontrollen visade åtta sammanhängande vanliga rader, en
  hjälprad först efter uttryckligt val, bibehållen tvåsiffrig minnessiffra
  vid JSON-återläsning och att den tomma hjälpraden försvinner efter radering.
  En uppställning av `268 + 431` med streck och resultat fick plats på fyra
  på varandra följande vanliga rader; skärmbilden granskades.
- Publicerat via GitHub `master` till Vercel-projektet `sekvens` som
  adminbegränsad prototyp i commit `533aa6a` (READY 2026-09-30). Den
  sammansatta produktionsgrenen klarade 547 enhetstester, build och 69 robotar
  utan regelbrott. Detta verifierar inte iPadens faktiska tangentbord eller
  elevens användning. Simon har provat NCM-prototypen och begärt
  siffertangentbord även för stora siffror; den ändringen ingår i committen.
- Nästa steg: prova rutnät och minnessiffra/lån med elever på avsedd iPad;
  bygg och testa lärar-/elev-API:er med levande session, CSRF, aktuell
  klassåtkomst och serververifierad tilldelning innan elevvyn ansluts.
  Lärarens återöppning av inlämnat försök
  samt arkivets exakta fält, retention och behörighet behöver fastställas före
  verkliga elevuppdrag.
- Lagringsmodulens aktuella snitt: 113 testfiler/560 tester och normal build
  passerade lokalt. I full robotkörning rapporterades alla 72 testfall som
  godkända, men processen lämnade ingen slutrapport och avbröts. Därför räknas
  inte robotkörningen som fullständigt verifierad för detta snitt. Redis-Lua
  har testats med en lagringsdubbel, inte med en verklig Redis-instans. Ett
  separat riktat robotfall rapporterade också godkänt men fastnade vid
  avslutningen utan slutrapport.
- Tilldelnings-/öppningsmodulen: 114 testfiler/564 tester och normal build
  passerade lokalt. Den atomiska Redis-logiken är än så länge prövad med
  lagringsdubbel, inte med en verklig Redis-instans. Inga elev- eller lärar-API:er
  använder modulen och inga verkliga elevdata skrivs av den isolerade prototypen.
  Hela robotkörningen rapporterade 72 godkända fall men processen avslutades
  inte och saknar därför slutrapport/exitstatus.
