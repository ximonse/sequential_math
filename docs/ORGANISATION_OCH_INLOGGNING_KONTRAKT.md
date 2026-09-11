# Organisations- och inloggningskontrakt

Detta dokument är den auktoritativa specifikationen för skolor, klasser, roller och inloggning. Koden och de körbara testerna är facit för exakt API-beteende. Ändra detta dokument i samma ändring som du ändrar något inom organisation eller inloggning.

## Identiteter och relationer

| Objekt | Stabil identitet | Regler |
| --- | --- | --- |
| Skola | `school.id` | Skapas av administratör. Namnet är visningstext. |
| Klass | `class.id` | Består när klassnamnet ändras. Klassen har exakt en skola och ett eller flera läraransvar. |
| Lärare | `teacher.id` | Har tilldelade skolor (`schoolIds`) och klasser (`classIds`). Klassens `teacherIds` är den direkta åtkomstgränsen. |
| Elev | `studentId` | Behålls vid klassnamnsbyte och innehåller träningshistorik. Elevens klassmedlemskap är serverlagrad data. |

En klass måste höra till en befintlig skola. Klassnamn är unika per skola efter normalisering av blanksteg och stora/små bokstäver. Samma namn kan därför användas på olika skolor. Ett elevnamn är unikt på samma sätt inom sin klass, men behöver inte vara globalt unikt.

## Roller och behörighet

Konton har exakt en explicit roll. Serverns aktuella kontopost är auktoritativ; en token innehåller aldrig den behörighet som används efter inloggning.

- **teacher** arbetar i sina direkt tilldelade klasser.
- **school_admin** arbetar inom sina tilldelade skolor men får aldrig global åtkomst genom att rollen inte är `teacher`.
- **super_admin** hanterar skolor och globala roller.

Ändrad roll, skoltilldelning eller klasstilldelning höjer `sessionVersion` och gör tidigare sessioner ogiltiga.

| Åtgärd | Administratör | Lärare | Elev |
| --- | --- | --- | --- |
| Skapa skola | Ja | Nej | Nej |
| Tilldela lärare till skola | Ja | Nej | Nej |
| Skapa klass | Ja | Endast på tilldelad skola | Nej |
| Tilldela ansvarig lärare till klass | Ja | Nej | Nej |
| Se och ändra en klass | Alla | Endast klasser där läraren är ansvarig | Nej |
| Skapa elev, dela elevlänk och ändra elevkod | Ja, för tilldelad klass | Ja, för tilldelad klass | Nej |
| Välja skola eller klass | Ja, i administrationen | Endast inom behörighet | Nej |

Servern kontrollerar behörighet på varje skyddat API-anrop. Dolda knappar i gränssnittet räcker aldrig som behörighetskontroll.

## Lärar- och administratörsinloggning

Varje lärarkonto har användarnamn, lösenord, roll, tilldelade skolor och klasser. Lösenord lagras som hash med salt. Inloggning i `POST /api/teacher-login` utfärdar en signerad session. Sessionen verifieras mot ett aktivt konto och dess `sessionVersion`, så lösenords-, roll- och direkta klasstilldelningsändringar gör äldre sessioner ogiltiga.

Administratörer använder samma kontomodell, med administratörsrollen aktiverad. Råa lösenordsheaders och kontolösa sessioner godtas inte.
Äldre konton med enbart `isAdmin` behöver migreras uttryckligen innan de används för skoladministration. Migreringen väljer exakt ett användarnamn som `super_admin`, sätter övriga äldre administratörer till `school_admin` och blockerar oskopade skoladministratörer tills de har en skoltilldelning. Den körs aldrig automatiskt mot produktion.


## Elevinloggning

1. Läraren eller administratören skapar elev i sin tilldelade klass. Systemet ger varje ny elev en personlig fyrsiffrig kod.
2. Läraren delar klassens slumpmässiga elevlänk eller QR-kod.
3. Länken visar endast klassnamnet. Eleven skriver sitt namn och sin fyrsiffriga kod.
4. `POST /api/student-login` söker endast i klassens serverlagrade medlemskap och utfärdar därefter en sessionsnyckel.

Eleven kan aldrig bläddra bland eller välja skolor och klasser. Det finns ingen publik katalog över skolor, klasser eller elevnamn. Vid fel kod räknas misslyckade försök på elevens profil; läraren kan se signalen och sätta en ny kod. En vanlig session gäller i 12 timmar. Med **Kom ihåg mig på den här enheten** gäller den i upp till 30 dagar.

## Klasslänk och årsskifte

Klasslänken bygger på en slumpad nyckel som hör till klassens stabila ID. Att byta namn, exempelvis `4B` till `5B`, ändrar därför inte elevernas ID, historik, klasslänk eller inställningar.

Vid nytt läsår väljer skoladmin avgångsårskurs och avgångsår. Verktyget föreslår namnbyte för lägre årskurser och arkivering av avgångsklasser. Varje förslag kan redigeras eller hoppas över. Appliceringen kontrollerar hela skolans klassrevisioner och skriver alla valda ändringar i en enda atomisk Redis-operation; en samtidig ändring eller namnkonflikt stoppar hela årsbytet. Klasser utan tydligt årskurstal ändras manuellt.

## API-gränser och körbar verifiering

- `GET/POST /api/teacher-schools`: listar skolor inom lärarens tilldelning; endast administratörer kan skapa.
- `/api/admin/teachers` och `/api/admin/classes`: administratörsgränser för konton, skoltilldelning och klassansvar.
- `/api/teacher-classes` och `/api/student-roster`: kräver levande lärarbehörighet samt rätt skola och klass.
- `/api/student-login`: kräver giltig klasslänk, exakt ett matchande elevnamn i klassen och fyrsiffrig kod.

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
