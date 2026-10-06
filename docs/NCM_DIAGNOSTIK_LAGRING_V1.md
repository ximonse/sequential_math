# NCM-diagnostik: föreslagen försökslagring v0.1

Status: **delvis implementerat, ej öppnat för elever**. Detta dokument
preciserar nästa Etapp 1-snitt mot [försökskontraktet](NCM_DIAGNOSTIK_ETAPP0.md).
Inga elevförsök skrivs till servern av den nuvarande prototypen.

## Kontrollerad kodgräns

- `api/me/events.js` verifierar levande elevsession, ursprung och CSRF, men
  skickar till `api/student/[studentId]/events.js`. Den vägen accepterar bara
  uppräknade vanliga händelsetyper, sorterar en batch efter tidsstämpel och
  skriver `problem_result` i begränsade `recentProblems`/`problemLog`.
  Diagnostiska rutnätsändringar får inte läggas där.
- `src/lib/pilotStudentRuntime.js` har en krypterad IndexedDB-kö och kontrollerar
  ack för vanliga elevhändelser. Den kan ge mönster för transport och status,
  men dess checkpoint, batchning och reparationslogik är inte ett bevis för
  att den kan bevara ett diagnostiskt försök.
- `api/_studentStore.js` använder Redis `eval` för compare-and-set och
  tombstone vid elevradering. Den transaktionsprincipen kan återanvändas,
  men ett försök får inte bli ett nytt fält i elevprofilen.
- `api/_studentAccess.js` kontrollerar aktuell läraråtkomst via elevens
  aktuella klasser; `api/_studentSession.js` kontrollerar levande elevsession
  och spärrade/raderade elever. `api/class-config.js` är däremot publik och
  kan inte vara behörighetsbevis för ett diagnostiskt uppdrag.

## Resurser och identitet

Alla ID skapas eller godkänns av servern. Nycklarna nedan är föreslagna
separata KV-resurser, aldrig fält i elevprofil eller lärarens vanliga
uppdragslista.

| Resurs | Innehåll |
| --- | --- |
| `diagnostic_assignment:{assignmentId}` | Lärarens frysta `assignmentVersion`, `classId`, målgruppens elev-ID:n och ordnade `assignmentItemId` med `taskId`/`taskVersion` från ett bevarat manifest. Status styr nya försök; äldre observationer finns kvar. |
| `diagnostic_attempt:{attemptId}` | Header med elev-ID, uppdrags-/post-ID, `classIdAtAttempt`, `diagnostic_only`, rutnätsversion, `lastSequence`, serverrevision, byteantal, status och senaste kontrollerade slutbild. Inga masteryfält. |
| `diagnostic_attempt_events:{attemptId}` | Append-only Redis-lista av normaliserade händelser i sekvensordning. Ingen automatisk kapning eller tidsstämpelsortering. |
| `diagnostic_active:{studentId}:{assignmentItemId}` | Pekare till högst ett aktivt försök för elev och uppdragspost. Skapas atomärt med försöket. |
| `diagnostic_attempts_by_student:{studentId}` | Index för återläsning och raderingsstädning. Ett separat uppdragsindex behövs om lärare ska lista försök utan att skanna elever. |
| `diagnostic_assignments_by_class:{classId}` / `diagnostic_attempts_by_assignment:{assignmentId}` | Separata index för lärarens framtida listvy och raderingsstädning. |
| `diagnostic_assignments_by_student:{studentId}` | Atomiskt index vid tilldelning, även om eleven aldrig öppnar uppgiften. Behövs för full rensning efter klassbyte. |

Manifestet och uppgiftsversionen måste finnas kvar så länge ett försök kan
återges eller exporteras. `classIdAtAttempt` är historiskt sammanhang, inte
ensamt lästillstånd. En länk eller klientskickad `assignmentId` ger aldrig
skrivrätt utan serverns frysta tilldelning och levande elevsession.

## Skrivning och återupptagning

1. Läraren skapar en fryst tilldelning med levande lärarsession och serverns
   aktuella klassbehörighet. Servern kontrollerar manifestversion och varje
   uppgifts-ID; klienten får inte ersätta talen genom en länkpayload.
2. Eleven öppnar en tilldelad post med levande elevsession. Servern kontrollerar
   aktuell tilldelning, elev-/klassmedlemskap och tombstones. Finns ett aktivt
   försök returneras samma `attemptId`; annars skapas header, aktiv pekare och
   elevindex i en atomär operation. Klienten får inte hitta på ett nytt försök
   för att kringgå en konflikt.
3. En append-begäran innehåller `attemptId`, väntad serverrevision och en
   sammanhängande följd händelser med `eventId = attemptId:sequence`. Servern
   läser senaste header och logg, återskapar den befintliga slutbilden med
   `diagnosticGridModel`, tillämpar nya händelser i **sekvensordning** och
   kontrollerar före/efter-värden samt uppgifts- och rutnätsversion.
4. En Redis `eval`-transaktion jämför headerrevision, elev-/uppdragsstatus och
   sekvens, lägger sedan till exakt dessa händelser och uppdaterar header,
   slutbild och index tillsammans. En samtidighetskonflikt ger `409`; servern
   läser om och validerar i stället för att skriva över den andra enheten.
5. En exakt omsändning av redan sparade händelser ger samma ack utan ny
   append. Samma `eventId` med annat innehåll, sekvensglapp eller en delvis
   överlappande batch ger `409` och serverns kända revision. Klienten behåller
   sitt lokala original för granskning; den slår inte ihop två beräkningar
   automatiskt.
6. `submit` fryser en observationsrevision. Ett nytt elevförsök eller en ny
   revision efter inlämning kräver en uttrycklig serveråtgärd enligt
   försökskontraktet. `submitted` är inte `complete`, `assessed` eller `closed`.

Varje API-svar anger separat `local_pending`, `server_confirmed` eller
`conflict` i klientens visning. HTTP 200 utan verifierad ack för samtliga
händelse-ID:n får inte visas som sparat. Återinloggning hämtar serverheader,
sekvens och slutbild före ny skrivning; lokalt väntande arbete jämförs mot
servern utan att raderas vid konflikt.

## Kvoter, behörighet och radering

- Pilotgräns att implementera och mäta: högst 32 KiB per append-begäran,
  1 024 händelser och 512 KiB rå händelse-JSON per försök. Kontroll sker
  **före lokal acceptans** och igen på servern. När gränsen nås stoppas vidare
  inmatning med synlig sparstatus och möjlighet att bevara/exportera originalet;
  inga äldre händelser kapas tyst. Gränserna måste prövas mot riktiga elevspår
  innan elevflödet öppnas.
- Elevens läs/skrivväg kräver levande QR/PIN-session, betrodd origin och CSRF
  vid mutation. Varje begäran kontrollerar att försökets elev-ID är sessionens
  och att den frysta uppdragsposten verkligen tilldelats eleven. Lärarläsning
  kräver levande lärarsession och **aktuell** åtkomst till eleven/klassen;
  huvudadmin följer befintlig rollregel. Ingen rå observation lämnas från
  `class-config` eller andra publika endpoints.
- Vid permanent elevradering måste tombstone omedelbart blockera försökens
  läs-/skriv-API även om indexstädningen avbryts. Rå försök, händelser,
  aktiva pekare, index och framtida analys-/exportnycklar städas återupptagbart
  från elevindex. Klassradering stoppar nya försök och åtkomst via den klassen.

## Radering och anonymisering är separata åtgärder

Permanent elevradering tar bort träningsstatistik och NCM-original utan att
skapa ett statistikarkiv. Anonymisering tar bort samma konto och original,
men sparar en fryst historisk statistikserie utan namn eller kontokoppling.
Detta ersätter det tidigare beslutet om bevarad statistik efter radering.

`api/_pupilLifecycle.js` ansluter båda åtgärderna till elev-API:t. Den spärrar
nya elevskrivningar, fryser underlaget i ett återupptagbart jobb och städar
råa försök, händelser, sessioner och referenser. Vid anonymisering används
`diagnosticArchiveSeries.js`; arkivet publiceras atomiskt när städningen är
klar. Saknat eller korrupt diagnostikunderlag ger ett synligt fel.

Huvudadministratören kan läsa, exportera och radera statistikarkivet och
återuppta avbruten städning. Se [hela livscykelkontraktet](PUPIL_LIFECYCLE.md)
för fält, åtkomst, lokala kopior och kvarvarande verifieringsgränser.
En individuell serie kan fortfarande vara möjlig att identifiera genom
annan kunskap; avsaknad av namn garanterar inte full anonymitet.

## Acceptansfall före anslutning till elevvyn

- Två enheter skriver samma nästa sekvens: exakt en vinner; den andra ser
  konflikt och behåller sitt osparade original. Dublett/retry ger en ack.
- Sekvensglapp, ändrat `eventId`, fel uppgiftsversion, ogiltig slutbild och
  överskriden kvot ger inget delvis sparat försök.
- Avbrott före och efter serverack ger samma slutbild och händelseordning efter
  återinloggning. Inlämning kan inte dubbleras av retry.
- Saknad eller återkallad session, CSRF, ändrad klassåtkomst, deaktiverad
  tilldelning och elevtombstone avvisar ny skrivning och otillåten läsning.
- Diagnostiken lämnar `recentProblems`, `problemLog`, mastery, adaptivitet,
  vanlig träningsstatistik och det gamla NCM-completionflödet oförändrade.
- Radering som avbryts mitt i städningen kan köras igen utan att ett försök
  blir läsbart under tiden.
- Bevarad statistik innehåller inga råa uppställningar, händelser eller direkta
  elev-ID. En historisk elevserie fryses vid anonymisering och kan inte få nya
  mätpunkter. Individuella serier hanteras som pseudonymiserade personuppgifter;
  små gruppurval eller kombinerade filter får inte avslöja en elev.

En ren validator (`diagnosticAttemptAppend.js`) kontrollerar nu append och
exakt retry mot en återskapad slutbild utan att skriva till KV. Den verifierar
inte tilldelningsbehörighet eller faktisk återupptagning. En separat
servermodul (`api/_diagnosticAttemptStore.js`) återläser ett redan skapat försök
och dess händelselista, validerar append och använder Redis `eval` för atomisk
revision/sekvens/append. En lagringsdubbel testar konkurrens och retry; ett
verkligt Redis- och API-flöde är ännu inte verifierat. Modulen skapar inga
uppdrag eller försök och ger inte i sig klienten skrivbehörighet. UI och elevsynk
får användas för verkliga elever först när tilldelning, behörighet, radering
och hela återupptagningsflödet finns.
`api/_diagnosticAssignmentStore.js` fryser uppgiftsmanifestets innehåll i en
serverstyrd tilldelning och skapar/återöppnar högst ett aktivt försök atomiskt
per elev och uppdragspost. Lagringsmodulen kräver en auktoriserad anropare;
pilot-API:erna tillhandahåller den gränsen när de är aktiverade. Elevraderingskedjan är ansluten lokalt; faktisk Redis-körning återstår.
Arkivets exakta fält,
retention och behörighet samt lärarens uttryckliga återöppning av inlämnat
försök behöver fortfarande fastställas före verkliga elevuppdrag.

`diagnosticObservation.js` ger nu endast reproducerbara fakta från fryst
uppgift och validerat rutnät: facit, uttryckligt slutsvar, svarsläge, inlämning,
slutliga ifyllda rutor och om skrivhändelser förekommit. Resultatet är ingen
arkivresurs eller metodanalys och får inte användas som ersättning för den
beslutade avidentifierade historiska serien.

`api/teacher-diagnostic-assignments.js` och `api/me/diagnostic-attempt.js`
exponerar nu ett avgränsat pilotkontrakt för skapande respektive elevens
öppning, återläsning och append. Båda svarar 404 tills servern uttryckligen
sätter `NCM_DIAGNOSTIC_API_ENABLED=true`. Därtill krävs en explicit lista
med konton i `NCM_DIAGNOSTIC_TEST_STUDENT_IDS`; utan den går ingen elevväg
att använda och inga tilldelningar får skapas. Lärarens NCM-modul och en
separat elevroute använder API:erna, men hela vägen har ännu inte verifierats
med ett faktiskt testkonto och en riktig Redis-instans.
Lärarvägen kräver levande admin-/huvudadminsession och aktuell klassåtkomst;
vanliga lärare avvisas även av API:t. `api/teacher-diagnostic-attempts.js`
listar endast testkontots försök och återger rå arbetsyta först efter en
separat, behörighetskontrollerad detaljbegäran. Den versionsmärkta
faktasammanfattningen och kolumnobservationen härleds vid läsning utan att
skriva över råförsöket. Nya försök får en serverbestämd `createdAt` som
bevaras vid återöppning och visas i lärarens försökslista. Äldre poster utan
fältet visas utan påhittad tid. Elevvägen kräver levande QR/PIN-session och
origin/CSRF för mutationer. Elevens
klassmedlemskap, frysta tilldelning och uppgift kontrolleras före läsning och
skrivning, och append gör dessutom dessa kontroller atomiskt i Redis-skriptet.
Raderings-/arkivkopplingen finns lokalt. En körning mot verklig Redis återstår innan
flaggan får aktiveras med elevdata.

Testkontots elevvy skriver nu en separat AES-GCM-krypterad arbetskopia av
rutnätet i elevens befintliga IndexedDB-vault. Krypteringens AAD binder kopian
till elev-ID och försöks-ID. Vid ny öppning återspelas både serverns och den
lokala bilden; bara ett exakt händelseprefix återtas automatiskt. Avvikande
lokalt arbete visas kvar och ny append stoppas. Robotprovet har täckt
nätavbrott, omladdning, serveråterkoppling och en tvåflikskonflikt med
lagringsdubbel. Det bevisar inte beteendet med riktig Redis eller att en
inmatning som avbryts före lokal IndexedDB-kvittens bevaras. En lokal kopia
rensas nu först efter serverkvittens och kontroll av händelseprefixet samt
postens unika version i IndexedDB. En nyare eller avvikande kopia blir kvar.
Robotprovet kontrollerar att bekräftade kopior försvinner och konfliktkopian
finns kvar; radering av elevkontots lokala vault behöver fortfarande en egen
livscykel före verkliga elevers användning.
