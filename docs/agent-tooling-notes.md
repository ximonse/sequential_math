# Agentens erfarenheter av elevdata – underlag för API, MCP eller skill

Löpande anteckningar om hur en agent (Claude Code) faktiskt tog fram analyser åt
läraren: vad som gick direkt, vad som krävde omvägar och vad som inte gick.
Syftet är att bygga ett bättre API, en MCP-server eller en skill.
Inga elevnamn eller elevsvar hör hemma här.

## 2026-10-27 – dagsanalys åk 6, screening och genomgångspresentation

Uppdrag i ordning: dagens statistik för klass 6 → efter 12:00 → med screening →
hela dagen → uträkningar i räknehäftet → issues → presentation med vanliga felsvar
och skärmbilder av riktiga uträkningar.

### Gick direkt

- `scripts/teacher-data.mjs` (träningsdata): inloggning via miljövariabler, JSON + CSV
  utanför repot, riktiga namn via lärarens etiketter. Bra grund.
- `gh issue create` för förbättringsförslag.
- Analys av felsvar per problemtyp och felmönster ur JSON.

### Krävde omvägar

| Behov | Vad agenten gjorde | Vad som borde finnas |
|---|---|---|
| Tidsfönster (”efter 12:00”) | Skriptet tar bara hela dagar; filtrerade `Tid` i UTC för hand (CET = UTC+1) | `--from`/`--to` med klockslag, tolkat i Europe/Stockholm |
| Klassfilter | `--class 6` är delsträng; med adminkonto matchade det 89 elever i flera klasser | Exakt klass-id eller klassnamn |
| Screening | Fanns inte i skriptet. Läste API-koden, skrev eget GET-skript mot `/api/teacher-diagnostic-assignments` och `/api/teacher-diagnostic-attempts` | Screening som inbyggd del: `--screening` |
| Behörighet | Screening kräver skoladmin; exportkontot fick 403 tills Simon höjde behörigheten | Läsroll för screening utan full admin, eller ett tydligt felmeddelande i skriptet |
| Detaljer per försök | Ett anrop per elev och uppgift (98 försök, över 5 min, fick köras i bakgrunden) | Ett klassanrop som returnerar alla försök med snapshot |
| Samma screening i flera uppdrag | En elev hade fått screeningen som eget uppdrag; slogs ihop via identiska task-id:n | Gruppera på samling/uppgiftsuppsättning, inte assignmentId |
| ”Räknat men inte svarat” | Spelade upp rutnätet själv och jämförde med tom svarsruta | Fält i API:t: `gridHasResult`, `answerEmpty` |
| Räknehäftet som text | Eget skript som skriver rutnätet rad för rad (siffror, minnessiffror, överstrykningar, linjer) | `GET …/attempt?format=text` eller en MCP-resurs per försök |
| Skärmbild av räknehäftet | Ingen bildexport fanns. Klick i produktionens lärarvy undveks (knappen Avsluta lämnar in elevers svar). Renderade appens egen `DiagnosticAttemptHistory` lokalt med Vite + Playwright och beskar till använda rutor | Ett PNG-endpoint per försök (skrivskyddat), t.ex. `/api/teacher-diagnostic-attempts/png` |
| Lokal rendering | Tailwind-preflight saknades → kantlinjer försvann (`box-sizing`). React gick inte att lösa utanför repot → alias | Om rendering sker lokalt: en färdig harness i repot |
| Presentation | pptxgenjs var inte förinstallerat; skillens LibreOffice-skript fungerar inte på Windows; renderade bilderna via PowerPoint COM | Skillen bör ha en Windows-väg för bildkontroll |

### Gick inte, eller bara delvis

- Appens automatiska signaler (P/Ö/M) körs inte på NCM-uppgifter alls → manuell analys av
  varje uträkning (issue #20).
- Frihandsritningar kan inte läsas som text; inga fanns i dagens data men kommer att behöva
  bild.
- Svarsrutan loggas tecken för tecken och ritytan streck för streck, vilket blåser upp
  händelseloggen (issue #18, #19).

### Bedömningsregler som agenten fick lära sig

- Ett matematiskt fel resonemang är fel även om svaret råkar bli rätt. Lyft den *antagna*
  missförståelsen och märk den som antagande (exempel: lucktänkande om bråk).
- Tom svarsruta är inte samma sak som ”inte gjort” – kontrollera alltid räknehäftet först.
- Skilj på dagens arbete och hela screeningen; Simon vill räkna screeningen som en helhet.

### Simons krav på genomgångspresentationen (för #21)

- Frågans nummer i screeningen syns ovanför frågan.
- Ingen rubrik över det tomma rutnätet; det talar för sig självt.
- Elevens uträkning är en riktig skärmbild av räknehäftet, beskuren på hela rutor med ram,
  så att den läses som en uppställning och inte som lösa siffror.
- Rutorna i skärmbilden har exakt samma storlek som i det tomma rutnätet (stående rutor 1 : 1,6).
- Huvudräkningsuppgifter utan uträkning visar bara felsvaret i text.
- Teknik: skärmbilden beskärs i webbläsaren på cellgränser och antalet rutor sparas, så att
  bilden kan skalas till exakt `kolumner × cellbredd` i presentationen.

### Förslag på verktygsyta (API/MCP/skill)

1. `class_day_summary(class, from, to)` – träning per elev och problemtyp, felmönster.
2. `screening_overview(class | group)` – matris elev × uppgift med status, inklusive
   ”räknat men inte svarat”.
3. `screening_attempt(attemptId, format = text | png | events)` – räknehäftet som text,
   bild eller händelser.
4. `common_wrong_answers(screening, min = 2)` – frågor, felsvar och exempel med uträkning.
5. `review_deck(screening)` – presentationen i issue #21.

Alla skrivskyddade, med samma behörighetskontroll som lärarvyn och utan elevnamn i
exporter som är tänkta att visas för klassen.
