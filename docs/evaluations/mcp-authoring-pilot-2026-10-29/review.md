# Syntetiskt författarprov via MCP, 2026-10-29

Detta prov kopplar faktiskt modellformulerad text till appens MCP-lagring och lärargranskning. Det är **inte** blind, lärargodkänd eller oberoende didaktisk kalibrering. Alla elever, svar och konton är syntetiska. Ingen produktion, verklig elevdata, godkänd utdelning eller mastery ändrades.

## Underlag och ursprung

- Aktuell kod: 80a8efc (applikationskod 4d413d7). MCP-SDK startade --demo-screening med separata rapport- och materialskrivflaggor.
- Två elever, tolv observationer och två räknehäftesoriginal lästes via faktisk MCP. Screeningunderlag finns bara för Demo One. Bådas historikfullständighet är okänd.
- Antigravity fick endast syntetiska verktygsresultat, analys-skillen och ett explicit utkastkontrakt. Exakt bakomliggande modell-ID returnerades inte och anges därför inte i rapporternas provenance.
- Första körningen 6ada20db-2879-442d-b767-c565311ced7d, andra f216ac85-e339-474f-9179-50542f8b36be; båda returnerade en svarstur. Uppdraget begärde svar utan verktyg eller filändringar; detta påstår inte en tekniskt verkställd verktygsspärr.
- Den andra körningen fick granskningens återkoppling och är därför inte ett oberoende omprov.

## Första förslaget avvisades

Det första svaret gick inte att läsa som JSON och innehöll numeriska facit som strängar. Dessutom tillskrev en tolkning eleven beräkningen 10−7=3 trots att resultatradens tiotalssiffra var 7. Korrekt subtraktion utan växling och lägre tabellfakta användes som motexempel mot andra mekanismer. Detta förslag skickades inte till sparande. Se rejected-first-response.txt; texten är ett avvisat provresultat, inte fakta om en elev.

## Granskning och omarbetning

Den reviderade analysen skiljer tomt svar från synligt arbete, återger resultatraden 376 utan att göra den till ett inlämnat svar och anger föreslagna metoder som osäkra alternativ. Rätta svar finns som styrkor; inga direkta motexempel påstås när jämförbarheten saknas. Demo Twos avsaknad av screeningdata blir inte en tillskriven kunskapsbrist. Serverns schemavalidering räknar och kontrollerar referenser, men bevisar inte dessa tolkningar. Lärargranskning återstår.

En kvarvarande formulering att eleven "saknar helt" screeningdata avser det lästa indexet, inte en bevisat fullständig elevhistorik. Före godkännande bör lärartexten precisera "inga screeningförsök finns i det tillgängliga urvalet". Den sparade modelltexten är bevarad för granskning, inte tyst omskriven till ett facit.

Det generella uppdragets ofullständiga settings-objekt kom från Codex provmall, inte från en ny modellgissning. API:t avvisade det utan tyst anpassning. Codex kompletterade uttryckligt maxTimePerProblem=120 och randomizeOrder=false, behöll hideCountdown=true och förtydligade tidsramen i granskningsbeställningen. Rapport- och screeningtext ändrades inte i denna komplettering. Se receipts.json/adjustment.

MCP beskrev först detta som ett generiskt datum-/rapportfel. En avgränsad följdrättning bevarar nu den offentliga felkoden invalid_material och ger säker vägledning om materialformat, facittyper och kompletta inställningar. Rå feltext vidarebefordras fortfarande inte. Regressionen var röd före rättningen och provar även att en rättad förhandsvisning bevarar talramen utan att spara eller dela ut.

## Verifierat utfall

| Del | Belägg | Begränsning |
|---|---|---|
| Två faktiska AI-rapporter | Sparade via math_save_analysis_draft och återlästa som AI-provenance, version 1 | Ingen mänsklig avstämning sparad |
| Analysspecifik klasscreening | Sex frågor, två mottagare, båda elevernas källrevisioner och separata motiv | Ingen automatisk sanningskontroll av motiven |
| Generell träning från givet material | Åtta additions/subtraktionsuppgifter, jämna första tal 10–20, udda andra tal 1–9, dold nedräkning | Generatorram, inte fryst frågeföljd; explicit 120-sekundersram |
| Återförsök | Samma rapport-/utkast-ID:n, version och revision förblev 1 | Isolerad minneslagring, inte Upstash REST |
| Granskningsvy | Ett browserprov passerade: AI-rapport, sex frågor, ursprungligt 402−178-arbete med tomt svar och hela träningsramen | Lokalt Chromium, inte fysisk iPad eller HTTPS-preview |
| Utdelningsgräns | Alla kvitton assigned=false och approval=not_requested; inga material-POST-anrop vid browserläsningen | Provet godkände eller delade inte ut modellförslagen |
| Städning | SDK-session stängd och testport verifierat stängd | Gamla reviewUrl/reviewPath är inte en tillgänglig live-demo |

Fyllda liggande/stående screeningvyer samt tränings- och rapportvyer granskades visuellt. Lokala skärmbilder och körloggar finns i den ignorerade mappen robots/test-results/authoring-pilot. Den andra modellresponsen finns i authoring-revised-raw.json, den kompletterade texten i authored-reviewed.json, exakt läst syntetiskt underlag i evidence.json och kvitton i receipts.json.

## Kvar före bredare slutsatser

Förslag till lärargranskning, ännu inte godkänt:

- [ ] Skiljer rapporten lästa svar och rutor från möjliga förklaringar?
- [ ] Beskrivs saknade data som en begränsning i urvalet, utan påståenden om elevens hela historik eller kunskap?
- [ ] Kan frågornas ordning och subtraktionskontrasterna ge relevant nytt underlag utan att en enstaka uppgift får bevisa en felorsak?
- [ ] Är det tydligt vad som rättas numeriskt och vad som kräver lärarbedömning av uträkningen?
- [ ] Är träningsramens 120 sekunder förenligt med den avsedda användningen, även när nedräkningen är dold?

- Läraren behöver bedöma analysens rimlighet och om föreslagna kontraster faktiskt skiljer förklaringarna åt.
- Fler varierade fall, även gruppmedlemmar helt utan underlag och andra operationer, behövs för didaktisk kalibrering.
- Publicering av PR #22 kräver separat klartecken. Verklig MCP-analys kräver godkänd AI-miljö och det avsedda lärarkontot.
