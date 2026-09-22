# Organisations- och inloggningskontrakt

Detta dokument är den auktoritativa specifikationen för skolor, klasser, roller och inloggning. Koden och de körbara testerna är facit för exakt API-beteende. Ändra detta dokument i samma ändring som du ändrar något inom organisation eller inloggning.

## Identiteter och relationer

| Objekt | Stabil identitet | Regler |
| --- | --- | --- |
| Skola | `school.id` | Skapas av administratör. Namnet är visningstext. |
| Klass | `class.id` | Består när klassnamnet ändras. Klassen har exakt en skola och ett eller flera läraransvar. |
| Lärare | `teacher.id` | Har tilldelade skolor (`schoolIds`) och klasser (`classIds`). Klassens `teacherIds` är den direkta åtkomstgränsen. |
| Elev | `studentId` | Behålls vid klassnamnsbyte och innehåller träningshistorik. Elevens klassmedlemskap är serverlagrad data. `preferredName` är ett valfritt tilltalsnamn och får aldrig användas som inloggningsidentitet. |

En klass måste höra till en befintlig skola. Klassnamn är unika per skola efter normalisering av blanksteg och stora/små bokstäver. Samma namn kan därför användas på olika skolor. Ett elevnamn är unikt på samma sätt inom sin klass, men behöver inte vara globalt unikt.

## Roller och behörighet

Konton har exakt en explicit roll. Serverns aktuella kontopost är auktoritativ; en token innehåller aldrig den behörighet som används efter inloggning.

- **teacher** arbetar i sina direkt tilldelade klasser.
- **school_admin** arbetar inom sina tilldelade skolor men får aldrig global åtkomst genom att rollen inte är `teacher`.
- **super_admin** hanterar skolor och globala roller.

Ändrad roll, skoltilldelning eller klasstilldelning höjer `sessionVersion` och gör tidigare sessioner ogiltiga. Egen superadminroll kan inte tas bort, och en atomisk serverkontroll hindrar samtidiga ändringar från att radera eller nedgradera den sista aktiva superadminen.

| Åtgärd | Superadmin | Skoladmin | Lärare | Elev |
| --- | --- | --- | --- | --- |
| Skapa skola och administratörskonto | Ja | Nej | Nej | Nej |
| Skapa lärarkonto | Ja | Ja, inom egna skolor | Nej | Nej |
| Ändra roll eller radera lärarkonto | Ja | Nej | Nej | Nej |
| Skapa, byta namn på eller arkivera klass | Ja | Ja, inom egna skolor | Nej | Nej |
| Tilldela ansvarig lärare till klass | Ja | Ja, inom egna skolor | Nej | Nej |
| Flytta elev mellan skolor | Ja | Nej | Nej | Nej |
| Flytta elev mellan tilldelade klasser på samma skola | Ja | Ja | Ja | Nej |
| Skapa elev, dela klasslänk och ändra elevkod | Ja | Ja | Ja, i tilldelad klass | Nej |
| Sätta eller ta bort elevens tilltalsnamn | Ja | Ja, inom egna skolor | Ja, i tilldelad klass | Nej |
| Radera elev permanent | Ja | Ja, inom egna skolor | Nej | Nej |

Servern kontrollerar behörighet på varje skyddat API-anrop. Dolda knappar i gränssnittet räcker aldrig som behörighetskontroll.

## Lärar- och administratörsinloggning

Varje lärarkonto har användarnamn, lösenord, roll, tilldelade skolor och klasser. Lösenord lagras som hash med salt. Inloggning i `POST /api/teacher-login` utfärdar en signerad session. Sessionen verifieras mot ett aktivt konto och dess `sessionVersion`, så lösenords-, roll- och direkta klasstilldelningsändringar gör äldre sessioner ogiltiga.

Administratörer använder samma kontomodell. Skoladministratörer är avgränsade till sina tilldelade skolor; huvudadministratörer har global behörighet. Ett avstängt konto får ingen ny session. Råa lösenordsheaders och kontolösa sessioner godtas inte.
Äldre konton med enbart `isAdmin` behöver migreras uttryckligen innan de används för skoladministration. Migreringen väljer exakt ett användarnamn som `super_admin`, sätter övriga äldre administratörer till `school_admin` och blockerar oskopade skoladministratörer tills de har en skoltilldelning. Den körs aldrig automatiskt mot produktion.


## Elevinloggning

1. Läraren eller administratören skapar eleven i sin tilldelade klass. Eleven får
   ett personligt QR-kort, ett kodnamn och en separat fyrsiffrig PIN.
2. Eleven skannar i första hand sitt personliga QR-kort och skriver PIN. Om
   skanning inte fungerar används kodnamnet och samma PIN.
3. Läraren kan dessutom dela klassens slumpmässiga elevlänk eller QR-kod. Den är
   en avgränsad ingång till klassen, inte en separat elevidentitet eller
   träningshistorik.
4. Samtliga ingångar ska efter verifiering utfärda samma typ av säker
   elevsession och nå samma serverlagrade profil.

### Tilltalsnamn

Lärare och administratörer kan sätta ett valfritt `preferredName` för en elev
de har serververifierad åtkomst till. Tilltalsnamnet visas i elevens och
lärarens vardagsvyer, samt i highscore-listor. Ett tomt värde tar bort det och
återgår till elevens registrerade namn. Kodnamn, QR-kod och PIN ändras aldrig
av detta; elevkort använder fortsatt registrerat namn och kodnamn.

Eleven kan aldrig bläddra bland eller välja skolor och klasser. Det finns ingen publik katalog över skolor, klasser eller elevnamn. Vid fel kod räknas misslyckade försök på elevens profil; läraren kan se signalen och sätta en ny kod. En vanlig session gäller i 12 timmar. Med **Kom ihåg mig på den här enheten** gäller den i upp till 30 dagar.

## Klasslänk och årsskifte

Klasslänken bygger på en slumpad nyckel som hör till klassens stabila ID. Att byta namn, exempelvis `4B` till `5B`, ändrar därför inte elevernas ID, historik, klasslänk eller inställningar.

Vid nytt läsår väljer skoladmin avgångsårskurs och avgångsår. Verktyget föreslår namnbyte för lägre årskurser och arkivering av avgångsklasser. Varje förslag kan redigeras eller hoppas över. Appliceringen kontrollerar hela skolans klassrevisioner och skriver alla valda ändringar i en enda atomisk Redis-operation; en samtidig ändring eller namnkonflikt stoppar hela årsbytet. Klasser utan tydligt årskurstal ändras manuellt.

## API-gränser och körbar verifiering

- `GET/POST /api/teacher-schools`: listar skolor inom lärarens tilldelning; endast administratörer kan skapa.
- `/api/admin/teachers` och `/api/admin/classes`: administratörsgränser för konton, skoltilldelning och klassansvar.
- `/api/teacher-classes` och `/api/student-roster`: kräver levande lärarbehörighet samt rätt skola och klass.
- `/api/teacher-workspace`: lagrar uppdrag, aktivt uppdrag, ticketmallar och ticketutskick per autentiserat lärarkonto.
- `/api/student-session`: verifierar personligt QR-kort eller kodnamn tillsammans
  med PIN och utfärdar den auktoritativa elevsessionen.
- `/api/student-login`: får användas för en giltig klasslänk men ska efter
  identifiering växla till samma elevsession och får inte skapa en parallell
  identitet, profil eller evidenskedja.

Kontraktet verifieras främst i `api/teacherFlow.test.js`, `api/studentLogin.test.js` och `api/studentStore.test.js`. Vid en ändring av dessa regler ska tester, detta kontrakt, berörd manual och felsökningsguide uppdateras tillsammans.
Rollgränserna har dessutom enhetstester i `api/teacherRoles.test.js`.


## Arkiverade klasser

En klass har ett stabilt ID oberoende av visningsnamn. Arkivering sätter `archived` och `archivedAt`, sparar det tidigare aktiva namnet och ger klassen ett historiskt namn. Därmed blir det aktiva namnet ledigt utan att elev-ID, klasslänk, träning eller statistik bryts. Arkiverade klasser är fullt fungerande men döljs i lärarens standardurval. Återställning kontrollerar aktiv namnunikhet på nytt.

Permanent klassradering är en separat superadminåtgärd och får bara tillåtas för en tom arkiverad klass.

## Lärarskapade grupper

En grupp är en separat serverresurs med stabilt ID, namn, en skola, elev-ID:n och lärar-ID:n. Gruppen ändrar aldrig elevens klass eller inloggning och ger aldrig i sig åtkomst till en elev.

- Alla elever måste ha medlemskap på samma valda skola.
- Den som skapar eller ändrar gruppen måste redan få se varje elev.
- Varje delad lärare måste redan få se samtliga elever via sin klass- eller administratörstilldelning.
- Elevflytt och ändrad lärarscope omvaliderar gruppen. En elev eller lärare som inte längre uppfyller åtkomstkravet tas bort från gruppen.
- `GET/POST/PUT/DELETE /api/teacher-groups` använder levande lärarsession och kontrollerar dessa regler på servern.


## Lärar- och administrationsvyer

Lärarvyn har en sidomeny med fyra arbetslägen: **Framsteg** (kunskapsområden och elever), **Uppdrag & tickets** (planera och följ upp), **Statistik & stöd** (felmönster och hjälpbehov) och **Administration** (klasser, elevkort och konton). Klassurvalet ligger kvar ovanför arbetsytan och highscore finns under Administration. Kontonamn och roll visas alltid. Bakgrunden är grön för lärare, orange för skoladmin och lila för superadmin.

Klass- och kontolivscykeln ligger på den separata skyddade sidan `/teacher/admin`. Lärare når elev-, grupp-, kod- och klasslänksverktyg från lärarvyn men kan inte skapa, byta namn på, arkivera eller radera klasser.


## Lärararbetsyta och historisk klasskoppling

Uppdrag, aktivt uppdrag, ticketmallar och ticketutskick lagras per lärarkonto på servern. Vid första öppning slås äldre lokal data ihop med serverdatan efter stabilt objekt-ID och senaste uppdatering och skrivs tillbaka, så att tidigare material inte tappas.

Varje nytt problemresultat innehåller `classIdAtAttempt`. Servern godtar bara ett klass-ID som eleven faktiskt är medlem i. Äldre resultat utan fältet visas med elevens nuvarande/primära klass som uttryckligen infererad attribution (`classIdAtAttemptInferred`); den uppgiften är en uppskattning och får inte behandlas som säker historik.
