# Fokusarkiv, dagsform och veckomönster

Beställt av Simon 2026-10-18. Byggt lokalt; separat publiceringsbeslut krävs.
Detta ersätter äldre uppgifter om 500 pass som historikgräns och om enbart
slumpad väntan mellan 3 och 20 sekunder. Matematiklagring/mastery ändras inte.

## Aktiviteter och protokoll

FOKUS och KONTROLL använder samma rikttider varje pass: 6 sekunder under
första 40 aktiva sekunderna, 10 under nästa 40 och 15 under sista 40.
Varje väntan får oberoende likformig variation ±2 sekunder: 4–8, 8–12 och
13–17 sekunder. Steget bestäms när väntan börjar. Avbrott genom dold flik
kräver Fortsätt och en ny väntan i aktuellt steg. Introduktionens tre signaler,
KONTROLL:s garanterade stoppsignaler, 5/2 sekunders svarsfönster, prickstorlek,
tryckyta och dubbeltrycksskydd bevaras. MULTI:s regler/tider ändras inte.

Nya resultat använder dataschema 3 och en fryst protokollkopia:

- `focus-targets-1`: FOKUS med rikttider och femsekundersavbrott.
- `control-targets-1`: KONTROLL med rikttider, tvåsekundersfönster och 70/15/15.
- `multi-rules-1`: form/antal, fyrasekundersfönster och 1,8 sekunders felpåminnelse.

Definitionerna ligger i `src/lib/attentionProtocols.js`. Ändrat mätbeteende
kräver ett **nytt protokoll-ID**, även om dataschemat är oförändrat. SHA256-test
låser dessa definitioner; skriv inte om gammal definition/testhash för att
slippa versionsbytet. Ett nytt läge måste få egen definition och validering.
Enbart kosmetiska ändringar kräver inte nytt mätprotokoll.

`trials` behåller aktiva signaltider, svarstider, signaltyp och utfall.
`stimuli` anger motsvarande faktiska färg/form/väntetid eller MULTI-figur,
antal, regel och trycksida. `events` sparar start, visade signaler (även om de
senare kasseras), för tidiga tryck, paus, återkomst och avslut. Aktiv passtid
och monoton tid sedan start inklusive dold tid skiljs åt. Reaktionstid mäts
från modellens signalvisning med `performance.now()`; skärm/inmatningslatens
ingår och har inte kalibrerats bort. Ignorerade dubbeltryck är inte mätvärden.

## Beständighet och återförsök

`attention_pass:STUDENT:PASS` lagrar varje försök separat i befintlig KV,
utan TTL, antal- eller åldersrensning. `attention_passes:STUDENT` är indexet.
Profilens 500 senaste slutresultat är en cache, inte hela arkivet.
Första nya fokushändelsen eller huvudadmins första arkivhämtning migrerar
befintlig cache innan något får trängas ut, även för en elev som inte gör fler pass.
Migreringen sker i små transaktioner; markören sätts först när alla lyckats.
Tidigare data som eventuellt redan trängts ut av äldre kod kan inte återskapas.

En sparpunkt köas krypterat vid start, färdig signal, nytt visat stimulus,
tidigt tryck och paus/återkomst. Den skriver bara händelsekön och kan inte
skriva över en matematikprofil. Sparpunkter innehåller samtliga hittills
insamlade mätvärden, inte bara senaste svaret. Ett försök som lämnas utan
slutresultat visas som **Ej avslutat · senast sparat**. Skrivning som ännu
inte hunnit slutföras på enheten vid en abrupt webbläsarkrasch kan inte
garanteras; redan köad data skickas vid återanslutning/inloggning.

Servern kvitterar först efter att arkivet skrivits. Pass-ID gör slutresultat
oföränderliga; revisionsnummer hindrar en sen sparpunkt från att ersätta
nyare data eller ett slutresultat. Ett fel lämnar elevens krypterade händelse
okvitterad för återförsök. Live-profil och raderingsmarkörer kontrolleras
atomärt vid arkivskrivning. Avsiktlig elevradering tar även bort arkivet.
Avsiktlig anonymisering bevarar mätvärden/protokoll utan pass-ID och datum.

## Huvudadmins vyer

Endast livekontot `super_admin` får läsa `/api/teacher-attention`, även när
huvudadmin använder vanlig lärarvy. Övrig personal får 403. Elevens egen
återkoppling bevaras. Framtida uttrycklig tilldelning till utvalda lärare
förblir projektminne och är inte aktiverad.

- **Dagsform:** senaste försöket idag per aktivitet, även om det inte fullföljts.
  Nivåmatris visar svarshastighet/uthållighet i FOKUS, kontroll i KONTROLL och
  regelväxling i MULTI. Fyrfältaren använder vald aktivitet, svarshastighet och
  uthållighet eller kontroll/regelväxling. Små enfärgade punkter; en liten
  förskjutning skiljer överlappande elever. Elevlista/tangentbord ger individåtkomst.
- Växla mellan **klasskamrater** och **egna tidigare** under de föregående
  21 dygnen. Idag utesluts. Klassreferens använder aktuell klassmedlemskap,
  aldrig hela huvudadmins blandade elevunderlag och aldrig eleven själv.
  Minst åtta andra elever med tre mätdagar behövs; varje elev väger lika.
  Egen referens kräver tre tidigare mätdagar; varje dag väger lika.
  Hela klassunderlaget ska vara hämtat utan fel innan klassjämförelse visas.
- **Veckomönster:** individens måndag–söndag med alla 24 timmar, minutplacering
  och veckor lagda ovanpå varandra. Mått och referens kan väljas. Varje försök
  jämförs med perioden före sin egen dag. Välj punkt för datum/klockslag och
  motsvarande passdetaljer. Tom ruta är inget pass, vitt är okänt underlag.
- Referensen hålls fast tills uttrycklig uppdatering; gruppval ändrar endast
  vilka elever som syns. Aktuell klassmedlemskap används även för historiska
  veckojämförelser; gamla klassbyten rekonstrueras inte. Åldersnormer saknas.

`local-form-1` i `attentionForm.js` definierar separata mått och färgregler.
Svarshastighet kräver fyra korrekta svar och minst 60 procent träffar.
Uthållighet är kvoten mellan sista/första 40-sekundersdelens median, med två
korrekta svar och minst 60 procent träffar i båda; MULTI jämför samma regeltyp.
Kontroll är korrekt avstående med minst två stoppsignaler. Regelväxling är
skillnaden mellan bytt/upprepad träffandel med minst fyra svar av varje typ.
För få signaler eller avbrutet pass är okänt, aldrig en låg färgnivå.

Orange/rött kräver stora relativa **och** absoluta skillnader som återkommer
under minst fyra/fem tidigare mätdagar. FOKUS kräver dessutom minst 1/1,5 s.
En enskild lägre dag ger högst gult. Beräkningsdefinition och exakta
designgränser följer med JSON-exporten. Ändrade protokoll blandas inte i
dagsform, veckojämförelse eller översiktsmatrisens färger. Individens äldre
pass finns kvar med sina protokoll i detaljerna. Tidslinjen över pass är en
historisk råvisning, inte ett sammanslaget fokusbetyg. Ökande väntetid och
senare passtid är fortfarande sammanblandade; detta är lokala observationer,
inte säkerställd kognitiv hastighet, maximal uthållighet eller orsak.

## Export om ett eller flera år

I fokusmodulen: **Exportera fokusdata** → välj vad, elev/hela vald klass eller
grupp, aktivitet och datumintervall. Tomma datumfält tar med hela arkivet,
oberoende av periodfiltret för diagram/historik. Datumgränser avser svensk
kalenderdag vid passets start. Inga nya elevfrågor införs.

**Komplett JSON** är det förlustfria formatet: alla resultatfält, signaler,
stimuli, paushändelser, dataversion, aktivitetsdefinition och mätordlista med
enheter, tidszon och begränsningar. Version 1/2 behålls oförändrade med tydlig
äldre mätbeskrivning; saknade råfält rekonstrueras aldrig. CSV kan väljas
för pass, signaler eller händelser och använder matematikexportens befintliga
CSV-/nedladdningsverktyg. Protokollbeskrivning följer även med CSV-raderna.

Hämtningen fryser ett ID-index per elev och läser alla sidor med högst fyra
samtidiga elevläsningar. Inga pass försvinner genom förskjutna sidgränser när
nya resultat anländer. Pågående försök är senaste tillgängliga sparpunkt per
läsning, inte en transaktionell ögonblicksbild av hela databasen. Exporten
anger läs-/exporttid; varje försök har eget slut- eller senast-sparat-datum.
Oläsbar post, saknat indexresultat eller nätfel stoppar exporten i stället
för att tyst lämna ut ett ofullständigt urval.

Arkivet använder appens befintliga lagring; detta inför ingen separat
leverantörsbackup eller garanti mot förlust av själva databastjänsten.
Uttrycklig radering/anonymisering gäller fortsatt. Åldersreferens och
matematikjämförelser ingår inte i denna leverans.

## Lokal slutverifiering 2026-10-18

- `npm run test -- --exclude '.claude/**'`: 158 filer, 760 tester godkända.
- `npm run build`: godkänt, med befintliga Browserslist/import-/storleksvarningar.
- Slutlig `npm run robots` mot oförändrad kod: **117/117 godkända**, 0 regelbrott.
- Riktad ESLint för alla ändrade/nya kodfiler, arkitektur och projektkarta godkända.
  Arkitekturkontrollen nämner befintlig `studentProfile.js` (692 rader), som inte ändras.
- Arkivtester täcker 601 försök, avbruten migrering, revisionsordning, sena
  sparpunkter, slutresultat, behörighet, radering och anonymisering.
  Klienttest läser samtliga 610 indexerade försök i fasta sidor och stoppar
  ofullständiga/oläsbara svar. Protokollens definitioner är låsta med hash.
- Webbläsarrobot verifierar klass-/egen referens, fyrfältare, alla 24 timmar,
  verklig JSON-nedladdning och ett påbörjat försök över omladdning. Touch och
  tangentbord används. Nivåmatris/fyrfältare på dator och timschema på 768 px
  surfplatta har granskats i skärmbilder. Ingen fysisk elevplatta har provats.
- Första fullkörningen fick 112/117: ett screeningprov väntade på inaktiverad
  sparknapp och fyra matematikprov saknade serverdata. Serverkod ändrades
  medan körningen pågick, vilket kan ha laddat om robotarnas minnesdatabas.
  Inget av felen återkom i den helt gröna slutkörningen med oförändrad kod.
  Ingen NCM-/matematiklogik ändrades för att få testerna gröna.

Detta verifierar lokal app/API med isolerad minnesdatabas och krypterad
webbläsarlagring. Verklig KV-tjänst, riktiga elever och produktion har inte
provats i denna leverans. Ingen push eller publicering har gjorts.
