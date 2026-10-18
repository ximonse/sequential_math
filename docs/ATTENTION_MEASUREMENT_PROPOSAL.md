# Fokusresultat: pedagogiska uppföljningssignaler

## Mandat 2026-10-18

Simon vill kunna uppmärksamma elever som återkommande skiljer sig tydligt i
svarshastighet eller uthållighet från klasskamrater och åldersförväntan.
Syftet är en pedagogisk heads-up, inte en medicinsk bedömning.
Nedanstående mät- och analysförslag är **inte implementerat eller beslutat**.
Behörighetsbegränsningen i nästa avsnitt är däremot uttryckligen beställd.

## Projektminne: vem får se resultaten?

- Nu: endast det autentiserade huvudadmin-kontot (`super_admin`) får läsa
  elevernas sparade fokusresultat i personalens vyer och profil-API:er.
  Vanliga lärare och skoladmin får inte historiken, heller inte via direktlänk.
- Huvudadmin behåller åtkomsten i den vanliga lärarvyn; valt arbetsläge
  ändrar inte kontots behörighet. Elevens egen återkoppling/sparflöde bevaras.
- Framtida önskemål från Simon: huvudadmin ska kunna ge **uttryckligt utvalda
  lärare** rätt att se resultaten. Ingen sådan tilldelning, implicit skoladminrätt
  eller generell lärarrätt aktiveras nu. En framtida tilldelning behöver
  serverkontroll per konto, återkallelse och befintlig elev-/klassavgränsning.

## Tre separata observationer

1. **Grundhastighet:** typisk reaktionstid för giltiga, korrekta svar när
   eleven förstått regeln. Det är svarshastighet i just uppgiften; motorik,
   skärm och inmatning ingår. Det är inget direkt mått på allmän kognitiv hastighet.
2. **Ojämnhet:** spridning och långsamma svanssvar inom samma moment, inte bara
   passmedian. Två elever med samma median kan ha olika svarsmönster.
3. **Uthållighet:** förändring av tid, ojämnhet, fel och uteblivna svar under
   passet relativt elevens start. En elev kan vara långsam men stabil, eller
   snabb i början och senare få fler långsamma/uteblivna svar.

KONTROLL:s korrekta avstående är inte en miss. MULTI:s regelbyten jämförs
med regelbyten och upprepningar med upprepningar. Svarstid och träffsäkerhet
tolkas tillsammans: snabbt chansande ska inte se ut som god prestation.

## Separera uppvärmning från standardiserad observation

Nuvarande tvåminuterspass har få signaler, ökande väntetider och frivilliga
omstarter. Det ger användbara observationer men otillräcklig grund för
åldersnormer eller ett precist mått på maximal uthållighet. Ändrade väntetider
och tid i uppgiften är sammanblandade. Omstarten efter fem sekunder gör också
att en analys av endast fullföljda pass kan missa just de korta försöken.

Jag föreslår ett separat mätupplägg, med tydlig förklaring, utan att ändra
den frivilliga uppvärmningen: lika instruktioner, förståelsekontroll före
start, samma enhet/inmatning, samma uppgiftsversion och en väntetidsfördelning
som är oförändrad genom hela passet. Pilotera passlängd och signaltäthet så
att flera tidsdelar faktiskt har tillräckligt med jämförbara svar. Ett
femminutersupplägg är en möjlig start för provning, inte en validerad längd
för vår app. Kontrollera också om provningen är rimlig i klassrummet.

Markera tekniska störningar och särskilj första tillvänjning från senare
pass. Flera pass på skilda dagar krävs innan en uppföljningssignal ges;
tre till fem dagar är ett pilotförslag, inte en forskningsfastställd gräns.
Registrera nödvändig grupp-/årskurs- och protokollinformation vid passet så
att senare klass- eller årskursbyte inte skriver om jämförelsens betydelse.

## Jämförelse och osäkerhet

Visa två tydligt åtskilda referenser: samma klass och en större referens
med motsvarande ålder/årskurs, protokoll, tillvänjning och enhet/inmatning.
Hela lärarens blandade elevunderlag är inte automatiskt en åldersreferens.
Eleven räknas bort från sin egen jämförelse. Låt elever och dagar väga
rimligt lika så att många pass inte gör en elev dominerande i referensen.

Utgå från robusta fördelningar för svarstid, inte ett antagande om symmetriska
normalfördelade millisekunder. Skatta variation mellan elever, mellan dagar
och inom pass, och visa osäkerhet för elevens placering. Ett intervall kring
klassens **medelvärde** är inte en gräns för vad en enskild elev rimligen kan
prestera; jämförelsen behöver en referens-/prediktionsfördelning för individer.

Uppföljningssignal bör kräva både en praktiskt stor skillnad och ett
återkommande mönster som ligger utanför en generös referenszon, med tillräckligt
elev- och referensunderlag. Kalibrera reglerna mot oberoende senare pass:
hur många flaggas, hur ofta upprepas signalen, och hur ofta försvinner den?
Hantera att flera mått prövas samtidigt så att fler diagram inte automatiskt
ger fler varningar. Gränserna ska frysas/versioneras efter utprövning.

Uteblivet svar efter fem sekunder är inte en uppmätt femsekundersreaktion.
Bevara det som ett uteblivet svar och ett avbrutet tidsförlopp, separat från
manuellt avslut. Behåll alla försök i uthållighetsunderlaget; presentera
fullföljande och giltiga svar före avbrott separat, inte som noll eller som
osynligt bortfall. Paus-/avbrottstid visar vad som observerats, inte orsaken.

Utan en referens som är prövad för detta upplägg ska vyn säga **lokal
jämförelse**, inte **under åldersförväntan**. Låna inte millisekundgränser
eller normtabeller från ett annat test. Nuvarande färgregler är preliminära
produktheuristiker; detta förslag gör dem inte till åldersnormer.

## Visning

Behåll den täta gruppmatrisen men med separata kolumner för svarshastighet,
ojämnhet och förändring under passet. Underlag saknas visas vitt/grått.
Orange kan betyda återkommande möjlig avvikelse; rött bör kräva starkare
upprepat underlag, aldrig bara den långsammaste eleven i varje klass.
Inget sammanvägt fokusbetyg eller tvång att färgsätta någon röd.

För individen: visa den egna kurvan genom passet ovanpå en jämförelsezon,
plus en enkel tvåaxelbild för grundhastighet och försämring under passet.
Läraren ska kunna se skillnaden mellan ”långsammare men jämnt” och
”typisk start, tydligt fler långsamma/uteblivna svar senare”. Skriv ungefärliga
tidsintervall när underlaget räcker, inte en tvärsäker koncentrationsgräns
vid en viss sekund. Föreslagen handling är ny observation och samtal om
arbetssituationen, inte en slutsats om elevens förmåga eller orsak.

## Forskningsunderlag läst 2026-10-18

- [Wilson et al. 2010: femminuters-PVT i klassrum](https://pubmed.ncbi.nlm.nih.gov/20805597/).
  I det undersökta urvalet hade genomsnittlig svarstid högre återteststabilitet
  än antalet långsamma svar. Urval och test skiljer sig från vår app; studien
  ger ingen norm för våra elever eller vårt tvåminutersprotokoll.
- [Quantifying attention span across the lifespan, 2023](https://www.frontiersin.org/journals/cognition/articles/10.3389/fcogn.2023.1207428/full).
  Skiljer tidsstruktur från vanliga hastighets-/variabilitetsmått. Författarna
  framhåller att uppgiftslängd, svårighet och svarsfrekvens påverkar tolkningen;
  deras mått är inte en validering av vår färgmodell.
- [Reliability concerns in repeated computerized assessment of attention in children](https://pmc.ncbi.nlm.nih.gov/articles/PMC2899676/).
  Visar betydande normal variation även i ett etablerat test. Motiverar
  upprepade observationer, lokalt undersökt stabilitet och återhållsam tolkning
  av skillnader över tid; dess kliniska gränser överförs inte till appen.
