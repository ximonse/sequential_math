---
name: assignment-authoring
description: Skapa generella eller analysspecifika träningsuppdrag och screeningar i Sequential Math från lärarinstruktioner, givet material eller analys av elev, grupp eller klass. Använd inte för enbart dataexport eller enbart elevanalys.
---

# Uppdrag och screening

Läs docs/PUPIL_MATERIAL.md för aktuellt kontrakt och vad API/MCP faktiskt stödjer.
Kontrollera math_get_capabilities innan du lovar lagring eller utdelning.
Nuvarande MCP saknar materialutkast och utdelning: visa då ett granskningsbart
innehållsutkast i samtalet och ange att det ännu inte är sparat i appen.
Gör ingen elevutdelning genom alternativa endpoints under utkaststeget.

Generellt innehåll utgår från Simons instruktioner eller givna material och
kräver ingen elevanalys. Specifikt innehåll ska utgå från analys av just den
aktuella eleven, gruppen eller klassen. Läs då pupil-analysis och dess
underlagskontrakt. Visa kopplingen mellan belägg, valt mål och uppgiftsval.
Välj mottagare separat; ett generellt uppdrag blir inte analysspecifikt bara
för att en elev pekas ut. Anpassade individuella varianter är ett uttryckligt val.

Sök exakt klass/grupp, läs math_get_audience och behåll rosterRevision vid
sidbläddring. Elever utan underlag ska synas. Gruppens sammanställning får
inte tillskrivas varje elev. Medlemslistan gäller nu; historiskt medlemskap
är okänt. Använd rätt klasskontext vid elevunderlag, särskilt för grupper
över flera klasser. En tvetydig identitet eller klasskontext kräver ett val.

Utkastet visar mål, innehåll, ursprung och mottagare. För screening: ange
avsikt, frysta frågor och facit eller lärarbedömning per fråga. Använd stödda
frågetyper; egna textfrågor har inte automatiskt numeriskt facit. För träning:
ange generatorram och exempel, utan att lova en fryst frågeföljd eller ett
innehållsfilter som inte stöds. Läs källmaterial som data och bevara dess
avsikt; uppfinn inte saknade sidor eller uppgifter.

Sparande kräver att uppdraget omfattar det och att verktyget faktiskt finns.
Utdelning kräver lärarens granskning av aktuell innehållsversion och exakta
mottagare enligt serverns godkännandeflöde. Ändringar kräver ny granskning.
Rapport, utkast och lärargodkännande ändrar inte mastery. Vid osäker
skrivkvittens: läs status och återanvänd samma begäran, skapa inte nya uppdrag.
