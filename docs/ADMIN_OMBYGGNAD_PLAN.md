# Plan: dela ut och administration

Beställd av Simon 2026-10-22 efter UX-granskning (kod + skärmbilder).
Ordning: fas 3, fas 1, fas 2, fas 4. Varje fas: robotar, skärmbilder dator
och iPad, lokal commit, push först på Simons "pusha". Följ designgrunden
(kompakta kontroller, tydlig ordning, inga automatiska omdesigner utanför
fasen).

## Fas 3: Dela ut (först)

Mål: ett sätt att välja mottagare och en samlad bild av vad som är aktivt.

1. Klart: uppdrag till enskilda elever. Måltyp `student` i
   `PUT /api/teacher-class-assignment`, lagrat som `activeAssignments` på
   elevposten via `mutateStudentRecord`. Elevens synk lägger bara på händelser
   och den äldre profilvägen räknar fältet som serverägt. Läraren måste ha
   åtkomst till eleven. `/api/me/assignments` läser även elevens egna.
2. Gemensam mottagarväljare i lärarvyn: klasser, grupper och sökbara elever.
   Används av uppdrag, tickets och screening i stället för tre olika väljare.
3. Screening från samma val: hela klasser eller valda elever; elever i flera
   klasser ger en utdelning per klass (servern kräver en klass per screening).
4. Översikt "Aktivt för valda mottagare": uppdrag, aktiv ticket och
   screeningar.

## Fas 1: En enda Administration

- Ta bort `/teacher/admin` och sidhuvudsknappen "Administration"; gamla länkar
  leder till fliken i lärarvyn.
- Flytta ut: rutan "Lärarkonton" (bara text), pausspelets highscore (till
  Statistik), räknehäftesprototypen (länk under Screening).
- Klasser utan skola: öppen fråga till Simon (visa dem, eller kolla först om
  de finns i produktion).
- Öppen fråga: ska vanliga lärare kunna hantera sina egna klasser (namn,
  arkivering) eller bara lägga till och flytta elever som i dag?
- Ta bort döda props i `ClassManagementPanel`-anropet.

## Fas 2: Klasser och elever

Lista med klasser och grupper. En klass öppnas med flikarna Elever,
Inloggning och kort, Inställningar, Farliga åtgärder (avskilda, sist).
Grupper använder samma mönster. Lärare och skolor i egen sektion för admin.
Inmatning före knapp. Gemensamma ord; inga interna id:n i vyn.

## Fas 4: Putsning

Screening-menyn färgad bara när den är vald. Kompaktare meny på iPad.
Inställningar före knapparna under Uppdrag. Kortare startsida (Framsteg).

## Arbetsfördelning

Server, behörigheter, komponentstruktur och granskning: Claude (huvudsession).
Avgränsade gränssnittsdelar: billig arbetsmodell med tydlig specifikation och
robotkriterier; granskas och robotkörs före commit. Kom ihåg: importer som
servern når ska ha `.js`, och kontrollera med importkedjeskriptet.
