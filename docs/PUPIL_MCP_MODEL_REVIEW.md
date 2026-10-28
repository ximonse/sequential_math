# Begränsad syntetisk MCP-granskning 2026-10-28

Genomförd av Codex i aktuell arbetssession. Detta är en första faktisk
modellgranskning av verktygsresultat och original, inte blind eller oberoende
didaktisk kalibrering. Samma agent skapade de två screeningfallen och kände
facit. Ingen verklig elev, KV eller produktion användes. Inga rapporter
sparades och inga verkliga uppdrag delades ut.

## Genomförande

Den registrerade MCP-anslutningen läste capabilities, exakt klass och entydig
MCP Demo One samt fyra träningssvar. `source=all` nekades som väntat för
demots vanliga lärare; `practice` fungerade. Regelunderlaget räknade två rätt
och två fel, men formulerade ingen hypotes när mönstersignaler saknades.

Ett separat SDK-stdio-anrop startade därefter `--demo-screening`. Två
screeningförsök skapades via riktiga API-hanterare i minneslagring, med
syntetisk superadmin och vanlig elevinloggning/CSRF. Modellen granskade
MCP:s revisionsbundna originaltext och de faktiska PNG-bilderna. Tillfälliga
provbilder ligger i ignorerade robots/test-results/mcp-model-review/.
Detta separata läge är inte omladdat i den registrerade anslutningen.

## Observationer och försiktiga slutsatser

| Underlag | Observation | Tillåten slutsats och nästa kontroll |
|---|---|---|
| Träning: 7 × 1 → 7, 7 × 2 → 14 | Två korrekta svar. | Visar dessa två fakta, inte behärskning av hela tabellen. |
| Träning: 7 × 3 → 22, 7 × 4 → 29 | Båda felsvaren är ett mer än produkten. Befintlig kategori knowledge saknar mönster. | Möjlig förskjutning i svaren att undersöka, inte bevis för en viss räknemetod. Alternativ: tangentfel, osäker tabellkunskap eller räknesteg. Be eleven förklara 7 × 3 och jämför med 7 × 5; 7 × 1/2 prövar inte samma faktapar och är inga direkta motexempel. |
| Screening: 402 − 178 | r1c2–c4 visar 402, r2c2–c4 visar 178 och r3c2–c4 visar 376. r1c3 har överstruken nolla och liten 10. Svarsfältet är tomt, försöket pågår. | Rapportera workWithoutAnswer och beskriv synligt arbete. Om 376 avsågs som resultat är det inte 224. Markeringen visar ett försök till ändring men avslöjar inte säkert hela metoden. Be eleven visa fortsatt växling och jämför med en uppgift utan nolla. |
| Screening: 764 − 231 → 533 | Rutnätsrader och svarsfält stämmer med korrekt resultat, men försöket är inte inlämnat. | Styrkeexempel för just subtraktion utan växling. Inte ett direkt motexempel mot svårighet med växling genom noll. |

Inga mellanled som inte syns i originalet får tillskrivas eleven.
Antal i denna tabell beskriver bara fixtures; historikens fullständighet är
okänd. Screening är diagnostic_only och får inte påverka vanlig mastery.

## Vad återstår

- Oberoende, varierade syntetiska fall och en lärargranskad bedömningsmall
  behövs före påstående om pedagogisk träffsäkerhet.
- Klass-/gruppanalys behöver täckning per elev, även frånvaro av underlag;
  gruppens resultat får inte bli varje elevs tillskrivna kunskap.
- Spara/återläsning av en faktiskt formulerad modellrapport ingick inte här.
  Befintliga protokolltester verifierar formatsparande separat.
- Generella och analysspecifika materialutkast samt granskad utdelning
  återstår enligt TODO_AI_ELEVUPPFOLJNING.md.
