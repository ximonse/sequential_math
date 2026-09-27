# Tabellträning: ett sammanhängande lärarflöde

## Leverans och gräns

Läraren väljer klass/grupp, tabell och period, ser elevernas träning och
jämför en elev med övriga i samma urval. Samma underlag används för
periodjämförelse, daglig utveckling och export. Detta är den första
avgränsade leveransen enligt PRODUCT_CONTRACT M2/P3–P8 och F6.

I Framsteg visas nivåöversikten först och tabellutvecklingen sist. Varje
analysmodul kan minimeras och öppnas igen; valet sparas lokalt i webbläsaren.
Elevlistan i tabellutvecklingen kan sorteras på varje rubrik. Sorteringen
ändrar bara visningsordningen, inte beräkningarna eller CSV-exporten.

Progressionsregler, elevens tabellgenerator, uppdrag och nivåbedömning i
addition/subtraktion/multiplikation/division ändras inte i denna leverans.

## Definitioner

- Endast identifierbar tabellträning räknas. Vanlig multiplikation blandas
  inte in. Tabellträning förblir separat från generell multiplikationsmastery.
- Perioden är de senaste 7 eller 14 kalenderdagarna i Europe/Stockholm,
  inklusive dagens registrerade svar. Föregående lika långa period visas
  separat. Idag är ännu inte ett helt dygn.
- Antal svar, antal rätt, andel rätt och median för korrekta, ostörda
  svarstider är olika mått. Tid är inte ett villkor för progression.
- Gruppens andel rätt är antal rätt / antal svar. Varje svar väger lika.
  Vald elev utesluts ur jämförelsegruppen. Antal deltagande elever visas.
- Färre än sex svar markeras som litet underlag. Inga svar ger okänd
  rättandel, aldrig noll procent. Faktortäckning visar vilka av 1–10 som
  faktiskt tränats; olika urval kan fortfarande påverka jämförelsen.
- Serverns sammanfattning beräknas från sparad historik, inte lärarlistans
  senaste 250 svar. Lagringstak, saknad eller ogiltig historik markeras.
  Frånvaro av registrerade svar i begränsat underlag bevisar inte inaktivitet.
- Förändrad rättandel/svarstid beskrivs som resultat över tid, inte som
  automatiskt konstaterad kunskapsutveckling.

## Acceptans före avslut

1. En robot visar först att gamla vyn tappar tabellsvar utanför recentProblems.
2. Den nya vyn visar kända mängder/rättandelar även när mer än 250 senare
   svar finns, håller klasser isär och utesluter vald elev från jämförelsen.
3. Elev, grupp, tidigare period, dagsrader och export stämmer med fixturen.
4. Enhetstester täcker Stockholm/DST, små urval, avbrott och begränsad historik.
5. Test, build och klickrobotar körs. De befintliga träningsrobotarna skyddar
   tabellval och progression i de fyra räknesätten.
6. Den verkliga lokala lärarvyn granskas visuellt och lämnas till Simon.

## Verifiering 2026-09-27

- En regression med 20 svar i tabell 7 och 251 senare svar i tabell 8 var röd
  i den gamla lärarvyn och grön i den nya. Den kontrollerar även ett annat
  klassurval, elev mot övriga, dagssiffror, CSV och sparat tabell-/periodval.
- 95 testfiler och 476 tester passerade. Produktionsbygget och ESLint för
  ändrade källfiler passerade. Den riktade robotkörningen för tabeller och
  lärarvy passerade, 9 av 9. Hela robotsviten passerade vid omkörning,
  45 av 45 utan regelbrott.
- Skärmbilden från en syntetisk klass granskades visuellt i faktisk
  webbläsare. Den visar elev, övriga, dagens rader och de separata måtten.

Kvarstående gräns: ett robotfall med 40 felaktiga svar i subtraktion fick
18 unika uppgifter, under robotgränsen 20. Tre omkörningar passerade. Detta
är variation i det befintliga träningsflödet och behöver en separat
undersökning med fler elevsekvenser innan en regeländring görs.

Nuvarande återhämtningsregel i `src/lib/currentNeed.js` går ned en nivå
efter tre på varandra följande fel i samma räknesätt och återgår efter två
korrekta svar. Ett nästa avgränsat steg är att pröva med robotfall om
eleven först kan få varierade uppgifter på samma nivå, så att enstaka fel
inte leder till en lång sekvens alltför lätta uppgifter. Ingen sådan
regeländring ingår här.

Endast lokala syntetiska data användes. Ingen publicering har gjorts.
