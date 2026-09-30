# NCM-diagnostik: projektinriktning och flexibel genomförandeplan

Status: **antagen projektriktning 2026-09-29; isolerad interaktionsprototyp pågår**.

Detta är ett design- och planeringsdokument. Det beskriver avsedd riktning,
inte nuvarande appbeteende. Vid konflikt gäller
[`PRODUCT_CONTRACT.md`](PRODUCT_CONTRACT.md) och
[`FUNCTION_CONTRACTS.md`](FUNCTION_CONTRACTS.md) före detta dokument.

## 1. Syfte

Projektet ska ge läraren ett bättre underlag för att förstå **hur** en elev
räknar, inte bara om slutsvaret blev rätt eller fel.

Eleven genomför ett kort diagnostiskt mikrouppdrag och skriver sin uträkning i
ett digitalt räknehäfte. Appen bevarar den synliga uppställningen och det kända
händelseförloppet. En versionsbestämd analys tar sedan fram spårbara
felhypoteser och lärarsignaler med tydlig osäkerhet.

På längre sikt ska underlaget kunna hjälpa läraren att skapa riktade uppdrag
för enskilda elever. I de första etapperna ska systemet endast synliggöra
observationer och föreslå möjlig uppföljning. Läraren fattar beslutet.

## 2. Vad projektet inte är

- Det är inte ett nytt läge för adaptiv mängdträning.
- Det är inte en digital kopia av hela Diamantmaterialet.
- Det är inte ett automatiskt diagnosbesked om elevens kunnande.
- Det ska inte automatiskt skapa eller tilldela stöduppdrag.
- Det ska inte i första versionen omfatta geometri, ritbedömning, tallinje,
  drag-and-drop eller handskriftsigenkänning.

Ett genomfört diagnostiskt uppdrag är en observation. Det är varken vanlig
mastery eller bevis för en säker felorsak.

## 3. Bärande produktprinciper

### 3.1 Uträkningen är förstahandsdata

Slutsvaret, den färdiga uppställningen och elevens inmatningsförlopp är tre
skilda delar av observationen. De ska bevaras utan att skrivas om av senare
analys.

### 3.2 Tolkning ska vara spårbar och omprövningsbar

En automatisk analys ska lagras separat från observationen och ange:

- vilken analysversion som användes;
- vilken konkret del av uppställningen eller händelseförloppet som gav signalen;
- vilken felhypotes som matchade;
- hur starkt underlaget är och vilka alternativa förklaringar som finns.

Läraren ska kunna se originalunderlaget och får inte tvingas lita på en dold
poäng eller etikett.

### 3.3 Diagnostik och träning ska hållas isär

Observationerna ska ha evidensklass `diagnostic_only`. De får inte tyst:

- ändra elevens vanliga adaptiva svårighet;
- skapa mastery-fakta;
- räknas som vanlig träningsmängd;
- markeras som klarade bara för att eleven har skickat in ett svar.

Systemet ska skilja mellan påbörjad, besvarad, fullständig, automatiskt
bedömd, lärargranskad och avslutad.

### 3.4 Vi bygger smalt men med utbyggbara kontrakt

Den första leveransen ska lösa ett litet problem väl. Datamodellen ska samtidigt
kunna bevara fler representationer och analystyper senare. Framtida stöd ska
kunna läggas till som nya uppgiftstyper och analysregler, inte som specialfall i
en stor NCM-komponent.

### 3.5 Källor och rättigheter ska vara tydliga

NCM:s struktur, facitresonemang, delmoment och förkunskapsrelationer kan
informera innehållskontrakten. Originaluppgifter får inte publiceras eller
byggas in brett utan klarlagd rätt att använda dem. Egna uppgifter med samma
diagnostiska avsikt är standardvägen tills annat är beslutat.

## 4. Första smala omfattning

Första sammanhållna versionen omfattar:

1. flersiffrig addition med och utan minnessiffra;
2. flersiffrig subtraktion med och utan växling/lån;
3. ett kort lärarutdelat diagnostiskt uppdrag;
4. tangentbordsinmatning i ett högställt rutnät;
5. sparad slutbild och sparat inmatningsförlopp;
6. regelbaserad analys av ett litet antal tydligt definierade hypoteser;
7. en lärarvy där originalet, analysen och osäkerheten kan granskas ihop.

Decimaluppställning är ett naturligt nästa steg, men ska inte blandas in
innan heltalsuppställning och dess analys är klassrumsbegriplig.

## 5. Det digitala räknehäftet

Rutnätet ska efterlikna ett matematikblock med ungefär 5 mm breda och 8 mm
höga rutor i sin visuella proportion. Fysisk millimeterstorlek kan inte
garanteras på alla skärmar; läsbarhet, träffsäkerhet och stabil kolumnlinjering
går före exakt skalmått.

Eleven ska kunna använda tangentbord för att:

- skriva en siffra eller tillåtet tecken i vald ruta;
- flytta markören med piltangenter, tabulator eller direkt val;
- radera och korrigera;
- placera operator, decimaltecken och svarsstreck där uppgiften tillåter det;
- skriva minnessiffror och lån utan att rita med touch.

Den exakta interaktionen för minnessiffror och lån ska prototypas innan den
låses. Tänkbara former är en liten anteckningsposition i varje ruta, en separat
hjälprad eller ett tydligt växlingsläge. Valet ska avgöras av elevtestning och
analysbarhet, inte av vilken variant som är enklast att koda.

Den isolerade prototypen använder tills vidare ett sammanhängande rutnät med
proportionen 5:8. Eleven väljer själv en tom ruta för en minnessiffra; inget
anteckningsläge lägger till eller flyttar rader. Minnessiffran visas mindre och
kan vara tvåsiffrig. Interaktionen behöver fortfarande prövas med elever.

I den adminbegränsade prototypen blir en nyskriven siffra stor. En kort dutt
markerar rutan, håll och släpp växlar mellan stor siffra och minnessiffra,
och håll följt av drag växlar överstrykning. Storlek och överstrykning är
oberoende och kan ångras var för sig. Tre synliga knappar ger samma val;
högerklick öppnar dem även på dator. Varje ändring bevaras i händelseförloppet.
Prototypen och dess NCM-modul visas endast för administratör och huvudadmin,
med orange bakgrund för att skilja den från ordinarie träningsvyer.

Rutnätet ska vara en egen generell komponent. Uppgiften bestämmer vilka
tecken, markeringar och semantiska roller som är tillåtna.

## 6. Vad som behöver bevaras

Fältnamnen nedan är begrepp, inte en fastslagen databasmodell.

### 6.1 Uppgift och sammanhang

- stabilt uppgifts- och försöks-ID;
- diagnostiskt projekt/uppdrag och eventuell NCM-referens;
- matematiskt mål, delmoment och förkunskapsrelation;
- facitregel, accepterade representationsformer och analysregelversion;
- elev, klass, tidpunkt och känd avbrotts-/hjälpkontext.

### 6.2 Slutlig arbetsyta

- rutnätets dimensioner och koordinatsystem;
- varje rutas slutliga innehåll och eventuella roll;
- operatorer, svarsstreck, decimaltecken och hjälpmarkeringar;
- elevens uttryckliga slutsvar separat från tolkad uppställning.

### 6.3 Händelseförlopp

En append-only-följd bör minst kunna beskriva:

- insättning, ersättning och radering;
- käll- och målruta;
- tid och ordning;
- markörflyttning när den är meningsfull;
- paus, fokusförlust och inlämning.

Händelserna ska göra det möjligt att återskapa det eleven faktiskt gjorde.
De får inte förväxlas med en tolkning av vad eleven tänkte.

### 6.4 Analys och lärargranskning

- beräknat rätt/fel och fullständighet;
- matchade felhypoteser med evidensreferenser;
- analysens säkerhet och begränsningar;
- möjlig uppföljningsfråga eller förkunskap att kontrollera;
- lärarens bekräftelse, avvisande eller kommentar utan att originalet ändras.

## 7. Första analyskatalogen

Analysen ska börja deterministiskt och regelbaserat. En språkmodell kan senare
hjälpa till att formulera en begriplig sammanfattning, men får inte vara enda
källan till en kunskapssignal.

### 7.1 Gemensamma hypoteser

- talen är korrekt eller felaktigt kolumnjusterade;
- ental, tiotal och hundratal har blandats ihop;
- eleven börjar bearbeta kolumnerna från höger eller vänster;
- ett mellanresultat hamnar i en annan kolumn än den bearbetade;
- uppställningen är matematiskt tolkningsbar men ofullständig;
- slutsvaret och den synliga uträkningen motsäger varandra;
- eleven korrigerar ett tidigare fel eller lämnar det kvar.

### 7.2 Addition

- minnessiffra saknas när en övergång kräver den;
- minnessiffra skrivs men används inte;
- minnessiffra används i fel kolumn eller mer än en gång;
- endast entalssiffran från en delsumma förs vidare;
- kolumner summeras i en ordning som ger ett identifierbart felmönster.

### 7.3 Subtraktion

- subtrahend och minuend placeras eller tolkas i fel ordning;
- eleven tar konsekvent största siffran minus minsta per kolumn;
- lån markeras men nästa position minskas inte;
- nästa position minskas utan att den aktuella positionen ökas;
- lån genom noll hanteras ofullständigt;
- en korrekt växling följs av ett fristående räknefel.

Varje hypotes behöver positiva exempel, närliggande motexempel och fall där
systemet ska svara `okänt`.

## 8. Lärarens underlag

Läraren ska kunna gå från signal till underlag utan att byta betydelse mellan
vyer. En första lärarvy bör visa:

1. uppgiften och elevens slutsvar;
2. elevens slutliga rutnät;
3. en enkel stegvis återspelning eller händelselista;
4. matchade felhypoteser och vad i underlaget som utlöste dem;
5. vad systemet inte kan avgöra;
6. möjlig riktad intervju eller förkunskap att kontrollera;
7. lärarens egen bedömning och kommentar.

Sammanfattningar över flera uppgifter eller tillfällen får skapas först när
urval, omfattning och osäkerhet visas. Ett enstaka matchat mönster ska inte
presenteras som en stabil elevprofil.

## 9. Utskrift, reservväg och uppläsning

Diagnostiken ska kunna användas även när en elev inte kan eller bör arbeta på
iPad. Utskrift och tillgänglighet är därför delar av produktens riktning, inte
fristående efterhandsfunktioner.

### 9.1 Ogenomförd diagnos

Relativt tidigt ska läraren kunna skapa en tom version av ett diagnostiskt
uppdrag som Word och PDF. Den ska kunna användas för:

- didaktisk granskning innan uppdraget delas ut;
- vanlig pappersutskrift;
- reservväg för en elev som inte kan använda iPad;
- gemensam genomgång eller riktad intervju.

Word och PDF ska bygga på samma versionsmärkta uppgiftsunderlag som elevvyn.
Word är den redigerbara lärarversionen och PDF den stabila utskriftsversionen.
De ska inte ha separata manuellt underhållna frågebanker.

Pappersversionen ska innehålla tillräckligt med rutat utrymme för elevens
uppställning. På utskrift kan rutornas fysiska mått kontrolleras mer exakt än på
skärm.

### 9.2 Genomförd diagnos

När digitala observationer kan återskapas tillförlitligt ska läraren kunna
skriva ut eller exportera en genomförd diagnos. Den ska visa:

- uppgiften;
- elevens slutliga uppställning;
- elevens slutsvar och bedömning;
- relevanta automatiska hypoteser med tydlig osäkerhet;
- en kommentarsyta till höger för lärarens anteckningar;
- känd kontext, exempelvis använd uppläsning eller avbrutet försök.

Exporten ska i första hand återge vad eleven gjorde. En automatisk tolkning får
inte visuellt dominera eller ersätta originalet. Personuppgifter och
analyskommentarer kräver samma behörighets- och integritetsskydd som lärarvyn.

En framtida pappersinlämning kan registreras eller bifogas manuellt, men
automatisk tolkning av handskrift ingår inte i den första riktningen.

### 9.3 Uppläsning och markerbar text

Frågetext ska vara riktig, semantiskt strukturerad och markerbar text, inte en
bild. Det gör att eleven kan använda iPadens eller webbläsarens befintliga
uppläsningsstöd.

Senare ska läraren kunna aktivera inbyggd uppläsning för en eller flera utvalda
elever i ett diagnostiskt uppdrag. Inställningen ska:

- vara lärarstyrd och knuten till eleven eller det aktuella uppdraget;
- vara tydlig för eleven utan att upplevas som en varning eller avvikelse;
- läsa frågan utan att avslöja lösningsmetod eller svar;
- bevara vilken textversion och vilket språk som lästes;
- registrera att uppläsning var tillgänglig och, om det är relevant och
  proportionerligt, om den användes.

Uppläsning är en del av försökets kända kontext. Den ska inte i sig sänka
bedömningen eller tolkas som en matematisk svårighet. Samtidigt måste det vara
synligt för läraren när en uppgift uttryckligen avser att pröva elevens egen
tolkning av text. Läraren avgör då om uppläsning är en tillåten anpassning för
just det diagnostiska syftet.

## 10. Vägen framåt

Etapperna är beslutspunkter, inte en låst tidsplan. Varje etapp ska ge ett
granskningsbart resultat och ny kunskap innan nästa omfattning bestäms.

### Etapp 0: kontrakt och nulägesgräns

- Beskriv ett försök från utdelning till lärargranskning.
- Definiera vad `diagnostic_only` betyder i urval, lagring, mastery och export.
- Kartlägg vilka delar av nuvarande NCM-kod som kan återanvändas och vilka
  som tillhör det gamla mängdträningsliknande flödet.
- Välj två additioner och två subtraktioner som analysfall, med egna
  formuleringar och känd diagnostisk avsikt.
- Definiera ett gemensamt uppgiftsunderlag för elevvy, tom Word-version och tom
  PDF-version, så att tidig utskrift inte blir ett parallellt innehållssystem.

**Beslutsgrind:** samma försök har entydig betydelse i elevvy, lagring,
analys, lärarvy och export.

### Etapp 1: interaktionsprototyp utan starka analysanspråk

- Bygg rutnätet isolerat med tangentbordsflöde.
- Prova alternativa sätt att skriva minnessiffror och lån.
- Kontrollera på elevens verkliga skärmstorlek att rutorna är läsbara och
  att markören aldrig försvinner.
- Spara och återskapa slutläge och händelser utan informationsförlust.
- Kontrollera att frågetexten kan markeras och användas med plattformens
  befintliga uppläsningsstöd.

**Beslutsgrind:** elever kan uttrycka en naturlig uppställning utan att
gränssnittet lär dem en dold specialmetod.

### Etapp 2: rekonstruktion och deterministisk analys

- Tolka rutnätet till kolumner, operander, hjälpmarkeringar och delsvar.
- Implementera endast analysregler som har tydliga exempel och motexempel.
- Separera `ingen träff`, `otillräckligt underlag` och `matchad hypotes`.
- Versionsmärk analysen och gör den reproducerbar från sparad observation.

**Beslutsgrind:** en regel ger samma resultat efter lagring och återläsning,
och läraren kan se varför den träffade.

### Etapp 3: lärargranskning

- Visa arbetsyta, förlopp, hypotes, osäkerhet och föreslagen uppföljning.
- Låt läraren bekräfta, avvisa eller kommentera utan att skriva över rådata.
- Kontrollera att klassöversikt, elevdetalj och export använder samma urval.
- Skapa utskriftsbar Word/PDF för genomförd diagnos med elevens uppställning
  och kommentarsyta till höger.

**Beslutsgrind:** en lärare kan förstå signalen och kontrollera den mot
elevens faktiska uträkning på kort tid.

### Etapp 4: liten klassrumspilot och kalibrering

- Använd få uppgifter och ett litet elevurval.
- Jämför automatisk analys med lärarens granskning och vid behov en kort
  riktad intervju med eleven.
- Samla falska positiva, falska negativa och oklassificerbara strategier.
- Justera regler och gränssnitt; skriv inte om historiska analyser utan ny
  version.

**Beslutsgrind:** signalerna är tillräckligt begripliga och träffsäkra för
att motivera bredare innehåll, inte bara tekniskt fungerande.

### Etapp 5: lärarstyrd riktning mot nästa uppdrag

- Koppla bekräftade hypoteser till möjliga förkunskaper eller nya
  diagnostiska mikrouppdrag.
- Visa förslag med underlag och alternativ; läraren väljer om något ska delas
  ut.
- Bevara spåret från observation till signal, lärarbeslut och uppföljning.

**Beslutsgrind:** inget uppdrag skapas eller aktiveras automatiskt, och
läraren kan förklara varför ett förslag finns.

### Etapp 6: kontrollerad expansion

Möjliga fortsättningar, en i taget efter nytt innehållskontrakt:

- addition och subtraktion med decimaler;
- flersiffrig multiplikation och delprodukterna i uppställningen;
- division med mellanled;
- negativa tal, potenser och andra numeriska NCM-delområden;
- fler representationer och så småningom tallinje, drag-and-drop och
  geometri.
- lärarstyrd inbyggd uppläsning för utvalda elever eller uppdrag.

Expansion styrs av analysvärde och klassrumsbehov, inte av hur många
NCM-koder som kan importeras.

## 11. Verifiering genom hela projektet

Varje etapp ska verifiera kedjan:

`uppgift -> inmatning -> bevarad observation -> analys -> lärarsignal -> underlag`

Minsta kontrolluppsättning när implementationen börjar:

- kontraktstester för rutkoordinater, händelseordning och serialisering;
- positiva, negativa och okända fall för varje analysregel;
- test att diagnostiska svar inte påverkar mastery eller adaptiv svårighet;
- återspelning av avbrutet, återupptaget och synkat försök;
- robotflöde från lärarutdelning till elevsvar och tillbaka till lärarvy;
- visuell och tangentbordsbaserad QA på elevens avsedda enhet;
- jämförelse mellan lärarsignal, elevdetalj och export;
- kontroll att Word, PDF och elevvy visar samma uppgiftsversion;
- visuell kontroll av tom och genomförd utskrift, inklusive kommentarsyta och
  rutornas fysiska mått;
- tillgänglighetskontroll av markerbar text och uppläsning utan att
  lösningsinformation avslöjas;
- manuell didaktisk granskning av hypotesernas begriplighet.

## 12. Frågor som ska hållas öppna tills de kan prövas

- Vilken interaktion för minnessiffra och lån är mest naturlig för eleverna?
- Hur fri får placeringen vara innan automatisk tolkning blir missvisande?
- Ska läraren kunna se full återspelning eller räcker meningsfulla steg?
- Vilka analysregler är tillräckligt säkra för klassöversikten och vilka ska
  bara visas i detaljvyn?
- Hur ska lärargranskning användas för kalibrering utan att ändra tidigare
  observationer?
- Vilken käll- och licenspolicy ska gälla om originalmaterial används i en
  begränsad pilot?
- Vilka diagnostiska syften tillåter uppläsning utan att det som ska prövas
  förändras?
- Ska en pappersdiagnos endast arkiveras som dokument, eller senare kunna
  registreras strukturerat av läraren?

Frågorna är avsiktligt inte låsta nu. Projektet ska samla tillräckligt
underlag för att Simon ska kunna fatta dessa beslut stegvis.

## 13. Förhållande till nuvarande NCM-funktion

Den nuvarande NCM-banken och lärarstatistiken kan ge källproveniens,
uppgiftsmappning och historisk kontext. De ska inte antas vara rätt grund för
det nya flödet.

Innan kod återanvänds ska det särskilt verifieras att:

- uppdraget inte fungerar som mängdträning;
- ett felaktigt svar inte markeras som diagnostiskt klarat;
- NCM-observationer får `diagnostic_only` genom hela lagringskedjan;
- automatisk svårighetsjustering och mastery inte påverkas;
- den gamla numeriska felanalysen inte presenteras som analys av elevens
  uppställningsmetod.

Projektet ska därför byggas som ett tydligt diagnostiskt kontrakt och inte som
ytterligare speciallogik ovanpå det befintliga NCM-läget.
