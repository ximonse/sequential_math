# Geometri – domän- och innehållskontrakt

Status: sida 8 implementerad i v1. Sida 9–10 är specificerade men inte aktiverade.
Källa: *ABG Sammanfattningar A4 v-2*, sidorna 8–10.

## Produktbeslut

- Domänen byggs som separata, observerbara delkunskaper – inte som en generell geometrinivå.
- Sida 8 levereras först: geometriska objekt i två och tre dimensioner.
- Prefix och enhetsomvandling på sida 8 hör till en kommande mätningsdomän och ingår inte här.
- V1 använder strukturerade val och visuella markeringar. Fri ritning, kameraigenkänning och fritextbevis ingår inte.
- Geometri är avstängd tills läraren aktiverar respektive delkunskap i klassinställningarna.

## Matematiskt kunnande och progression

### `geometry_2d_objects` – plana objekt (sida 8, implementerad)

1. Skilja linje, stråle och sträcka genom ändpunkter och pilar.
2. Namnge månghörningar utifrån antal sidor.
3. Känna igen triangel, fyrhörning och cirkel trots variation i läge och proportioner.
4. Förstå inkluderande klassificering av kvadrat, rektangel, romb och parallellogram.
5. Känna igen cirkelns centrum, radie och diameter.
6. Härleda en fyrhörning från egenskaper, ange vilken egenskap som behövs för att få en kvadrat och skilja ett specifikt figurnamn från andra namn som alltid gäller.

### `geometry_3d_objects` – kroppar (sida 8, implementerad)

1. Känna igen rätblock, kub, fyrsidig pyramid, cylinder, kon och klot.
2. Skilja kub från rätblock oberoende av orientering och proportioner.
3. Koppla kroppar till antal ytor, kanter och hörn där begreppen är entydiga.
4. Koppla kroppar till bas- och sidoytornas former.
5. Härleda en kropp från flera egenskaper.

### Planerade delkunskaper

- Sida 9: `geometry_angles`, `geometry_scale_symmetry`, `geometry_perimeter`.
- Sida 10: `geometry_area`, `geometry_volume`.
- Sidornas formler införs först efter begrepp, representation och enhetsförståelse. Beräkning får inte bli en genväg runt geometriskt resonemang.

## Adaptiv svårighet

- Varje delkunskap har ett eget nivågolv och kan tränas separat.
- Varje nivå använder en ändlig, granskbar uppgiftsbank av semantiska kort. Kortet kombinerar ett bestämt begrepp/förhållande med en representation; korten roteras utan exakt upprepning innan banken är genomgången. Frågefraser används inte som variationsmått. Orientering och proportioner kan fortfarande varieras där de hör till själva uppgiften.
- Nivå 6 för plana figurer har 20 kort: 8 egenskapsklassificeringar, 4 kompletterande egenskaper och 8 uppgifter om inkluderande figurnamn. De prövar tre olika resonemang inom samma innehållssteg; de är inte en ny nivå eller innehåll från sida 9.
- Nivåetiketten visar "nivå 6 av 6" respektive "nivå 5 av 5" så att innehållsgränsen inte ser ut som en utebliven avancering. När sista nivån beläggs ger F2 ett `complete_domain`-beslut i stället för ett omöjligt steg uppåt. Eleven kan fortsätta repetera inom vald delkunskap tills annan aktiverad träning väljs; automatisk växling behöver ett separat produktbeslut.
- Tre fel i följd får sänka en nivå enligt appens gemensamma stödregel; tillfälliga lättare och svårare uppgifter används inom delkunskapens faktiska nivåintervall.
- Mastery för geometri kräver minst 8 svar, minst 7 rätt, minst 3 uppgiftsvarianter och minst 2 representationer i det aktuella fönstret. Övriga domäner behåller befintlig regel.
- Varje implementerad nivå kan nu generera minst två synligt olika representationer och minst tre faktiska mallar i masteryfönstret. Enbart ändrad frågefras räknas inte som representationsbyte.

## Felhypoteser och lärarinsikter

Svarsalternativen bär en prövbar felhypotes. Exempel:

- `line_ray_segment_confusion`: förväxlar pil/ändpunkt.
- `counts_corners_not_sides`: räknar hörn i stället för sidor utan att samordna begreppen.
- `square_not_rectangle`: behandlar kategorier som ömsesidigt uteslutande.
- `radius_diameter_confusion`: förväxlar radie och diameter.
- `center_line_confusion`: förväxlar centrum (punkt) med en sträcka i cirkeln.
- `cube_cuboid_confusion`: använder vardagsutseende i stället för sidoytornas egenskaper.
- `faces_edges_vertices_confusion`: blandar sidoyta, kant och hörn.
- `shape_name_confusion`: väljer fel figurnamn; ett enstaka val visar inte i sig prototypbundenhet.
- `quadrilateral_category_confusion`: väljer inte hela mängden figurnamn som alltid gäller.
- `quadrilateral_underclassification`: ger en kvadrat bara ett av dess övriga giltiga namn.

Ogiltigt eller saknat val klassas som inmatningsfel. Ett giltigt distraktorsvar klassas som missuppfattning när alternativet har en specifik hypotes, annars som kunskapsfel. Slarv får endast användas när den gemensamma tids- och svarskvalitetsanalysen har stöd för det; enstaka felval räcker inte.

Läraren ska kunna se delkunskap och nivå, uppgiftstyp, representation, valt och korrekt alternativ, felhypotes, svarstid, rimlighetsklassning och evidensklass. Slutsatser visas först när det finns tillräckligt antal svar och ska beskrivas som signaler, inte diagnoser.

## Domänkontrakt

- `generate(skill, level, options)` skapar originaluppgifter med semantiskt figurunderlag, alternativ och metadata.
- Uppgiftsbanken är egen, inspirerad av Diamants innehållsindelning och didaktiska kommentarer (särskilt GFo3/GFo4), inte en digital reproduktion av NCM:s uppgifter eller bilder.
- `verifyContent(problem)` härleder rätt svar från figurens/egenskapernas semantik och jämför med angivet facit. Den får inte lita på facit som källa.
- `Display` ritar figuren från semantiska data och ger stora, tangentbordsåtkomliga val.
- `evaluate(problem, answer)` accepterar endast id för ett visat alternativ och returnerar kontraktsenlig bedömning.
- `analyzeError(problem, answer)` mappar valt alternativ till en prövbar felhypotes.

## Sparad evidens

Utöver appens gemensamma observationsfält sparas `varietyTemplate` och `representation`. Därmed kan mastery kräva verklig variation och läraren skilja begreppssvårighet från svårighet med en viss bildtyp. Figurens semantiska `values`, prompt, alternativ, svar, nivå, `skillTag`, felmönster och tidsdata ska finnas i problem/observation så att analysen kan reproduceras.

## Guardians och teststrategi

- Den gemensamma guardian kör schema-, evidens- och domänverifiering före visning och gör högst fyra försök.
- Domänverifieraren avvisar okända uppgiftstyper, dubbletter, saknat entydigt rätt alternativ och facit som inte följer av figurdata.
- Kontraktstest genererar, verifierar, bedömer och felanalyserar varje nivå.
- Korruptionsprov ändrar facit, figurens strukturerade egenskaper, relationstext eller representationsanspråk och måste stoppas före visning.
- Variationsprov kräver variation i prompt, mall och representation; visuella data testas separat från texten.
- Bankprov går igenom samtliga kort på varje nivå, kräver unik kortidentitet per cykel och kör `verifyContent` på varje kort. Nivå 6 kontrolleras särskilt för tre resonemangstyper och 20 kort utan upprepning.
- UI-test ska kontrollera val, återkoppling, tangentbord och läsordning. Fri ritning och draginteraktion är uttryckligen utanför v1.
