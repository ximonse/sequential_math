# NCM-diagnostik: föreslagen försökslagring v0.1

Status: **implementationsförslag, inte levererad lagring**. Detta dokument
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
  Om historiska försök ska raderas eller behållas efter klassradering kräver
  ett uttryckligt gallringsbeslut före implementation.

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

Nästa implementation börjar med en testbar serverlagringsmodul och dess CAS-
tester. UI och elevsynk ansluts först när dessa fall är gröna. Gallring efter
klassradering och lärarens uttryckliga återöppning av inlämnat försök är
fortfarande produktbeslut, inte färdiga serverregler.
