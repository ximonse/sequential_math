# Väntetider: genomförande och skydd mot återfall

Arbetsplan efter Simons återupptagande 2026-11-07. Planering, mätning,
implementation och produktionsverifiering är olika statusar. Föreslagna
tidsgränser är ännu inte antagna produktkrav. Historiska mätningar finns i
[övergångsrapporten](PERFORMANCE_TRANSITIONS.md), arkitekturriktningen i
[arkitekturplanen](PERFORMANCE_ARCHITECTURE_PLAN.md).

## Mål och ordning

En vy ska invänta minsta nödvändiga giltiga data. Svar, original, aktuella
uppdrag och behörighet får inte offras för kortare väntan. Bakgrundsuppdatering
får inte byta elevens uppgift eller radera lärarens val/utkast.

1. Inventera hela övergångsmatrisen och definiera användbar beredskap.
2. Förklara långsamma kedjor från klick till lokal kö, nät, server och DOM.
3. Reproducera orsaken i ett isolerat prov innan implementation.
4. Ändra beroenden och datamängd; avgränsad överlappning är bara en del.
5. Inför automatiska kontrakts-/robotkontroller som upptäcker återfall.
6. Verifiera kalla/varma fall och felhantering, sedan samma produktionsfall
   efter separat publiceringsmandat.
7. Spara verifierade rotorsaker och överförbara lärdomar i projektets minne.
   Gör inte oprövade hypoteser till lärdomar.

## Övergångsmatris och nuvarande luckor

P = observerad i produktion; L = isolerat lokalt prov; O = öppet. Enstaka
observationer är inte ett p95, och delvis täckning godkänner inte hela raden.

| Fall | Användbar beredskap | Underlag / kvarstående arbete |
|---|---|---|
| Elevinloggning | Rätt elevs startsida och aktiva startval | P; fler kalla starter/enheter O |
| Hem till blandad träning, varm | Rätt uppgift och redigerbart svar | P; upprepade serier behövs |
| Förnyad start efter verklig 60 s-period | Rätt uppgift och redigerbart svar efter aktuell validering | P, 8,4 s-fall oförklarat; detaljerad transportmätning påbörjad |
| Övning till hem | Startsida där tillåtna val kan användas | P; separat config-väntan finns |
| Tabellval till övning | Exakt valda tabeller och redigerbart svar | P för tabell 7, inga lämnade svar |
| Byta räknesätt / fri träning | Exakt vald kompetens och användbart svar | O live; tidigare prob hittade inte knapparna, inte bevis för saknad funktion |
| Talpar / dubblor / Talbild | Exakt valt läge, användbar första uppgift | O för denna mätmatris |
| Svar till återkoppling och nästa vanliga fråga | Beständigt svar, rätt återkoppling och nästa användbara uppgift | L; syntetisk produktionsprovning O |
| Screening öppna / återuppta | Rätt samling, fråga och bevarad uträkning | L; livefixture saknas |
| Screening nästa / föregående | Rätt fråga med oförändrat sparat arbete | L; livemätning av sparväntan O |
| Screening inlämning | Serverkvitterad inlämning, läsbara original | L; livekvittens O |
| Lärarinloggning till klassval | Behöriga klasser kan väljas | P; roll-/storleksvariation O |
| Kall / varm lärarkatalog | Korrekt sökbart elevurval utan resultathistorik | P; kall läsning fortfarande cirka 10,8 s i senaste jämförbara serie |
| Klassbyte / gruppbyte | Exakt aktuellt urval med färdiga resultat eller tydligt fel | P för klass, L för grupper; större urval O |
| Lärarsidbyte | Vald panels faktiska innehåll användbart | P för panelmarkörer; alla innehållsberoenden O |
| Elevbyte / elevdetalj | Rätt elevs innehåll användbart | P som hård navigering, inte ren klicktid; vanlig elevlänk O |
| Analys / historik | Källor och senaste rapporter inlästa | P; lång screeninghistorik O |
| Materiallista / materialöppning | Komplett tillåten sida / vald version läsbar | P; lista cirka 6,8 s kvarstår |
| Material sparande / granskning / utdelning | Korrekt version och verklig åtgärdskvittens | L; inga nya produktionsåtgärder inom mätningen |

Varje fall ska dessutom prövas med kort/lång historik, tom/stor kö och
relevanta kalla/varma förhållanden. Felmatris: offline/återanslutning,
förlorad kvittens, omstart under skrivning, två flikar, identitetsbyte,
utgången/återkallad session, ändrat uppdrag och elev-/klassradering.

## Mätkedja

- Klick till användbar DOM mäts i webbläsaren; verktygstransport ingår inte.
- Lokala väntköer, lokal beständig skrivning och serverkvittens hålls isär.
- Nätverksmått: DNS, anslutning/TLS, requestStart till responseStart,
  responseStart till responseEnd, storlekar och serverns statiska faser.
- Väntan före requestStart och före handlerns start kräver ytterligare
  belägg. Skillnaden mellan nätverkstid och Server-Timing är inte i sig
  bevis för kallstart, nätfel eller lokal kö.
- Parallella serverstegs summerade tider är inte kritisk väggklocketid.
- Kör en mätserie åt gången utan egna samtidiga byggen/testsviter. Ange
  verklig enhet, nätprofil, commit, roll, cacheläge och köförhållanden när de
  är kända; markera okända förhållanden i stället för att anta dem.
- Spara endast statiska faser, avidentifierade rutter, antal och tider.
  Inga elevsvar, namn, credentials, cookies eller request-/response-kroppar.

## Arkitekturspår och beslutspunkter

Elev: bootstrap inväntar i dag synk och sedan full profil när reuse löpt ut.
Utred minsta färska validering separat från historiksynk. Bevisa korrekt
sammanfogning av lokal arbetskopia och serverrevision innan väntan tas bort.
En enda synkarbetare, atomär lokal lagring, idempotens och avvisade original
ska bevaras. Underhåll/reparation får inte växa obegränsat på startvägen.

Lärare: katalogens TTL-cache kan vid miss läsa fulla profiler igen.
Inventera skrivvägar och medlemsindex före ändrad projektion. Små läsposter
behöver versions-/källrevision, korrekt uppdatering och reparationsväg.
Behåll färsk åtkomst och återkallelse; ersätt inte dessa med långlivad cache.
Sammanfattningar måste stämma mot original och samma matematiska regler.

Först om transportspåret belägger behov utreds region, serverstart eller
driftkonfiguration. Ingen databas-/ramverksflytt motiveras av en tidsskillnad.

## Återfallsskydd och acceptans

Automatiska kontrakt ska begränsa antal anrop, överförda data och arbete per
övergång. En långsam, oberoende historik-/namn-/synktjänst ska inte blockera
en vy som inte behöver den. Avsiktligt återinförd blockering ska göra provet
rött. CI har i dag funktionstester/build, medan robotworkflow är manuellt;
ett litet representativt paket behöver införas automatiskt vid relevanta
ändringar. Full belastnings-/felmatris körs separat före release.

Lokal första leverans 2026-11-07: Verify-workflow kopplar in sex
beroendekontroller vid ändringar i app/API/robotar/paket/Vite/workflow.
Den nya elevroboten håller synken kvar genom tre varma aktivitetsbyten;
fem katalogrobotar kontrollerar bland annat långsam/felande historik och
att gamla urvalssvar inte ersätter nya. Paketet passerar mot produktionsbygge.
Tillfälligt bootstrapReuseMs=0 gav det förväntade röda provet: ingen användbar
övning medan synken hölls kvar. Runtime återställdes och alla sex passerade
igen. Ändringsfiltret har körts mot riktiga kod-/dokumentationsbaser och
nollbas, och workflow-YAML har parsats. Detta är lokala belägg; GitHubs
faktiska körning återstår efter separat pushmandat. Skyddet omfattar inte
alla matrisens öppna rader eller deras latensbudgetar. Fulla slutkontroller:
233 testfiler/1265 tester, build, sex robotar, lint och arkitektur passerar.
Byggets befintliga varningar om chunkstorlek, import och Browserslist kvarstår.

Föreslagna p95-budgetar på specificerad referensenhet/nät: varm övning eller
nästa fråga 1 s, screeningfråga med säker lokal lagring 1 s, klassval efter
lyckat login 2 s, klassöversikt för 30 elever 3 s, förnyad elevstart 3 s och
materiallista 3 s. Serverinlämning och lokal kvittens mäts separat. Minst
30 observationer per centralt fall är en första fördelning, inte garanti
för sällsynta långsvansar. Skips eller saknade livefall är öppna krav.

Avslut kräver komplett berörd matris, oförändrade data-/åtkomstkontrakt,
automatiskt återfallsskydd och verifierad produktion. Projektminnet ska då
innehålla rotorsak, bevis, lösning, begränsning, misslyckade angreppssätt och
en generell checklista för andra projekt. Tidigare publiceringsmandat gäller
inte automatiskt nästa kodsjok. Ingen framtida automatisk övervakning är
aktiverad genom denna plan.
