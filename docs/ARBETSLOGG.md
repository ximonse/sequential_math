# Arbetslogg

## 2026-11-26: Geometri i träning och uppdrag

- **Simons beslut:** gå vidare med geometri i träning och vanliga uppdrag. Utred hur elevens val ska påverka statistik och felsvarskategorier före införandet.
- **Logg:** återanvändbar bildbank, svarskomponent och rättning inventerade. Läskontroll av fyra ordinarie klasser hittade 19 screeningar, två utdelade geometrifrågor och noll inlämnade geometrisvar. Ingen modell kunde prövas. Ordinarie träning och uppdrag har fortsatt 0 av 21 begrepp.
- **Agentens förslag:** behåll valen som spårbara observationer, räkna första svaret en gång och särredovisa försök efter återkoppling. Två kandidater med kontraster och motexempel finns i [underlaget](GEOMETRI_TRANING_UPPDRAG.md).
- **Parkerat:** införande och modellgodkännande väntar på ett jämförbart underlag från en ordinarie klass enligt avsnitt 9. Ingen elevutdelning gjord.

## 2026-11-25: Städning av worktrees och tre säkra förbättringar tagna in

### Logg

- Simon bad om rensning av döda worktrees och en genomgång av vilka
  liggande grenar som kan tas in utan att krocka.
- **Rensat:** tre worktrees pekade på Temp-mappar som Windows redan tömt
  (`catalog-release-20261029`, `screening-release-20261026`, `sm-hotfix`),
  plus sju trasiga registreringar (`deploy`, `pong-release`,
  `free-practice-release`, `screening-results-tab`, `sm-base`,
  `sm-base-check`, `-codex-release-group-filter`). 28 → 25 worktrees, och
  "Permission denied"-bruset vid varje git-kommando är borta. Inga grenar
  eller commits togs bort; kontrollerat först att ingen hade originalarbete
  och att den detached-commiten finns i flera grenar.
- **Taget in på denna gren**, var och en provad för konflikt först:
  - `7c4f998` NCM-kontrollens radslut. Koden gick rent; bara ARBETSLOGG och
    plan.json krockade, båda lösta genom att behålla båda sidor. Testet som
    föll på varje Windows-maskin är nu grönt lokalt.
  - `753bc08` teacher-names-roboten. Felet låg i roboten, inte i appen:
    efter omladdning ligger läraren kvar på Administration, där tabellen
    Klass/gruppvy inte finns. Roboten var röd i varje svitkörning sedan
    17/11 och är grön nu.
  - `9263b32` + `5fb863a` de samlade önskemålen från 16/11. Ingen kod.
- Kontroller: vitest 259 filer / 1415 tester, **allt grönt** — för första
  gången på länge utan rött. Build grön. Lint oförändrad (de 8 kvarvarande
  finns lika på master). Robotar: teacher-names och teacher-names-stable
  gröna.

### Simons beslut

- Rensa döda worktrees och ta in det som går rent. Produktion är inte
  beställd i denna omgång.

### Agentens val

- Konflikterna i ARBETSLOGG och plan.json löstes genom att behålla båda
  sidor och placera den inplockade posten på sin kronologiska plats, inte
  överst. plan.json slogs ihop strukturellt (kort för kort) i stället för
  textuellt, så JSON-giltigheten inte kunde gå sönder.

### Tankar och parkerat

- **Krockar jag avrådde från:** `release/teacher-read` skulle backa Simons
  beslut från 11/11 (screening är lärarens eget arbete, klassåtkomst räcker)
  och återinföra kravet på skoladministratör. `fix/talpar-start-blandning`
  är överspelad: fri träning finns redan som eget kort i master.
  `hotfix/log-event-save-errors` har samma commit som a51445f, redan inne.
- Kvar att ta ställning till: `claude/screening-result-wait` (färskast, 27
  kodfiler, egen omgång) och `codex/audit-three-fixes` (fyra fixar kvar, men
  ligger 27 commits efter och tar bort rader master byggt vidare på — måste
  plockas commit för commit).

## 2026-11-24: Elevkortet som utskrift, uppdragsmoduler och mottagarmarkering

### Logg

- Fyra beställda ändringar i lärarvyn, utanför arbetsmålet belastningen.
  Egen gren `claude/elevkort-uppdragsmoduler` från master 5ffec64 (PR #47
  mergad först, enligt Simons villkor att arbeta utifrån ny master).
- **Elevkortet.** PDF och skärmkort var två olika layouter. Nu läser båda
  `src/lib/studentCardLayout.js` med samma millimetermått, så de inte kan
  glida isär. QR-koden är borttagen: elevinloggningen
  (`PilotStudentLoginForm`) har bara kodnamn och PIN, det finns ingen
  QR-skanner i appen, så kortet lovade en väg som inte finns. Elev-ID bort
  av samma skäl — det används inte vid inloggning. `ClassLoginTab` och
  `StudentDetailPanel` ritade egna kort och använder nu samma komponent.
- **Modulerna.** Arbetsytor, Domäner, Eget uppdrag, Tabell och Fokusövning
  ligger i egna rundade rutor med infoikon (hovring på dator, tryck på
  iPad, samma text). "Max antal för Talpar/Dubblor" flyttad in i Domäner
  där den hör hemma.
- **Inställningarnas räckvidd.** Spårat på elevsidan:
  `assignmentLaunchPath` skickar allt utom `focus` och `subitizing` till
  `/student/:id/practice`, där `SessionPage` renderar arbetsytorna.
  Tabelluppdrag gick alltså dit men fick aldrig propen, och "Skapa egna"
  fick aldrig pausspelsvalet. Båda rättade via `assignmentSettings.js`.
  Fokus och talbild har egna vyer utan arbetsyta; deras infotexter säger
  det i stället för att visa ett val utan verkan.
- **Mottagarna.** Grön markering med bock, samma som klassfiltret. Krävde
  egen CSS-regel: temats `aria-pressed`-regel mjukade annars upp den med
  `!important`.
- **Fel i mitt eget första utkast**, hittat vid granskning och i bilderna:
  infoikonen låg inuti Pausspel-etiketten (tryck på förklaringen bockade i
  inställningen, R3/R4); emulerad mouseenter gjorde att andra trycket inte
  stängde; och två rubriker stod dubbelt. Alla rättade i ffd4bf2.
- Kontroller: vitest 1416/1418 lokalt. **Rättelse:** jag skrev först att de
  två felen i `scripts/audit-ncm-rule-readiness.test.js` låg på master. Det
  stämmer inte. Hashen i `NCM_DIDACTIC_COVERAGE.json` är räknad på LF, och
  arbetskopian på Windows har CRLF, så summan skiljer bara här. CI kör samma
  test grönt. Testet är alltså inte Windows-säkert; ingen NCM-avstämning
  behövs och inget är trasigt i produktion. Build grön, eslint rent.
  Två nya robotfiler, båda bevisat röda mot gammal kod och gröna mot ny.
  Visuell kontroll mot robotserverns seedade testdata, inga riktiga elever.

### Simons beslut

- Elevkortet ska se ut som PDF:en. Fokusövningen ska boxas, inte döljas.
  Inställningar som inte gäller alla uppdragstyper ska rättas.
  Mottagarmarkeringen ska bli tydlig som den övre. Arbetet godkänt som
  egen omgång utanför belastningsmålet.
- Simon valde att agenten tar skärmdumparna mot testdata i stället för att
  testa själv, sedan jag flaggat att nytt kort slår ut elevens riktiga PIN.

### Agentens val

- "Skapa egna" flyttad in i rutan Eget uppdrag: två nästan identiska namn
  på olika ställen var det som förvirrade.
- "Rensa" i Mottagare ersatt av "Följ klassfiltret igen" i stället för att
  båda behålls. Tomt urval betyder alla klasser, och det fanns ingen väg
  tillbaka till filtret. En knapp som gör en begriplig sak är bättre än
  två som inte gör det. Resultatväljaren under Screening behåller "Rensa".
- Avrådde från att gråa ut klassfiltret eller mottagarna när det andra
  används: de är inte alternativ. Filtret styr fortfarande visning, länk
  och QR; mottagarna är utdelningen. Simon godkände att det blir en
  statusrad i stället.
- Texterna som kallade kortet "QR-kort" rättades till "elevkort" på de fem
  ställen där de annars skulle beskriva ett kort som inte finns.

### Tankar och parkerat

- Arbetsytor i fokusövning och talbild skulle kräva arbete på elevsidan,
  och en rityta ändrar vad de övningarna mäter. Inte byggt, inte föreslaget
  som nästa steg; infotexterna är ärliga om gränsen i stället.
- `audit-ncm-rule-readiness` är rött på master. Inte mitt mandat att stämma
  av NCM-referensen (STYRNING_FELFORSTAELSER avsnitt 9), men CI blir röd
  oavsett gren tills någon gör det.
- `teacher-names` är fortfarande rött, som den var i förra passet.

## 2026-11-24: Administratör ser aktiva uppdrag utanför eget bibliotek

### Logg

- Simon såg mängder av uppdrag som elev men inga som administratör. Orsak:
  uppdragsbiblioteket ligger per lärarkonto i
  `teacher_workspace:{teacherId}:assignments`, medan aktiveringen ligger på
  klass-, grupp- eller elevposten (`activeAssignments`). AssignmentsPanel
  loopade bara över det egna biblioteket, så ett uppdrag någon annan
  aktiverat fick ingen rad alls. Ingen läsning filtrerar på `activatedBy`.
- Byggt lokalt: `foreignActiveAssignments.js` (ren hjälpfunktion, 7 tester)
  och `ForeignAssignmentRows.jsx`, inkopplade i Dashboard och DashboardLayout.
  Raden ligger utanför tomt-läge-grenen, så den syns även när det egna
  biblioteket är tomt — precis administratörsfallet.
- `npm run test`: enda felet i riktiga trädet är
  `scripts/audit-ncm-rule-readiness.test.js`, som faller lika utan ändringen
  (kontrollerat med stash). Övriga fel kommer från gamla `.claude/worktrees`.
  `npm run build` grön, eslint rent. Robotar inte körda: ingen logikändring i
  uppgifter, nivåer, sparande eller lärarvyns siffror.

### Simons beslut

- Minsta steget: visa raden. Inte dela uppdragsbiblioteket mellan lärarkonton.
- Uppdraget hör inte till arbetsmålet belastningen. Simon valde att bygga ändå.

### Agentens val

- Skiljelinje: detta gäller uppdrag via länk (`activeAssignments`). Screening
  ligger per klass (`diagnostic_assignments_by_class`) och syns redan för den
  som har klassåtkomst — den listan berörs inte av felet.
- Skälet jag framhöll när jag frågade: ändringen är ren klientlogik utan nya
  serveranrop, så den påverkar inte belastningen. Mitt resonemang, inte Simons.
- Raden följer inte klassfiltret, utan samlar alla klasser/grupper läraren ser.
  Samma beteende som panelens befintliga ”Aktiv i …”-rad.
- Lärarnamn tas ur `teachers`-listan som `/api/teacher-groups` redan
  returnerar. Okänt konto-id visas inte som rått id (AGENTS.md: dölj
  tekniska ID:n i vardagsvyer).
- Neutral rubrik ”Aktiva uppdrag som inte finns i ditt uppdragsbibliotek”:
  uppdraget kan också vara ett eget som raderats ur biblioteket.
- Läsbart bara. Avaktivering härifrån vore möjlig i API:t men låg utanför
  minsta steget.

### Preview och avstämning

- Pushat till `claude/admin-foreign-assignments`, PR #47 som utkast. Preview
  byggd och provad av Simon i lärarvyn: ”Ser bra ut”. Previewen är skyddad av
  Vercel Authentication; `class-config` svarade 404 i stället för lagringsfel,
  så KV-variablerna finns i Preview-miljön. Att det är samma databasinstans som
  produktion gick inte att bekräfta: Vercel-kopplingen nekar (403) att lista
  miljövariabler. Inte i produktion; ingen merge.
- Simon: ”aktiverat av” räcker. Vem som *skapade* uppdraget behövs inte — och
  finns inte heller i payloaden, som bara bär id, kind, title, createdAt och
  inställningar. `activatedBy` sparas sedan `ec6c95d` (2026-10-21), så
  aktiveringar äldre än det visar inget namn.
- Erbjudna men inte beställda: avsändare även på egna uppdragsrader, och
  bredare namnuppslag via `/api/admin/teachers` (ett extra anrop i lärarvyn).

### Robotkontroll och sammanslagning med master

- Grenen låg 25 commits bakom master; både previewen och de första
  robotkörningarna gjordes därför mot ett gammalt underlag. Master är nu
  sammanslagen in i grenen (konflikter i denna logg och i projektkartan lösta
  för hand; a51445f:s egen loggpost och kartfält bevarade).
- Full robotsvit parallellt: 9 röda. Seriellt (`ROBOT_WORKERS=1`) blev sex av dem
  gröna direkt — uppdrag, uppdragskö, uppdragstak och elevanalys. De var
  parallellstörning: robotarna delar en minnesdatabas och ser varandras klasser.
- `screening-load` är ordningsberoende: dess lärare är `super_admin` och ser alla
  klasser i minnesdatabasen, så varje klass en tidigare robot skapat fäller
  jämförelsen. Den var grön med min ändring i den rena tre-filskörningen.
- Parvis jämförelse på nya underlaget, samma filer och ordning: masters egen kod
  3 röda / 4 gröna; med min ändring 2 röda / 5 gröna. Min ändring orsakar inga
  robotfel.
- **Fynd som inte är mitt:** `teacher-names` är röd i varje körning, också på
  masters kod — lärarens privata tilltalsnamn syns inte i Klass/gruppvy efter
  omladdning. Eftersom master är produktionens kod finns felet rimligen i drift.
  Inte undersökt; inget mandat begärt. `admin-tab` faller också på masters kod,
  men hoppar mellan körningar som `screening-load`.
- Rapporten visade ”0 regelbrott” i samtliga körningar: R1–R4, L1 och T1 höll.

### Publicerat

- Simon sa production. PR #47 mergad efter gröna quality, documentation och
  Vercel preview. Master `5ffec64`, Vercel `dpl_GGoQznmMy8oLMeybDbL6YRA9TBg3`,
  target production, READY. Läsande kontroll: `matematik.ximon.se` svarar 200 och
  `/assets/index-DxAEKR7k.js` innehåller den nya raden med korrekta å/ä/ö.
- Mergen publicerade även belastningssteget `a51445f` (Screening läser bara de
  klasser fliken behöver). Det var känt och flaggat före beslutet.
- Ingen inloggad UI-kontroll i produktion gjord av agenten. Simon godkände
  funktionen i preview på samma underlag.

### Tankar och parkerat

- Uppdrag aktiverade på enskild elev syns först när klassen öppnas:
  startkatalogen (`catalogCard`) bär inga uppdragsfält. Att lägga dit dem
  skulle göra att varje aktivering invaliderar katalogkort — tvärtemot
  arbetsmålet belastningen. Lämnat medvetet.
- Öppen fråga till Simon: ska uppdragsbiblioteket delas på skolnivå?
- Inte verifierat i webbläsare, och kan inte verifieras lokalt: `npm run dev`
  hånar bara några API-vägar med lokal testdata och når inte riktiga konton.
  Prov med Simons administratörskonto kräver preview (push), vilket är hans
  beslut. Ingen push gjord.

## 2026-11-18: En tolkning per elevsvar i alla lärarvyer

- Simons besked: "Jag håller med, kör på dina förslag och produktion om du inte har frågor." Förslaget, B7 och ordningen med screening först är godkända.
- Logg: `src/lib/answerInterpretation.js` är den gemensamma tolkningen. Screeningkort, tabellcell, elevrapport, täckning och evidens-API/MCP läser den.
  - B1: Kravet på tre uppgifter finns kvar bara för "Angränsande produkt", "Fel tabellfaktum i uppställningen" och "ger upp".
  - B2: Fler jämförbara rätt än fel ger "Motsagd av rätta svar". Antalet motexempel räknas utan tak.
  - B4: Ett svar som läraren skrivit in tolkas i alla vyer.
  - B6/B7: Snabbhetsträning blir en misstanke först vid tre svar. Samma felsvar tre gånger visas som "Samma felsvar flera gånger". Olika felsvar på samma uppgift räknas inte dit.
  - K5: Svar som läraren dolt som slarv lämnar också screeningvyn.
  - K6: Elevrapporten visar oförklarade fel bland alla svar.
  - K7: Signalen M är borttagen.
  - K8: Felförståelsekartan visar aktuell förklaring först och den sparade analysen som "Tidigare analys".
  - Katalogflaggan `screeningShowsSingle` är ersatt av `wrongOperation`.
  - Flödesdokumentet är `docs/TOLKNING_AV_ELEVSVAR.md`.
- Täckning på det syntetiska underlaget (R-D), före och efter:

  | Grupp | Före | Efter |
  | --- | ---: | ---: |
  | Felförståelse | 418 | 416 |
  | Samma uppgift flera gånger | 28 | 5 |
  | Observation | 6 | 17 |
  | Inmatning | 3 | 7 |
  | Ger upp | 1 | 3 |
  | Oförklarade | 44 | 52 |

  Ändringen följer av B7 och av att allmänna modeller nu viker för specifika även i täckningen. Inga felmodeller och ingen `PREDICTABLE_RULE_VERSION` är ändrade.
- Verifiering:
  - Testet `answerInterpretation.test.js` kör samma svar genom screeningkort och elevrapport för K1, K2, K4 och B6/B7. Testet är grönt.
  - 1403 tester gröna, utom de två kända NCM-radslutsfelen. Build grön.
  - 62 robotar för analys, screening, diagnos, material och lärarvy är gröna med 0 regelbrott.
  - Belastning: en läsning till per elev i screeningvyn, för de dolda svaren. Den görs parallellt, så antalet steg i följd är oförändrat (13).
- Agentens val:
  - Ett enda svar på en modell utan krav ligger kvar som kort märkt "Enstaka svar" med uppföljning, som förut. Bara svar under ett krav flyttas till "Enstaka svar, för lite underlag".
  - Motsagda misstankar visas utan uppföljningsknapp.
  - 3 + 3 = 0 räknas som "svarar 0" även i täckningen, som elevrapporten redan gjorde.
- Riktiga elevsvar, som förslaget kräver före publicering:
  - Underlag: Kumlaby åk 6, 4, 5 och 6, 15/8–18/11. Det är 110 elever, 18 051 svar och 2 918 fel. Inga testklasser, blindtester eller syntetiska klasser ingår.
  - Före betyder kod vid 80d20ff, som har samma klassning som i produktion. Efter betyder 68eda0f.
  - Jämförelsen gjordes på samma svar. Elevdata ligger utanför repot.

  | Mått | Före | Efter |
  | --- | ---: | ---: |
  | Täckning: felförståelse | 519 | 511 |
  | Täckning: samma felsvar flera gånger | 700 | 189 |
  | Täckning: observation | 277 | 349 |
  | Täckning: inmatning | 97 | 84 |
  | Täckning: ger upp | 97 | 148 |
  | Täckning: oförklarade | 1 228 | 1 637 |
  | Elevrapport: misstankar med mönster | 134 | 69 |
  | Elevrapport: enstaka svar | 136 | 104 |
  | Elevrapport: för lite underlag | – | 86 |
  | Elevrapport: motsagda | – | 99 |
  | Elevrapport: inmatning och svar utan metod | 198 | 110 |
  | Elevrapport: upprepade uppgifter | 162 | 62 |
  | Elevrapport: oförklarade som räknas | 101 | 1 637 |
  | Elever med minst en misstanke | 54 | 44 |

  - 52 elever har kort med för lite underlag och 42 elever har motsagda kort.
  - Rapporten tar 6 ms per elev, både före och efter.
  - MCP-sidan blir cirka 4 % större.
- Rättat efter granskning: Dolda svar skickas med status `hidden_slip`, inte `incorrect`. Sidor som laddades före ändringen hoppar då över raden i stället för att krascha. Ett test kontrollerar det.
- Agentens val: Detaljläsningen av ett enskilt svar räknar fortfarande tolkningen för hela perioden. Testet kräver att den ger samma post som sidläsningen, och svarets grupp beror på elevens övriga svar.
- Exempel för Simon. Tre motsagda kort, anonymiserade, från riktiga svar:
  - Angränsande produkt: 7 fel mot 154 jämförbara rätt.
  - Bara decimaldelen multipliceras: 1 fel mot 3 rätt.
  - Svarar 55: 5 fel mot 99 rätt. Här fanns ett fel. Att ge upp kan inte motsägas av rätta svar på andra uppgifter. Rättat: bara felförståelsemodeller kan bli motsagda, och ett test kontrollerar det. Siffrorna i elevrapporten är oförändrade, eftersom kortet redan visades under Ger upp.
- Kvar: Simons besked om publicering efter att han sett mätningen och exemplen. Lärarens val ur listan räknas fortfarande separat i elevrapporten, utan att det har beslutats.

## 2026-11-18: Nivå vid tabellfel och viktning av upprepade felsvar

- Simons besked: Fel i tabellträning ska inte sänka multiplikationsträningen. Koden gör redan så, vilket agenten kontrollerade: tabellsvaren räknas inte till mastery och inte till aktuellt behov, och de justerar inte nivån. Talkompisar i fritt varv fortsätter att sänka nivån ("1 nej"). Viktning: "all kanske?" och "tre?". Det är infört som B7, preliminärt.
- Agentens påpekande: Ett feltryck på 5 · 3 inne i en multiplikationsuppställning i vanlig träning räknas som fel i uppställningen och kan sänka nivån. Appen skiljer inte feltryck från räknefel där.
- Kvar: Simon ska godkänna förslaget, bekräfta B7 och välja ordning.

## 2026-11-18: B6 rättad och kravet för fel tabellfaktum behålls

- Simons besked: "1, håller med dig" om kravet: det behålls för fel tabellfaktum men tas bort för räknar med starttalet. Om B6: "Tabellträning är också mängdträning, som fri träning." Agentens tolkning "bara tabellträning" var fel och är struken. Simon godkände upplägget i tabellen under B6 i STYRNING avsnitt 10.
- Agentens rättelse: Tabellen sa först att talflyt bara blir misstanke när felet upprepas. I dag visas en talflytsmodell redan vid ett fel, märkt "Enstaka svar". Upplägget innebär därför en ändring för talflyt.
- Kvar: Simons godkännande av förslaget och valet av ordning, med screening först eller elevrapporten först.

## 2026-11-18: Beslut B1–B6 och förslag om en tolkning per svar

- Simons besked: "Jag håller med i dina rekommendationer, jag tänker att tabellträning är mängdträning." Besluten är införda i STYRNING avsnitt 10, punkt 5.
- Agentens tolkning, ej bekräftad: bara tabellträning är mängdträning. Talkompisar, dubblor och talbilder analyseras då som vanlig träning.
- Logg: Förslaget ligger i `docs/FORSLAG_EN_TOLKNING_PER_SVAR.md`. Det består av en funktion `interpretAnswers` som alla lärarvyer läser, med reglerna B1–B6, motexempel utan tak och dolda svar i alla vyer. Det ska genomföras i sex steg, där screeningvyn kommer först. Regelversionen för felmodellerna höjs inte, så befintligt uppföljningsmaterial gäller fortfarande.
- Underlag för B1: av de sju modeller som i dag kräver tre uppgifter har bara "Angränsande produkt" slumprisk över 2. Den förutsäger 3,88 svar per uppgift.
- Parkerat: Inget byggs förrän Simon har godkänt förslaget och besvarat de tre frågorna i dess avsnitt 6.

## 2026-11-18: Granskning av tolkningen av elevsvar

- Simons besked: Granska om felförståelseanalysen och presentationen är harmoniska och har dokumenterade beroenden och flöden. Tidigare beslut får ifrågasättas. Var noggrann och linda inte in något. Granskningen ändrar ingen kod.
- Logg: Rapporten ligger i `docs/GRANSKNING_TOLKNING_AV_ELEVSVAR_2026-11-18.md`. Den beskriver åtta tolkningskällor och elva krockar, av vilka fem är allvarliga. Den tar upp sex beslut att pröva, B1–B6, och granskar agentens egna ändringar 17–18/11.
- Rättelse: Agenten påstod 18/11 att fel som klassats som ouppmärksamhet inte sänker elevens nivå. Det stämmer inte. Mastery räknar dem som fel, och den adaptiva svårigheten sänks mindre.
- Parkerat: Inget byggs förrän Simon har svarat på B1–B6 och godkänt ett separat förslag om en gemensam tolkning per svar.

## 2026-11-18: Fel räknesätt räknas som kunskapsfel i lärarvyerna (val A)

- Simons besked: Publicera felförståelsekartan (1, ja). För fel räknesätt som sparats som ouppmärksamhet gäller val A: bara lärarvyerna ändras, inte elevens nivå eller uppgiftsval.
- Produktion, felförståelsekartan: GitHub master c9074f5, Verify är grön och Vercel sekvens är klar. I klass 6 granskades 47 rutor. 74 fel svar visas med aktuell förklaring och 57 med historisk etikett. Inget svar har en aktuell förklaring ovanför men en historisk etikett i listan.
- Logg: `teacherErrorCategory` i `src/lib/practiceObservation.js` avgör vilken felkategori lärarvyerna räknar. Ett fel som sparats som ouppmärksamhet räknas som kunskapsfel när den aktuella klassificeringen känner igen fel räknesätt. Det gäller katalogens modeller för fel räknesätt (`SCREENING_SINGLE_MODELS`). Regeln används av Elevprofilens nivåtabell, NCM-panelerna, analysunderlaget, elevexporten och felförståelsekartan, där sådana svar nu också visas i listan. Mastery, den adaptiva nivån, sparandet och de lagrade lärarsammanfattningarna är orörda. Exportens kolumner för dagens och veckans ouppmärksamhetsfel kommer från den lagrade sammanfattningen och kan därför fortfarande räkna sådana svar som ouppmärksamhet.
- Produktion, val A: Simon svarade "Ja" på frågan om publicering. GitHub master 63d09b6, Verify är grön och Vercel sekvens är klar. I klass 6 granskades 43 rutor i felförståelsekartan. 66 svar visas med aktuell förklaring och 53 med historisk etikett. Tre svar med fel räknesätt syns nu i listorna, och inget svar visar olika förklaring i avsnittet ovanför och i listan.
- Verifiering: Testet kontrollerar 402 − 178 = 580 sparat som ouppmärksamhet. Det räknas nu som kunskapsfel, visas i felförståelsekartans lista med fel räknesätt, och den historiska kategorin finns kvar i exporten. 999 räknas som ouppmärksamhet som förut, och den sparade posten är oförändrad. 1397 tester gick igenom, utom de två kända NCM-radslutsfelen. Build är grön. Nio robotar för lärarvyerna är gröna med 0 regelbrott. Inga felmodeller ändrades.

## 2026-11-18: Felförståelsekartan för klassen visar aktuell förklaring och genomgång av motsägelser

- Simons besked: Det nya ska synas när det finns. Leta vidare efter liknande motsägelser. En tydlig bild av elevens förståelse utan motsägelser genom hela appen är bland det viktigaste.
- Logg: I felförståelsekartan för klassen, Statistik & stöd, namnges ett fel svar i listan nu med den aktuella förklaringen, märkt "beräknad förklaring", när en sådan finns. Det är samma förklaring som i avsnittet "Aktuella modellkandidater" ovanför. Den sparade etiketten, till exempel "Räknefel" eller "Missuppfattning", visas bara när inget förklarar svaret nu. Chippen heter "Historiska felmarkeringar utan aktuell förklaring" och räknar bara sådana svar. Inga sparade elevdata ändras.
- Verifiering: Roboten `teacher-evidence-consistency` var röd mot den gamla vyn. Listan visade då "historisk kategorimarkering, Missuppfattning" för 376, medan förklaringen ovanför var "Större minus mindre i varje kolumn". Med ändringen är roboten grön, och skärmbilden är granskad. Ett enhetstest kontrollerar det förklarade och det oförklarade fallet. 1396 tester gick igenom, utom de två kända NCM-radslutsfelen. Build är grön. Inga felmodeller ändrades, så täckningen är oförändrad. Ändringen är inte publicerad.
- Genomgång av andra vyer: Elevanalysens reservhypoteser använder bara sparade mönster för svar utan aktuell förklaring, alltså samma princip. Exporten visar historiska och aktuella fält sida vid sida med tydliga namn. Dialogen i elevgenomgången beskriver uträkningens signaler och motsäger inte korten.
- Fynd som kräver beslut: Övningssvar med fel räknesätt, till exempel 402 − 178 = 580, sparas som "ouppmärksamhet" av `isOperationSwapInattention`. Den aktuella klassificeringen kallar samma svar "fel räknesätt" (`operation_swap`). Enligt Simons beslut 4 den 12 november är fel räknesätt en felförståelse. Felet räknas som "Ouppmärksamhet" i Elevprofilens nivåtabell och NCM-panelen. Samma kategori gör också att felet inte sänker mastery och inte styr den adaptiva nivån. Ändringen är inte gjord och väntar på besked.

## 2026-11-18: Tabellen beskriver fel svar som felförståelsekorten

- Simons besked: Fixa att tabellen och korten skriver olika saker, trots att det ligger utanför arbetsmålet belastningen. Kontrollera också om samma sak sker på andra ställen. Publicera när arbetet är klart och ingen återkoppling behövs.
- Fynd: Tabellcellen skrev "Fel svar utan identifierat mönster" när ett fel saknade uträkningssignalerna P, Ö och M. Korten använder hela klassificeringen med felmodeller och screeningnycklar. I produktion, klass 6, stod därför flera svar på felförståelsekort samtidigt som tabellen skrev att mönster saknades, till exempel 402 − 178 → 134.
- Logg: Cellen namnger nu felet med samma grupp och samma ord som korten och rutorna, till exempel "Fel svar, pekar på en felförståelse" och "Fel svar, oförklarat". Rutan som visas när man pekar på svaret nämner kortets titel. Regeln finns på ett ställe, `screeningAnswerGroup` och `SCREENING_GROUP_LABELS_SV`. Den används både av korten och av tabellen. Utan klassificering skriver cellen bara "Fel svar". Lärarens bedömning har företräde som förut.
- Täckning: Inga felmodeller, nycklar eller klassificeringsregler ändrades. Fördelningen mellan grupperna är därför densamma före och efter, och bara tabellens text har ändrats.
- Verifiering: En ny robotkontroll med 134, kortet Växling över nolla, och 999, oförklarat, var röd mot den gamla cellen: "Fel svar utan identifierat mönster". Med ändringen är den grön. Jag har också kontrollerat skärmbilden av roboten. Därtill gick 13 screeningrobotar igenom med 0 regelbrott. 1395 tester gick igenom, och de två kända NCM-radslutsfelen kvarstår. Build grön.
- Produktion: GitHub master f3186e4, Verify grön och Vercel sekvens klar. Kontrollen i webbläsaren gjordes i klass 6 på screeningen med 17 uppgifter. Alla sex fel i tabellen har samma grupp som korten: fyra pekar på en felförståelse, ett är en felmodell utan kopplad felförståelse och ett är oförklarat. 402 − 178 → 134 visas nu som "Fel svar, pekar på en felförståelse".
- Andra ställen: Elevanalysen bygger egna hypoteser och skriver till exempel "Enstaka svar" när underlaget är tunt. Den formuleringen är svagare men motsäger inte korten. Felförståelsekartan för klassen i Statistik & stöd visar övningssvar. Där kan samma svar stå under "Beräknade förklaringar" med en felmodell och i listan över kunskapsfel med den sparade etiketten "Räknefel" eller "Fel svar utan identifierat mönster". Listan är märkt "historiskt kunskapsfel", men beskrivningarna kan ändå krocka. Den ändringen har inte gjorts och väntar på Simons besked.

## 2026-11-18: Tabell och felförståelser i ett anrop

- Arbetsmål: belastningen.
- Mätning före: Felförståelsekorten begärdes först när tabellens anrop var klart, eftersom komponenten monterades först då. Felförståelseanropet upprepade sedan nästan alla tabellens databasläsningar: behörighet, elevlista, klassens alla screeningar, försöksindex, varje senaste försök med händelselista och varje lärarbedömning. I ett syntetiskt fall med 28 elever var det bara elevernas index (28 anrop) som var nytt. Båda orsakerna fanns. Dubbelarbetet var större, och en gemensam läsning tar också bort väntan.
- Logg: `view=results` ger tabell och felförståelser i ett svar. Korten byggs ur samma försök, original och bedömningar som tabellen, med samma postbyggare som elevanalysen (`screeningEvidenceEntry`). Elevens index läses parallellt och avgör som förut vilka försök som visas och i vilken ordning. Fel i kortdelen ger tabellen och ett felmeddelande för korten. De gamla vyerna finns kvar för flikar som öppnats före ändringen. Server-Timing visar `class-access`, `class-pupils`, `assignment-list`, `screening-results` och `screening-cards`.
- Belägg, lokalt och syntetiskt (50 ms per databasanrop, 28 elever, sex andra screeningar i klassen): produktionslikt fall med fyra svar 268 → 156 anrop, sekventiella varv till korten 30 → 13, till tabellen 13 → 13. Tätt fall med 112 svar 2068 → 936 anrop, 65 → 13 varv. Antalet läsvarv till tabellen är oförändrat. Bearbetningen av korten görs nu innan tabellen skickas. Med 112 svar och utan databasväntan tog den 0–16 ms, inom mätbruset. Behörighetsanropen utanför lagret är med före men inte efter. Det är alltså ytterligare några färre anrop. Tabell och kort är identiska med de gamla vägarnas svar i testet, också när ett försök saknas i elevens index. Inga felmodeller eller klassificeringsregler ändrade, så täckningen är oförändrad före och efter.
- Verifiering: 1394 tester gröna. Två fel uppstår i `scripts/audit-ncm-rule-readiness.test.js`. `docs/SCREENING_SELECTION_PRINCIPLES.md` är oförändrad i git, men den nya checkouten har CRLF. I den äldre checkouten vid 80d20ff har filen LF, och där passerar testet. Felet beror alltså på radslut, inte på ändringen. 7c4f998 på `codex/audit-three-fixes` rättar det. Build grön. 30 screening- och diagnosrobotar gröna mot servern från denna gren, en överhoppad sedan tidigare. `screening-misconceptions` kontrollerar nu också vägen från kort till markerat svar och dialogen med elevens svar 376 och inmatningsförlopp. Efter omladdning ska lärarens val synas på kortet.
- Simons besked: Minska väntan från vald screening till synliga kort. Gör en kort mätning och välj den minsta motiverade ändringen. Publicering kräver eget besked.
- Agentens val: Ingen parallell start av två anrop på klienten, eftersom det inte minskar databasarbetet. Postbyggaren bröts ut ur elevanalysens läsning så att båda klassificerar likadant.
- Publicering: Simon gav beskedet "Kör produktion". GitHub master 97edf4b, Verify passerade och Vercel sekvens driftsatte produktionsversionen för matematik.ximon.se.
- Produktionskvittens: Mätningen gjordes 2026-11-18 på en screening med 28 rader. Det var den senaste med 28 elever, inte samma screening som 2026-11-17, och den hade bara ett svar. Tre varv växlade mellan gamla och nya anrop. Median för gamla anropen: tabell 3,04 s, felförståelser 3,42 s och båda i följd 6,45 s. Median för nya anropet: 3,07 s för tabell och kort. Korten kommer alltså ungefär samtidigt som tabellen, och den totala väntan halverades. Tiderna gäller API-tid inklusive JSON, utan rendering. De gamla vyerna svarade fortfarande. Server-Timing för nya anropet: total cirka 2,88 s, varav `class-pupils` cirka 1,7 s, `assignment-list` 0,38 s, lärarinloggning och klasskontroll 0,19 s vardera, `screening-results` 0,49–0,54 s och `screening-cards` 1 ms.
- Webbläsarkontroll i produktion 2026-11-18: Testet gjordes med adminkontot i klass 6 på en screening med 17 uppgifter och 12 elever. Ett anrop (`view=results`) tog 2,77 s. Tabellen och felförståelsekorten visades samtidigt, 3,05 s efter klicket. Fyra kort och två rutor under Övrigt visades, utan något mellanläge där korten fortfarande hämtades.
- Kvar: Den största återstående delen är `class-pupils`, alltså kontrollen att varje elev finns kvar i klassen. Den läser varje elevs hela profil, ett nytt förslag. Den lokala commiten a51445f, som begränsar hämtningen av screeninglistor när Screening öppnas, ligger på en annan gren och ingår inte här.

## 2026-11-17: Felförståelser läser försök från vald screening

- Logg: Välj senaste försök per elev och uppgift före läsning av sparade händelser. Behåll medlemskap i båda indexen, klass- och identitetskontroller samt versionsbunden lärarbedömning.
- Belägg: Samma syntetiska fall gav 26 → 1 läsningar av händelselistor och 400 → 100 ms med simulerad väntan. Regressionen gav samma elevsvar och lärarbedömning före och efter. Inga ändrade felmodeller eller klassificeringsregler. Täckningen jämfördes i testfallet, ingen ny mätning på riktiga elevsvar.
- Verifiering: 256 testfiler, 1396 tester och produktionsbuild gröna. Sju relevanta robotar gröna utan regelbrott. Granskad lokal rendering visar felförståelsekort, lärarens val och kopplingen till svarstabellen.
- Simons besked: Slutför arbetet enligt den godkända planen utan uppehåll mellan arbetsmoment som inte kräver beslut.
- Agentens val: Smal serverändring. Evidensläsningen för elevhistorik fortsätter använda det breda urvalet. Resultattabell och felförståelser använder fortfarande två anrop.
- Parkerat: Publicering kräver eget besked. Mät sedan tiden från vald screening till synliga kort innan ett beslut om att slå ihop anropen.

- Publicering: Simon har godkänt publicering av detta screeningpaket via GitHub. Ren publiceringsgren från 303e6f4 med enbart screeningpaketet. På den grenen passerade 1 391 tester, produktionsbygget och fem riktade robotar.
- Produktionskvittens: GitHub master 16745bb, Vercel sekvens READY med motsvarande SHA och matematik.ximon.se. Tre sekventiella par av autentiserade GET-anrop per version på samma screening. Median för felförståelser: 5,74 → 4,79 s. Median för tabell och felförståelser tillsammans: 8,82 → 7,98 s. Samma 28 rader, 28 elever i analysvaret och fyra svar per prov. Tiderna inkluderar mottagning och JSON-avkodning, men ingen rendering. En screening, ingen generell uppskattning.
- GitHub Verify passerade för 16745bb, inklusive test, build och navigationsrobotar.

## 2026-11-17: Auditfix 1 – NCM-kontrollens radslut

- Logg: Referenshashen normaliserar nu CRLF/CR till LF. Faktiska innehållsändringar avvisas fortfarande. 3 riktade tester samt hela Vitest (256 filer, 1394 tester) och build godkända lokalt.
- Simons beslut: Genomför tre små auditfixar; billigare modeller får delegerade uppgifter. Ingen push eller publicering.
- Agentens val: Isolerat worktree från 303e6f4, NCM-fixen delegerad till gpt-6-luna och diffen granskad av huvudagenten.
- Tankar: Kontrollen ska upptäcka ändrat underlag, inte Windows-radslut. Felmodeller och screeningtäckning är oförändrade.
- Parkerat: Övriga belastningsförslag kräver avgränsning och eget genomförandebeslut.

## 2026-11-16: Driftfel, elevkonto utelåst ("Kunde inte spara svaren")

### Logg

- Simons elevkonto (profil 4,0 MB, över 10 000 sparningar) kom inte in i
  Chrome eller DuckDuckGo. Andra elever fungerade. En ny webbläsare utan kö
  kom in.
- Orsak, hittad med en loggrad (83d19b5): databasskriptet för elevprofilen
  avkodade hela profilen två gånger och överskred databasens tidsgräns
  (`ERR Error running script: execution timed out`). Inloggningen skickar
  först kön från enheten och stoppas om den misslyckas.
- Rättning: versionsnumret skrivs först i posten och läses ur textens början;
  klasslistan skickas som eget argument. Äldre poster avkodas en gång.
  Skriptet provat i Lua-tolk (fengari, 9 fall), enhetstest låser formen,
  25 robotar för sparande, klasser och radering gröna.
- **Avbrott ca 22.20–22.27 för alla elever (2d41a76).** Databasens Lua
  kraschade på `tonumber` när mönstret inte matchade, alltså för varje
  befintlig profil. Lokala Lua-tolken var en nyare version och missade
  det. Rättat i 7d95100; sparande bekräftat i produktion. Svar från
  avbrottet låg kvar i elevernas köer.
- Kön på Simons enhet var tusentals närvarosignaler och tog lång tid.
  Byggt på Simons "bygg": äldre checkpoints som den senaste täcker skickas
  inte (bekräftas lokalt först när den senaste är mottagen), och en kö som
  servern inte tar emot låser inte längre ute eleven; svaren ligger kvar i
  kön. 551 klienttester och 31 elevrobotar gröna.

### Simons beslut

- Bygg: inloggning släpps trots kö, närvarosignaler slås ihop.

### Agentens val

- Ingen ny datanyckel: versionen läses ur samma post, så ingen migrering
  och inga andra skrivvägar påverkas.
- Lärdom: Lua-skript provas mot databasens egen Lua-version, inte bara en
  lokal tolk.

### Tankar och parkerat

- Lokala lagringen kan stängas mitt i ett sparande vid utloggning eller
  elevbyte (InvalidStateError); bryter R4. Robot först, sedan rättning.
- Profilen 4,0 MB närmar sig Vercels svarsgräns 4,5 MB; steg 4.

## 2026-11-16: Belastning steg 1 klart, steg 2 byggt lokalt

### Logg

- Katalogen i produktion: 13 s → 1,05–1,47 s varm; 422 → 5 databasanrop.
  En mellanversion blev långsammare (gruppanrop i följd, 2,0–2,5 s) och
  rättades med parallella gruppanrop.
- Klart-villkoret för steg 1 justerat: enkla anrop tar redan 0,75–0,87 s
  (region iad1), så under en sekund går inte för katalogen.
- Steg 2 lokalt: Screening läser bara de klasser fliken behöver. Robot räknar
  anropen.

### Agentens val

- Lästa klasslistor sparas tills Läs om, så flikbyten inte läser om.

### Tankar och parkerat

- En annan session bytte gren i samma mapp; agentens commits hamnade på
  dess gren och master flyttades fram utan att röra dess filer. Egen
  arbetskopia per session undviker det.
- Kandidat: serverns region närmare användare och databas.

## 2026-11-16: Belastning steg 1, mätt och förfinat

- Publicerat 0351a78. Mätt: katalogen 13 s → 1,6–1,8 s varm, också efter
  två minuter (förut alltid kall). Första anropet efter driftsättning var
  kallt (14,6 s) eftersom inga kort fanns.
- Återstående tid: två databasanrop per elev för raderingskontroll (422 för
  211 elever). Nu ett gruppanrop per 50 elever (`deletedStudents`).
  Lokalt, test och robotar gröna.
- Tanke: samma mönster (en kontroll per elev) finns i screeningens
  utdelning och läsning; tas i steg 2 och 3 där det berör.

## 2026-11-16: Belastning steg 1, katalogkortens livstid

### Simons beslut

- Styrdokumentet `docs/STYRNING_BELASTNING.md` godkänt; korten lever ett dygn.

### Logg

- Katalogkorten lever ett dygn i stället för 60 s. Kontrollerat att varje
  skrivning som ändrar kortets fält går via `mutateStudentRecord` och tar
  bort kortet (namnbyte, klassflytt, klassåterställning, ny elev,
  inloggning); radering städar kortet. Arkiv- och screeningskript läser bara
  att profilen finns.
- Nytt test låser livstiden. API-tester och 17 robotar för katalog och
  klasser gröna. Mätning i produktion efter publicering.

## 2026-11-16: Belastning, baslinje och styrdokument (förslag)

### Logg

- Codex arbete (tabellöversikten förvald till Denna termin) inplockat i master.
- Baslinje i produktionen med inloggad lärare, skrivskyddat: se
  `docs/STYRNING_BELASTNING.md` avsnitt 3.
- Förslag till styrdokument för belastningen, väntar på Simons godkännande.

### Rättelse

- 2026-11-14 skrev agenten att lärarvyn hämtar 44 MB varannan minut. Fel:
  lärarvyn hämtar en lätt katalog (62 kB). Men servern läser alla
  elevprofiler, ca 44 MB, för att bygga den varannan minut, eftersom
  katalogkorten lever 60 s och lärarvyn uppdaterar var 120:e s.
- Elevens sparande skickar inte hela profilen för QR/PIN-elever, bara
  händelser. Men servern läser och skriver hela profilen vid varje sparande.

### Tankar

- Den största och enklaste vinsten är katalogkortens livstid.

## 2026-11-16: Denna termin som standard i tabellöversikten

- Simons beslut: sätt Denna termin som förinställt enbart i tabellöversikten.
  Det ersätter förslaget att visa äldre tider när vald period saknar tider.
- Eget val: separat webbläsarsparat periodval för översikten; utvecklingsvyn
  behåller sitt periodval. Inga nya serveranrop eller ändrad elevlagring.
- Lokalt på `fix/table-overview-persistent-times`: build, riktad lint,
  projektkarta och fem berörda webbläsartester passerar. Render granskad.
  Repoets testsvit (andra worktrees exkluderade): 1381 passerar, två
  NCM-audittester faller. Oförändrad referensfil har CRLF; LF-normaliserad
  kontrollsumma matchar auditens förväntade värde exakt.
- Ingen commit, push eller publicering. Stoppregeln vid röd testsvit gäller.
  Parkerat utanför uppdraget: NCM-referensens radbrytningskontroll.
- 2026-11-16: inplockat i master av Claude på Simons uppdrag, efter samma
  kontroller (de två röda är de kända CRLF-felen) och tre berörda robotar.

## 2026-11-16: Samlade önskemål, väntar på att hastighetsarbetet blir klart

Simon arbetar med hastigheten i master och vill inte störa den. Dessa punkter
är samlade för att byggas senare, i den här ordningen.

### 1. Antal inlämnade direkt i screeninglistan

- Önskemål: i Resultat av screening ska listan visa hur många som lämnat in,
  utan att man först öppnar screeningen.
- Idag: `ScreeningResultsCollections.jsx` visar status, datum, antal uppgifter
  och mottagare. Inlämningsstatus per elev finns bara i den tunga läsningen
  `diagnosticClassOverview` (fältet `submitted` per elevrad), som hämtas när
  läraren klickar på en screening.
- Simons beslut: testa variant 1 — servern räknar antalet elever med allt
  inlämnat redan i `/api/teacher-diagnostic-assignments`, så listan slipper en
  extra hämtning per screening. Mät vad räknaren kostar på listhämtningen; det
  avgör om den får stanna eller måste göras lat i stället.

### 2. "N visade felsvar" säger inget — behövs en nämnare

- Problem: i Statistik och stöd står det `6 visade felsvar från återhämtningen`
  utan nämnare. Går inte att läsa om det är 6 av 6 eller 6 av 75.
- Orsak: siffran är inte en räkning utan ett tak. `buildAdaptiveSupportSignal`
  i `src/lib/masteryCalculation.js` gör `.slice(-6)` på de matchade felsvaren,
  så etiketten i `dashboardStudentRowHelpers.js` visar längden på den kapade
  listan. Hela mängden finns i `evidenceObservationIds`.
- Att bygga: visa den riktiga nämnaren, inte takets längd.

### 3. Förenklad elevprofil i Statistik och stöd

- Önskemål: en enklare vy, i stil med "Elevprofil (allt om en elev)", som inte
  radar upp varje felsvar. Det Simon behöver är hur många fel, under vilken
  tid, och vilken sorts misstänkt felförståelse.
- Underlag som redan finns: `errorBreakdown7d` (kunskapsfel kontra
  slarvfel), periodfälten `currentDay`, `currentWeek` och `rolling30Days`, samt
  `errorPatterns` och `errorDetail` per felsvar i stödsignalen.
- Oavklarat: vilken tidsperiod vyn ska utgå från, och om felförståelserna ska
  grupperas per räknesätt eller per mönster.

- Önskemål: en enklare vy, i stil med "Elevprofil (allt om en elev)", som inte
  radar upp varje felsvar. Det Simon behöver är hur många fel, under vilken
  tid, och vilken sorts misstänkt felförståelse.
- Underlag som redan finns: `errorBreakdown7d` (kunskapsfel kontra
  slarvfel), periodfälten `currentDay`, `currentWeek` och `rolling30Days`, samt
  `errorPatterns` och `errorDetail` per felsvar i stödsignalen.
- Simons beslut: rullande 30 dagar förvalt. Felförståelserna grupperas per
  räknesätt, med mönstren som underrader: räknesättet och antalet fel som
  rubrik, därunder varje `errorPatterns`-kod med sitt antal. Skälet är att
  koderna i praktiken redan hör till ett räknesätt, och att det är per
  räknesätt undervisningen planeras.

## 2026-11-15: Tre saker Simon bad om före belastningen

### Simons önskemål

- En omladdning ska inte skicka tillbaka till förstasidan.
- Godkänna och dela ut uppföljningsmaterial tog lång tid i två steg; ett
  klick för båda.
- Ett avslutat screening ska inte se ut att kunna avslutas igen.

### Logg

- Arbetsytan, screeningfliken, resultatvyns mottagare och vald screening
  sparas i `sessionStorage` (`src/lib/sessionState.js`): kvar vid
  omladdning i samma flik, ny flik och ny inloggning börjar från början.
  Delvyn sparades redan i `localStorage`. Robot laddar om och kontrollerar.
- Materialgranskningen har knappen *Godkänn och dela ut*. Servern gör
  åtgärden `approve_publish` med en förhandsvisning i stället för två och
  utan omläsning däremellan. Tvåstegsvägen finns kvar. Didaktikroboten för
  addition använder ett klick, de andra två steg.
- Avslutad screening visar *Avslutad* i stället för knappen; *Lämna in
  pågående (N)* visas bara om påbörjade svar finns kvar. Tabellen läses om
  efter avslut. Gruppåtgärden *Avsluta …* går inte att välja när alla
  markerade redan är avslutade.

### Agentens val

- Begärd screening (från knappen Resultat och avslut) sparas inte, så att en
  senare egen markering inte skrivs över efter omladdning (R1).
- Ingen mätning av tidsvinsten i produktion ännu; den görs i
  belastningsarbetet.

## 2026-11-15: Behörighet för screeningresultat och de äldre röda robotarna

### Simons beslut

- Ja till att klassåtkomst styr screeningresultat och bedömning av svar.
- Ja till att rätta de sju äldre röda robotarna före belastningen.

### Logg

- Screeningens resultat-API kräver inte längre administratör; klass- och
  elevkontrollerna är kvar. Felförståelseroboten körs som klasslärare.
  Behörighetstabellen i `ORGANISATION_OCH_INLOGGNING_KONTRAKT.md`.
- Ett verkligt fel (R2): vald delvy i lärarvyn (sedan 04ceec7, 11 nov)
  tappades vid omladdning, så valt underlag doldes. Delvyn sparas nu per
  arbetsyta i `localStorage` som övriga vyval. Roboten för
  tabellutveckling fångade felet.
- Föråldrade robotar uppdaterade efter avsiktliga ändringar: delvyer
  (tabellträning, felmönster, tickets), elevens klass efter namnet i
  gruppvalet, räknehäftets läge mäts mot rutnätet i stället för mot skärmen
  (sidan scrollar när en lägre knapp klickas).
- Hela robotsviten: 200 gröna, 12 överhoppade, 8 röda vid parallell körning;
  alla 8 gröna en i taget. Instabila under last: uppdrag via länk, låst
  uppdrag, screening till en elev, skrivsvar med teckning, talpar genom alla
  nivåer, kort division, rensning av bekräftade händelser.

### Tankar

- Robotsviten är instabil vid fyra parallella arbetare på den här datorn
  (seed-fel efter 0,1 s, tidsgränser). Värt en egen översyn av tidsgränser
  eller antal arbetare; inte gjort.

## 2026-11-15: Målet nått; genomgång av helheten inför belastningen

### Simons beslut

- Målet "felförståelser tydliga för läraren" är nått och bekräftat. Frysningen
  är upphävd. Nästa arbetsmål: belastningen.
- Före belastningen: kontrollera dokumentation, beroenden, kontrakt och kod.

### Logg

- Styrdokumentet och `AGENTS.md` säger att målet är nått och att
  belastningen är aktuellt mål; rutinen för felmodeller gäller fortfarande.
- Rättat en felaktig uppgift som agenten skrivit: screeningvyn använder samma
  klassning som täckningsräkningen, men **elevrapporten bygger sina kort
  separat** och visar inte felförståelserna eller lärarens val ur listan.

### Genomgångens fynd (läsning, inget ändrat utöver texterna ovan)

- Elevrapporten visar felmodeller (t.ex. "Minnessiffran glöms"), inte
  felförståelserna som screeningkorten visar, och inte lärarens val.
- Värmekartan i Statistik & stöd räknar modellträffar direkt: inga
  felförståelser, inget krav på mönster, slarv räknas med.
- `docs/PUPIL_ANALYSIS.md` (9 nov) beskriver taket på åtta och saknar
  felförståelser, samma uppgift flera gånger, ger upp och Fler misstankar.
- `ARCHITECTURE.md` saknar felförståelselagret, den gemensamma klassningen
  och screeningvyns API.
- MCP:s rapportsammanfattning tar med `moreHypotheses` och
  `repeatedTasks` råa, med alla referenser.
- Vite varnar: `ncmScreeningTasks.v1.json` importeras med och utan
  `type: 'json'`.
- Screeningvyns API saknar enhetstest för åtkomst; bara robot.
- Hela robotsviten har inte körts efter ändringarna; CI kör två robotar.
- Kartkorten `rules` och `analysis` beskriver läget i oktober.
- Ospårade filer från en annan session (syntetisk klass) ligger i arbetskopian;
  den syntetiska klassen och blindtestklasserna finns i produktion.
- `misconceptions.js` har 792 av 800 tillåtna rader.

### Åtgärdat efter genomgången (samma dag, lokalt)

- JSON-importen, MCP-sammanfattningen (räknar listorna), behörighetstest för
  screeningvyn, felförståelsefilen delad (innehållet oförändrat).
- Elevrapporten: felförståelsen som kortrubrik, felmodellen under; lärarens
  val ur listan som egen del (`teacherMisconceptions`).
- `PUPIL_ANALYSIS.md`, `ARCHITECTURE.md`, kartkorten `rules`,
  `analysis` och `matrix`.
- Hela robotsviten: 195 gröna, 12 överhoppade, 13 röda. Fem var tillfälliga
  (gröna en i taget). Sju felar likadant på koden från före 11 november och
  är äldre fel: tickets från startsidan, räknehäftets geometri vid tema,
  gruppval över klassfilter, framsteg med många tabeller, tabellutveckling,
  felunderlag i klassvyn, lärarvyns huvudrobot. En var föråldrad efter
  78448e2 (klasslärare ser Screening) och är rättad.

### Fynd som kräver Simons beslut

- Screeningens resultat-API (`teacher-diagnostic-attempts`) kräver
  fortfarande administratör, fast klasslärare sedan 78448e2 når Screening.
  En klasslärare kommer alltså in men får troligen fel under Resultat, även i
  felförståelsedelen.
- Sju äldre röda robotar: rätta eller uppdatera dem som eget arbete.

## 2026-11-15: Rättelse: testklasser blandades in som riktiga elever

### Logg

- Vid kontroll av räknehäftena syntes att flera "oförklarade svar från
  riktiga elever" kom från Simons testkonto (Lärare), *Test – felmönster* och
  blindtestklasserna. Listan hade bara räknat bort klassen *Syntetisk*.
- Tre av v13-modellerna bygger bara på påhittade elever: en av växlingarna
  minskar inte, sista minnessiffran glöms, fel tabellfaktum i uppställningen.
  Räknar med starttalet bygger på ett riktigt svar och ett blindtest.
- Deras källa säger nu det; modellprofilen visar det. Rutinen i
  styrdokumentet kräver att klassen kontrolleras innan ett svar blir underlag.
- Riktiga elever, klass 6, i räknehäftena: 3,26 + 8,37 = 10,63 (3 + 8 skrivs
  som 10), 1,613 (13 skrivs ut utan växling), 11,83 (oklart);
  6,27 − 5,84 = 12,13 och 1,112 (adderar fast det är minus; den ena skrev
  själv +). Inga nya modeller av dem.

### Simons beslut

- "Följer ditt förslag": behåll modellerna med ärlig källa, notera att
  blindtest 2 och 3 inte längre är blinda för dessa fel, rätta listorna.

### Tankar

- Blindtesterna förlorar värde när modeller byggs på deras svar. Nya
  blindtester behövs om dessa fel ska mätas oberoende.
- Klassnamn räcker inte som skydd; en markering av testklasser i datan vore
  säkrare. Inte byggt.

## 2026-11-14: Steg 5, tredje omgången: Geminis tolkningar, efterräknade

### Logg

- Simon klistrade in Geminis tolkning av de oförklarade svaren. Agenten
  räknade efter varje förklaring och delade dem i "stämmer" och "gissning".
- Sex nya modeller (v13), alla utanför den frysta kedjan; se styrdokumentet,
  steg 5. Frysta kedjan 456 av 456 kort oförändrade. En krock hittad och
  rättad: 2,1 · 2 = 4,1 passar både bara heltalet och addition, så den nya
  modellen gör inte anspråk på sådana svar.

### Simons beslut

- "Håller med dig": bygg de efterräknade modellerna, inte gissningarna; 432
  bara som förklaring.

### Agentens val

- Räkna med starttalet och fel tabellfaktum i uppställningen kräver tre
  olika uppgifter (svar nära facit, samma slumprisk som angränsande produkt).
- Fel tabellfaktum gäller bara fel tabellrad (7 · 6 som 6 · 6 eller 6 · 8);
  fel i andra faktorn räknas redan av angränsande produkt.

### Tankar

- 732 − 458 = 273 är ett för lite i en växling och talar emot att starttalet
  räknas med varje gång. Håll ögonen på fler ±1-svar vid växling.
- Gemini är ett bra bollplank men gissar ibland; räkna alltid efter.
- `misconceptions.js` har 792 rader; nästa tillägg kan behöva dela filen.

## 2026-11-14: Steg 1-skulden: lärartext och rubriker

### Logg

- Förslag för alla 42 modeller som saknade lärartext (23 med ogranskad
  rubrik) i `Hermes Vault/Skola och lektioner/Matematik/Felmodeller-lartext-for-granskning-2026-11-14.md`.
- Inlagt efter granskning: lärartext och samtalsingång i
  `modelDescriptions.js`, 14 nya rubriker i katalogen. Listorna över
  väntande texter och rubriker är tomma; katalogtestet håller dem så.

### Simons beslut

- "Listan ser bra ut": alla förslag godkända som de stod.

### Agentens val

- Vardagliga ord i rubrikerna: "talet som ska delas" i stället för täljare vid
  division, "talet framför bokstaven" i stället för koefficient.

### Källa och slumprisk (steg 1 klart)

- `modelProfile.js` räknar fram källa och slumprisk per modell ur befintliga
  data; test kräver båda och spärrar beslut 3. Tabell för läsning:
  `docs/coverage/model-profile.md`.
- Två modeller förutsäger fler än två svar per uppgift: skalad med tiopotens
  (observation) och angränsande produkt (kräver redan tre uppgifter).
- Tanke: 36 av 80 modeller har bara agentens förslag, godkänt av Simon, som
  källa. De är kandidater för NCM-boken eller fler riktiga svar.

### Kvar

- *Gäller när* finns bara i beräkningskoden, inte som eget fält.

## 2026-11-11 – 2026-11-14: Felförståelser tydliga för läraren (screening först)

Styrs av `docs/STYRNING_FELFORSTAELSER.md` (antagen 2026-11-11). Detaljer per
steg står där; kartkortet `misconception-governance` har beslut och belägg.
Den här posten är översikten: vad som gjordes, vem som beslutade vad, och
tankar som inte får tappas.

### Varför

En genomgång av 17 884 riktiga svar (2026-11-11) visade att appen räknade
fel men inte visade *tänkandet*: 74 % av felen var oförklarade, och 0 av 48
NCM-screeningfrågor hade struktur för analys. Simon: målet är mängdträning och
att fånga felförståelser, för individ och grupp, och göra dem "så jävla
tydliga för läraren". Hur läraren går vidare är fryst tills dess.

### Logg

- **11 nov.** Läraren kan bedöma screeningsvar (räkna som rätt, skriva in
  glömt svar, anteckna felförståelse); eleven varnas för tomma svar (e72973c).
- **12 nov.** Styrdokument och frysning (9fdfc22). En katalog för alla
  felmodeller med testspärr (e3af7d8). Täckningsräkning: varje fel räknas en
  gång (1f218a7). Decimalsvar når modellerna (cba7d3b, 342 svar). Nio modeller
  ur Simons läsning av oförklarade svar och signalen *ger upp* (397a88a).
- **13 nov.** *Samma uppgift fel tre gånger* (5b7f060). 46 felförståelser ur
  Simons två tabeller, NCM och "Förstå och använda tal", godkända av Simon
  (49caf3e, be6ffa0). Nycklar för NCM-frågorna, godkända (a61b60b, 33b543e).
  Steg 4: felförståelsekort i Screening → Resultat (a17db23, f8e4036). Läraren
  väljer felförståelse ur listan (06fc07f).
- **14 nov.** Två omgångar med Simons tolkningar ur produktionens
  screeningar: fem nya modeller, nycklar, tal ur lärarens egna frågor, v12
  (9cb7eea, 92cf2cb, 848b556). Rutin: läs uppställningen och pröva
  avskrivningsfel först (508730f). Steg 4 prövat i produktion på Kumlaby åk 6;
  intern text dold för lärare och tabellen scrollar till inramat svar
  (a08b47b). Elevrapporten visar alla misstankar, de svagare mindre (b150cdc).

### Siffror

| | Före | Efter |
| --- | ---: | ---: |
| Oförklarade fel, alla riktiga svar (2 889 fel) | 74 % | 1 247 st |
| Kumlaby åk 6, screening 11 nov: svar på felförståelsekort | 6 | 18 |
| Kumlaby åk 6, screening 11 nov: oförklarade | 17 | 2 |
| Felmodeller i katalogen | 62 | 80 |
| Godkända felförståelser | 0 | 46 |

Den frysta uppföljningskedjan kontrollerades vid varje regeländring:
befintliga kort oförändrade (senast 440 av 440).

### Simons beslut

- 11 nov: styrdokumentet antas; fokus screeningar; frysning av kontrastfrågor,
  materialkedja, avstämning, didaktikpaket, nya lägen och vyer.
- 12 nov: angränsande produkt och fel räknesätt kräver mönster över tre olika
  uppgifter (beslut 3); fel räknesätt är en felförståelse (beslut 4).
- 13 nov: samma uppgift fel tre gånger fångas oavsett svar. Felförståelser,
  inte bara felberäkningar; även hastighet, fokus och arbetsminne. Alla 46
  felförståelser och alla handskrivna nycklar godkända. Steg 4 enligt skiss.
  Läraren väljer felförståelse ur listan.
- 14 nov: tolkningar av 7 × 6,7 = 91 (7 + 6 · 7 från vänster, positionsfel
  kombinerat), 3 × 2,4 = 6,2 (glömd minnessiffra) och 3,2 (bara decimaldelen),
  84 / 6 = 12 ("kanske" tabellen till 12), tre fjärdedelar av 8 = 24 och 7/8.
  Ja till tal ur egna frågor. Avskrivningsfel ska prövas när svar inte går
  att förstå. "Ta bort tak tror jag", svagare misstankar längre ner och
  mindre. Belastning parkeras tills målet är nått.

### Agentens val (på Simons "välj du" eller som förslag han godtog)

- Fel räknesätt visas på screeningkortet redan första gången, märkt *en
  gång*; elevrapporten behåller kravet på tre uppgifter; angränsande produkt
  omfattas inte (slumprisk).
- Nya modeller hålls utanför den frysta kedjan (inga kontrastfrågor).
- 84 / 6 = 12 visas som känt fel utan felförståelse tills Simon bekräftar.
- Elevrapportens åtta kort stäms av som förut; resten visas utan avstämning,
  så att avstämningen och MCP inte rörs.

### Tankar och öppna frågor

- Vad missförstås vid fel räknesätt: tecknet, uppmärksamheten eller när man
  adderar och subtraherar? Pröva senare med textuppgifter utan tecken.
- Nämnaren som svar: oklart om felförståelse.
- 1,76 + 2,58 = 432 är fortfarande oförklarat.
- Avskrivningsfel: 357 + 268 = 614 var 357 + 257 rätt räknat. En signal som
  jämför uppställningens tal med uppgiftens är billig (ingen extra läsning);
  inte byggd.
- Simons idé: inställning för om eleven ställer upp själv eller appen gör
  det, som vid kort division. Fryst (nytt läge).
- Ej mätt: obesvarade med uträkning i nya screeningar efter varningen.
- Granskningslista med oförklarade svar och förslag:
  `Hermes Vault/Skola och lektioner/Matematik/Oforklarade-felsvar-for-granskning-2026-11-14.md`.

### Parkerat: belastning (mätt 14 nov, skrivskyddat)

- Lärarvyns elevlista hämtar hela profilen för alla elever: 44 MB och 15 s för
  211 elever, automatiskt varannan minut.
- Elevens sparande skickar hela profilen (upp till 3,9 MB) var 30:e sekund.
- Screeningens felförståelsevy läser alla elevens screeningförsök: ca 12 s.
- Förslag i ordning: sammanfattad elevlista, sparande av bara nya svar,
  felförståelsevyn läser bara aktuell screening. Tas upp när målet är nått.

### Nästa

Skulden i steg 1: 42 modeller utan lärarbeskrivning och 23 rubriker som
väntar på granskning, som en granskningslista till Simon.

## 2026-03-25

### Fas 1 implementerad och pushad — masteryFacts

Permanent append-only mastery-logg som överlever problemLog-trimning.

**1a. masteryFacts i profilen + migration**
- `studentProfile.js`: ny `masteryFacts: { version: 1, facts: [], revokedIds: [] }` i `createStudentProfile()`
- `profileMigration.js`: `migrateMasteryFacts()` skapar facts automatiskt från befintlig problemLog vid första load
- `masteryCalculation.js`: ny `recordMasteryAchievement()` och `getMasteredLevelsFromFacts()`

**1b. Skrivning vid mastery-uppnående**
- `studentProfile.js`: `addProblemResult()` jämför mastery före/efter, skriver fact vid ny mastery
- `sessionUtils.js`: `recordTableCompletion()` skriver mastery-fact för tabellträning

**1c. Läsning med fallback**
- `computeEffectiveLevels()` och `computeMasteryOverview()` konsulterar masteryFacts som primär källa
- Fallback till problemLog-beräkning om facts saknas
- Retroaktiv fact-skrivning om mastery finns i log men inte i facts

**1d. Server merge**
- `api/student/[studentId].js`: `mergeMasteryFacts()` — union av facts (idempotent på id), dedup per operation+level (behåll äldsta), union av revokedIds

Referens-commit:
- `2b881fd` - Sync phase 1: permanent masteryFacts

### Fas 2 implementerad och pushad — Write-Ahead Log (WAL)

Event-baserad sync som komplement till hel profil-sync.

**2a. WAL-implementation**
- Ny `syncWal.js`: append-only event-logg i localStorage per elev (max 500 entries)
- Funktioner: `createWalEntry`, `appendToWal`, `getUnsynced`, `markSynced`, `pruneWal`

**2b. WAL-skrivning i klient**
- `addProblemResult()` returnerar `walEntries` (problem_result, mastery_achieved)
- `usePracticeCoreActions.js` skriver WAL-entries vid varje svar + table completion

**2c. Server-endpoint**
- `POST /api/student/{id}/events` — tar emot WAL-entries, applicerar idempotent på server-profil
- Stöder: problem_result, mastery_achieved, table_completed
- Returnerar ack-array för synkade entries

**2d. Sync-integration**
- `storageCloudSync.js`: `syncWalEntries()` skickar osynkade entries parallellt med hel profil-sync
- Dual-write under övergångsperioden (bälte och hängslen)
- Pruning av ack:ade entries efter 24h

**Beslut:** Fas 2e (immutable React-state) skjuts upp — hög risk, begränsat mervärde utöver Fas 0+1.

### Backup
Dumpade alla 44 elevprofiler från prod-KV till `backups/backup-elevprofiler-2026-03-24.json` (76 MB) innan Fas 2.

Referens-commit:
- `47aeb72` - Sync phase 2: Write-Ahead Log (WAL) for resilient event sync

### Fas 3 implementerad och pushad — Cleanup

**3a. Borttagen effectiveLevels-dubblett**
- `studentProfile.js`: slutar skriva `profile.effectiveLevels`
- `dashboardClassMasteryHelpers.js`: läser bara `teacherSummary?.effectiveLevels`

**3b. teacherSummary/effectiveLevels ignoreras vid merge**
- `api/student/[studentId].js`: `delete merged.effectiveLevels` + `delete merged.teacherSummary` efter merge — dessa är cache, inte source of truth

**3c. skillStates verifierad**
- `adaptive.skillStates` används aktivt av adaptiva motorn — behålls

**3d. Explicit merge-schema**
- Ny `profileMergeSchema.js`: varje profilfält MÅSTE ha definierad merge-strategi
- Ny `profileMergeSchema.test.js`: testar att alla fält i createStudentProfile + runtime-fält har strategi
- Fångar framtida fält som saknar merge-logik via test-failure

Referens-commit:
- `ace5afd` - Sync phase 3: remove duplicates, explicit merge schema, ignore cache fields

### Sync-arkitekturöversyn avslutad

Alla 4 faser implementerade och i prod:
- **Fas 0**: React-state efter merge, sendBeacon, snapshot-kö (commit `e2ab609`)
- **Fas 1**: masteryFacts — permanent mastery-logg (commit `2b881fd`)
- **Fas 2**: WAL — event-baserad sync med dual-write (commit `47aeb72`)
- **Fas 3**: Cleanup — dubbletter borta, merge-schema, cache ignoreras (commit `ace5afd`)
- **Fas 2e** (immutable React-state): Uppskjuten — hög risk, begränsat mervärde

## 2026-03-23

### Problemet
Elever (iPads i klassrummet) förlorade sina framsteg — gångertabeller som var gröna (klara) försvann plötsligt. Lärardashboarden visade inga nivåer för majoriteten av eleverna.

### Analys — systemiskt arkitekturproblem
Djupanalys av hela sync-lagret och träningssystemet avslöjade fem grundläggande brister:

1. **Mastery beräknas, aldrig lagrad.** `effectiveLevels` och `teacherSummary` räknas om från `problemLog` (max 5000 poster). Trimmas loggen → mastery försvinner. Servern räknar aldrig om efter merge.

2. **React-state uppdateras aldrig efter cloud merge.** `getOrCreateProfileWithSync()` returnerar lokal profil direkt. Cloud-merge körs async och skriver till localStorage, men React-state (`setProfile`) anropas aldrig med merged profil. Eleven jobbar hela sessionen med potentiellt gammal data.

3. **iPads tappar data tyst.** 90s sync-throttle + `beforeunload`/`pagehide` är opålitliga på iOS Safari. Retry-kön sparade bara `studentId`, inte profil-snapshot — om eleven loggade ut innan retry → data borta.

4. **Merge-logiken gissar.** `{...older, ...fresher}` spread: alla fält som inte explicit hanteras vinner baserat på freshness-timestamp. `undefined`-fält i "vinnande" profilen skriver över befintlig data. Nya fält i framtiden hanteras inte.

5. **Dubbla sanningskällor.** `effectiveLevels` på två ställen. `operationAbilities` kan säga multiplication=12 medan `effectiveLevels.multiplication=4`. `tableDrill.completions` och `effectiveLevels` kan säga motsatta saker.

### Vercel/KV-åtkomst uppsatt
Satte upp Vercel CLI mot projektet "sekvens" och hämtade KV-credentials. Kan nu köra queries direkt mot prod-datan: `node --env-file=.env.local -e "const { kv } = await import('@vercel/kv'); ..."`.

### Profilscan — 30 av 44 trasiga
Skannade alla 44 elevprofiler i prod:
- **30 profiler** saknade `teacherSummary` och `effectiveLevels` helt (= `undefined`)
- **Hugo** hade dessutom `currentDifficulty: 1` trots `highestDifficulty: 12` och alla `operationAbilities: 12`
- **14 profiler** (Simon, Juni, Jasmine m.fl.) var intakta — troligen pga stabil enhet (dator, inte iPad)

### Reparation
Skrev skript som beräknade `teacherSummary` + `effectiveLevels` från befintlig `problemLog` för alla 25 profiler med data. Hugos `currentDifficulty` fixades 1 → 12. Skrevs direkt till Upstash KV.

### Arkitekturplan
Skrev komplett plan i 4 faser: `docs/superpowers/plans/2026-03-23-sync-arkitektur-plan.md`
- **Fas 0** (akut): React-state efter merge, visibilitychange+sendBeacon, snapshot i retry-kö
- **Fas 1**: `masteryFacts` — append-only logg av mastery-uppnåenden som aldrig trimmas
- **Fas 2**: Write-Ahead Log (WAL) — individuella events istället för "skicka hela profilen"
- **Fas 3**: Rensa dubbletter, explicit merge-schema, teacherSummary server-side

### Fas 0 implementerad och pushad
Ändringar i 6 filer:

**0a. React-state uppdateras efter cloud merge**
- `storageStudentApi.js`: `getOrCreateProfileWithSync` tar `onCloudMerge`-callback
- `usePracticeSetupEffects.js`: skickar `onCloudMerge: (merged) => setProfile(merged)`

**0b. visibilitychange + sendBeacon**
- `storageCloudSync.js`: ny `attemptSendBeaconSync()` med `navigator.sendBeacon` (pålitligare på iOS)
- `initCloudSyncListeners`: lyssnar på `visibilitychange` → `hidden` utöver `beforeunload`

**0c. Profil-snapshot i retry-kö**
- `storageCloudSyncQueue.js`: `addPendingSync` sparar profil-snapshot i `mathapp_pending_snapshot_{id}`
- `retrySyncForStudent` och `flushPendingSyncs` använder snapshot som fallback

**Bonus**
- Sync-throttle 90s → 30s
- Mastery-stabilitet: 20+ försök med 90%+ totalt överlever tillfälliga dipp (< 70% bryter)

### Verifiering
- `vite build` OK
- Dev-server: appen laddar, storage-moduler fungerar, sendBeacon/visibilitychange API:er tillgängliga
- Snapshot save/load/cleanup-cycle verifierad i browser

Referens-commit:
- `e2ab609` - Sync phase 0: fix data loss on iPads and stale React state

## 2026-03-16

- Fixade kritisk bugg: molnsync misslyckades tyst pa iPad nar sessionssekret lagrades i sessionStorage (som rensas vid tab-kill). Flyttade till localStorage.
- Tabelltraningsresultat synkroniseras nu direkt (forceSync) istallet for att vanta pa 90-sekunders throttle.
- Lade till explicit 401-hantering och authStale-flagga i molnsync sa att foraldrade sessioner upptacks.
- Lade till CORS-headers pa teacher-class-extras och class-config API-endpoints.
- Fixade merging av adaptiv engine-state vid profilmerge (operationAbilities tar max, skillStates behaller version med flest forsok).
- Bytade till timing-safe jamforelse for losenord pa servern.
- Tog bort error.message fran 500-svar (lakage).
- Fixade UI: "Startsida"-knappen doldes bakom temaväljaren — lade till pr-44 padding.
- Lade till 21-dagars stapeldiagram for gangertabellsaktivitet i lararens elevdetalj (mellan "senast tranad" och "Framsteg").
- Fixade kraschbugg i useDashboardViewData — recentProblems accessades utan Array.isArray-guard pa nya elever.
- Fixade "Traff elev"-kolumnen i Svarighetsanalys: fargkodningen anvande felandel istallet for traffprocent (inverterad signal). Nu fargas korrekt: gron >= 80%, amber >= 60%, rod < 60%.
- Fixade sortering av "Traff elev" — sorterade pa errorShare istallet for successRate, sa "Storst forst" gav samsta eleverna overst.
- Fixade DST-bugg i stapeldiagrammet — bytade fran fast 24h-division till per-bucket dayStart-jamforelse.
- Ny panel: "Nivaoversikt" — klassvy med effektiv konsekutiv masteryniva per elev per operation. Visar hogsta sammanhanande klarade nivan (inte hogsta enskilda). Sortbar pa alla kolumner och snitt.

Referens-commits:
- `9b7065f` - Fix critical cloud sync bug, add CORS, harden auth and profile merge
- `137dc5d` - Add right padding to session header so exit button clears theme switcher
- `4de115e` - Add 21-day table drill activity bar chart to teacher dashboard
- `9468553` - Fix dashboard bugs: crash guard, accuracy color/sort, DST bar chart
- `65f7c14` - Add class mastery level overview panel to teacher dashboard

## 2026-03-07

- Lade till division niva 1 och 2 i uppgiftsgenereringen och gjorde dem synliga i elevens Framsteg.
- Fri traning fick strikt nivalasning per global lagsta ofardiga niva, med rotation mellan domaner pa samma niva.
- En-domantraning fick nivalasning till lagsta ofardiga niva.
- Framsteg (niva-fokus via klick pa niva) fortsatter utan nivalas, dvs explicit vald niva styr.
- Lade till hoegerjusterad `Ga till nasta niva`-knapp i niva-fokusbannern efter nekat erbjudande om niva-hojning.
- Lade till tester for sessionslogik kopplat till nivalas och nasta-niva-beteende.
- Lade till explicita sorteringskontroller i larardashboardens Svarighetsanalys:
  - sortera efter kategori
  - ordning (A-O / O-A eller minst-storst)
- Verifiering kord: `npm run test` och `npm run build` passerade efter andringarna.

## 2026-03-12

- Tog bort tempovalet (Utmaning/Lugn) — var i praktiken en no-op med lockToMasteryFloor.
- Nivaerbjudande fungerar nu i alla single-domain-sessioner, inte bara steady-lage.
- Framsteg-kortet laser nu fran problemLog (5000) istallet for recentProblems (250) sa resultat inte forsvinner efter fri traning.
- Mastery-berakning anvander sliding window (senaste 15 forsok per niva) konsekvent i bade traning och Framsteg.
- Fixade bugg dar mastery aldrig uppnaddes om tidiga misstag under inlarning drog ner snittet.
- Bytte "Avsluta"-knapp till "Startsida".
- Flyttade temaväljaren till horisontell layout med kontrastknapp bredvid.
- Lade till CSS-overrides for alla fargfamiljer (kontrast i mörka teman).
- Snabbade upp sessionsstart: lokal profil returneras direkt, molnsync i bakgrunden.

## Referens-commits

- `56d5391` - Add division levels 1-2 and expose them in progress
- `f35d97f` - Enforce training level locks and add level-focus next-level action
- `7b17df9` - Add explicit sorting controls for teacher difficulty analysis
