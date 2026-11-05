# E4: avgränsad produktionspilot

Förberedd 2026-11-05 efter Simons ”Kör”. Simon godkände genomförandet genom
”godkänt”. Det tekniska produktionsprovet är genomfört: källa, rapport,
kontraster, simulerad undervisningsnotering, ny kontroll, kontrollobservation
och senare kontroll är sparade, inlämnade och återlästa. Alla skrivningar
gäller den enda godkända testprofilen. Kontrollerna kördes samma kväll;
fördröjd retention och fysisk iPad ingår inte i klartbeskedet.

## Syfte och mottagare

Pröva överlämningarna i den publicerade lärarkedjan för decimaladdition:
källsvar → alternativa förklaringar → kontraster → undervisningsnotering →
ny kontroll → senare kontroll. Detta är ett tekniskt scenario med konstruerade
svar och simulerad undervisning, inte ett blindtest, elevdiagnos eller belägg
för undervisningseffekt.

Föreslagen mottagare är en enda befintlig testprofil i **Test – felmönster**.
Projektkartans tidigare valideringsbelägg beskriver klassens åtta egna profiler.
Aktuell klass, enskild mottagare och lärarkontot adminperson har återlästs;
exakt mottagarbindning hålls i privat körunderlag utanför Git.
Ingen annan klass eller elev ingår. Befintlig testhistorik ska bevaras.

## Konkreta steg efter godkännande

| Steg | Fråga eller handling | Konstruerat svar / förväntat resultat |
|---|---|---|
| 1. Startunderlag | En separat screening med `decimal-add-source`: 3,48 + 2,67 | Ange 6,05. Facit 6,15. Kandidaten en tappad minnessiffra får prövas; alla tappade ger 5,05. |
| 2. Rapport | Öppna testprofilens Analys och avstämning, välj screening och spara aktuell rapportversion | Rätt källa och hypotes binds till rapporten; inget diagnosbesked. |
| 3. Kontraster | Skapa, granska och dela ut de två kontrastfrågorna genom befintlig materialvy | 1,76 + 2,58: ange 4,24 (facit 4,34). 4,67 + 1,85: ange 5,52 (facit 6,52). |
| 4. Frysta alternativ | Läs materialets prövningsavsikt och resultat | En tappad: [4,24; 3,34] respektive [6,42; 5,52]. Alla tappade: 3,24 respektive 5,42. Båda positionerna måste bevaras. |
| 5. Simulerad undervisning | Läs bemötandet med 2,68 + 1,57 = 4,25 och spara undervisningsnotering | Text ska börja ”SIMULERAD TESTNOTERING:”. Hjälp anges given. Kontrollera förklaringen av 15 hundradelar och 12 tiondelar. |
| 6. Ny kontroll | Skapa, granska och dela ut `decimal-add-independent_check`: 3,86 + 2,47 | Ange 6,330. Bedöms som rätt (6,33). Spara uttrycklig simulerad kontrollobservation med ingen hjälp enligt läraren. |
| 7. Senare kontroll | Skapa, granska och dela ut `decimal-add-later_check`: 1,78 + 3,66 | Ange 4,44. Facit 5,44. Resultatet får öppna ny lärarfråga, inte automatiskt fastslå återfall. |
| 8. Återläsning | Ladda om rapport, avstämningar och utdelningskvitton | Rätt elev, version, hypotes, hjälp och historik finns kvar. Vanlig mastery och träningslogg är oförändrade. |

Steg 7 körs vid ett separat testtillfälle. Om båda kontroller körs samma dag
verifieras endast appens senare-kontrollväg; ingen fördröjd retention påstås.
Det negativa exemplet 2,13 + 3,24 = 5,37 granskas i bemötandet: rätt svar där
kan inte skilja de två minnessiffermodellerna och ska inte räknas som motbevis.

Varje material granskas i sin aktuella version med exakt en mottagare före
utdelning. Den skrivfria samlingspreviewen nedan får **inte** delas ut som ett
sjufrågepaket: då skulle framtida kontrolluppgifter redan vara mötta.
Nya kontroller måste godkännas av serverns historik-/nyhetskontroll. Om de
redan är mötta stoppas försöket; historik rensas inte och spärrar kringgås inte.

## Klart när

- Hela kedjan har återlästa kvitton och versionsbundna överlämningar i produktion.
- Frågevisning, sparat svar och inlämning är åtskilda; rätt svar blir inte ett
  automatiskt påstående om metod eller självständighet.
- Alla alternativa modellsvar visas korrekt och simulerade noteringar är märkta.
- Ingen annan profil har påverkats och vanlig progression är oförändrad.
- Avvikelser dokumenteras med reproduktion; tekniskt fel rättas innan nästa steg.

Ingen automatisk radering eller återställning ingår. Testmaterial och märkta
noteringar behålls som spårbar historik. Eventuell städning blir ett eget beslut.
Fysisk iPad och verklig undervisningsutvärdering är separata prov.

## Faktiskt verifierat under förberedelsen

Aktuella capabilities ger `materialPreview=true`, rätt kontobindning och
`assignmentPublication=false` i MCP. Produktionens skrivfria materialpreview
accepterade sju uppgifter/version 1 med facit 6,15; 4,34; 6,52; 4,25; 6,33;
5,44; 5,37. Kvittot gav `saved:false`, `assigned:false`,
`approval:not_requested`. Exakt previewrevision finns i privat körunderlag;
den binder endast denna osparade preview, inte kommande rapport eller utdelning.

Den fulla lokala förebilden är `robots/didactic-addition.robot.js`; senaste
publiceringsbelägg finns i `releases/2026-11-05-decimal-addition.md`.
Produktionens lärar-/elevinloggning i webbläsare och hela skrivkedjan är ännu
inte verifierade under denna förberedelse. MCP stöder inte godkännande,
utdelning eller läraravstämningar; dessa steg ska ske genom betrodd inloggning
och befintligt granskningsflöde. Ingen alternativ endpoint ska kringgå det.

## Första åtkomstförsöket efter godkännandet — historik

- Aktuella MCP-capabilities bekräftar fortsatt pilotägaren adminperson och
  samma uttryckliga kontobindning. Godkännandet av testupplägget behöver inte
  begäras igen.
- In-app-anslutningen nekas med saknad betrodd native bridge. Chromes
  flikanslutning kan skapa tomma flikar men navigation/åtkomst misslyckas med
  ett internt timeoutMs-fel. Native styrning når en separat matteflik, men
  elementklick misslyckas med saknad koordinatgeometri.
- Tillgänglighetsinformationen visar lärarvyn inloggad som **Adminsimon**,
  huvudadmin, medan MCP uppger **adminperson**, school_admin. Samma ägare är
  därmed inte verifierad. Inga privata pilotutkast skapas under fel konto.
- Helbild av Chrome avvisades av automatisk säkerhetsgranskning eftersom
  andra privata flik-/kontouppgifter kan exponeras. Ingen bild togs; fortsatta
  observationer använde tillgänglighetsinformation.
- Skrivfri läsning av just testprofilens screeninghistorik för 2026-11-05 gav
  noll poster i perioden, tolv indexerade försök och okänd indexfullständighet.
  Detta bevisar inte att kontrollfrågorna är omötta. Bredare läsning begränsades
  av svarsstorlek; nyhetskontrollen är ännu inte passerad.
- Nästa åtgärd: återställ fungerande, isolerad webbläsaråtkomst på rätt
  lärarkonto och fortsätt från steg 1. Ingen alternativ endpoint, ändrad
  säkerhetspolicy eller ny utdelning har använts för att kringgå hindret.

## Återupptaget produktionsprov 2026-11-05

Kontot adminperson/Skoladministratör verifierades i Simons separata fönster.
Vanlig flikstyrning gav fortfarande timeoutMs-fel och native klick saknade
koordinatgeometri; den särskilda Chrome DevTools-anslutningen fungerade.
Läraren loggades in normalt där, och eleven i en separat isolerad session
med testklassens befintliga lokalt sparade elevkort. Inga autentiseringsuppgifter
ändrades och inga nya behörigheter tilldelades.

- Produktionsdomänen laddar `index-B11X6ayv.js`, samma ingång som i
  additionspaketets publiceringskvitto.
- Startmaterial v1 sparat, öppnat i rätt lärarvy, granskat, godkänt och utdelat.
  Kvittot bekräftar exakt en av en mottagare. Endast källfrågan ingår.
- Källsvaret 6,05 inmatat med appens numeriska knappar, sparat och inlämnat.
  Rapportversion 1 för screening 2–5 november visar en felobservation och
  kandidaten en av två minnessiffror tappad, med otillräckligt underlag.
- Rapport sparad och kontrastmaterial skapat genom dess ordinarie överlämning.
  Granskat/godkänt material v1 kvitterat till en av en mottagare. Inlämnade
  svar 4,24 och 5,52 visas i lärarresultatet som förenliga med samma kandidat.
  Serverns sparade prövningsavsikt återläst skrivfritt: V9,
  `one_carry_forgotten`, rival `carry_forget`, inga olösta par, exakta arrayer
  [4,24; 3,34]/[3,24] och [6,42; 5,52]/[5,42].
- Bemötandet, negativa fallet och beroende kedjans överlapp granskade i verklig
  render. Undervisningsavstämning 1 sparad och återläst, märkt SIMULERAD
  TESTNOTERING, med hjälpstatus given och datum 2026-11-05.
- Ny kontroll passerar serverns historikkontroll och binder rätt källa,
  rapport och undervisningsavstämning 1. Den granskas/godkänns och kvitteras
  till en av en mottagare. 6,330 inmatat med tangentbord, sparat och inlämnat;
  lärarresultatet visar rätt, facit 6,33, utan automatisk förståelsediagnos.
- Kontrollavstämning 2 sparad och återläst, separat SIMULERAD TESTNOTERING,
  hjälp none_reported. Ursprunglig undervisningsnotering bevarad.
- Profilens masteryFacts och problemLog jämförda med SHA256 före första
  testsvar, efter källa, efter kontraster och efter första kontrollen.
  Båda hashvärdena identiska genom alla dessa steg; träningsloggen har 35 poster.
- Inmatningsverktygets fill av anteckningsfältet gav först tom text i
  sparandet. Riktig tangentbordsinmatning och återläsning före sparande fungerade.
  Detta är inte ett belagt fel vid vanlig elev-/lärarinmatning.
- Serverstegen är långsamma. Browser Performance API visar ett avslutat
  `/api/teacher-material`-anrop på 50 484 ms. Kontrastskapandet stod också länge
  i vänteläge men slutfördes utan omförsök. Ingen timeout eller dubblering
  kringgicks. Väntetidernas orsak är ännu inte profilerad.

Senare kontroll passerade därefter historik-/nyhetskontrollen. Den sparade
versionen bevarar undervisningsavstämning 1 och kontrollavstämning 2,
respektive datum och hjälpstatus. Aktuellt innehåll och exakt en mottagare
granskades och godkändes i ordinarie vy; utdelningen kvitterades 1 av 1.
Svaret 4,44 på 1,78 + 3,66 sparades, lämnades in och återlästes i lärarresultatet
mot facit 5,44. Resultatet visar modellträff och Behöver undersökas, utan
automatiskt återfallsbesked. Båda tidigare avstämningarna finns kvar efter
omladdning och uttrycklig läsning av senaste avstämning.

Slutlig SHA256-jämförelse efter samtliga fem inlämnade testsvar visar exakt
samma masteryFacts och problemLog som före första testsvar. Träningsloggen
har fortfarande 35 poster. Fyra material v1 har kvitterats till exakt en
mottagare vardera; ingen vanlig träning eller uppgift till annan profil ingick.

Detta slutför **det tekniska produktionsprovet**. Steget senare kontroll
provades som ett nytt material och testtillfälle samma kväll. En verkligt
fördröjd uppföljning, elevmetod, undervisningseffekt och fysisk iPad är fortsatt
oprövade. Ingen appkod, säkerhetspolicy eller produktionsdeploy ändrades.

Rekommenderad uppföljning är att profilera de långa serverstegen innan fler
innehållspaket läggs till. Väntetider är observerade; flaskhalsens orsak och
en lösning är ännu inte verifierade. Ingen prestandaändring ingår i detta prov.
Privata material-/rapport-ID:n, hashkvitto och lokala bilder hålls utanför Git.

```mermaid
flowchart TD
    A[Simon godkänner detta testupplägg] --> B[En testprofil: källfråga och konstruerat felsvar]
    B --> C[Spara rapport och granska två kontrastfrågor]
    C --> D[Dela ut till exakt testprofil och ange konstruerade svar]
    D --> E[Granska alternativa förklaringar]
    E --> F[Spara märkt simulerad undervisningsnotering]
    F --> G[Granska ny kontroll och svara rätt]
    G --> H[Spara märkt kontrollobservation och uppgift om hjälp]
    H --> I[Separat testtillfälle: senare kontroll med felsvar]
    I --> J[Återläs läraruppföljning och kontrollera oförändrad progression]
```
