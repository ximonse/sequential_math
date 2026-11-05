# E4: avgränsad produktionspilot

Förberedd 2026-11-05 efter Simons ”Kör”. Nästa beslut gäller genomförandet
nedan. Inga material, rapporter, elevsvar eller avstämningar har sparats under
förberedelsen. Ingen utdelning har skett.

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
