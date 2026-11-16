# Styrning: belastning och kostnad

Antaget av Simon 2026-11-16. Aktuellt arbetsmål (`AGENTS.md`, avsnittet Arbetsmål).

## 1. Målet

Appen ska klara fler klasser och skolor utan att server- och databaskostnaden
växer i onödan. Varje anrop ska läsa det som behövs för det läraren eller
eleven ser, inte allt som finns.

Det bygger vidare på prestandaplanen (`docs/PERFORMANCE_ARCHITECTURE_PLAN.md`,
etapp P2) och kortet `performance-loading-architecture` i projektkartan.
Väntetid och kostnad mäts tillsammans: samma onödiga läsningar ger båda.

## 2. Måtten

Varje åtgärd mäts före och efter i produktionen, skrivskyddat och på samma
sätt som baslinjen:

- **Databasläsning per anrop:** hur mycket som läses ur lagringen för att
  svara (serverns arbete), inte bara hur stort svaret blir.
- **Svarstid** per anrop.
- **Antal anrop per lärartimme** med lärarvyn öppen.
- **Elevens sparande:** hur mycket som läses och skrivs i lagringen per
  sparande.

Vercel-kontot (Hobby) visar inte förbrukningen via API. Mätningen görs därför
med inloggad lärare i en egen webbläsare och med koden som källa.

## 3. Baslinje 2026-11-16 (produktion, Simons konto, 211 elever)

| Väg | Svar | Tid | Vad servern läser |
| --- | ---: | ---: | --- |
| Lärarkatalogen, var 2:a minut | 62 kB (8 kB överfört) | 13 s | Alla elevprofiler i alla behöriga klasser, ca 44 MB, varje gång |
| Screening öppnas | 15 anrop, ett per klass | 2–7 s styck | Alla klassers screeninglistor, fast en klass är vald |
| Screeningresultat, en screening | 2 anrop | 4 s och 6,5 s | Tabell och felförståelser var för sig |
| Elevens sparande, var 30:e s vid träning | litet anrop | – | Hela profilen läses och skrivs (upp till ca 4 MB) |
| Godkänn och dela ut | 1 anrop sedan 2026-11-15 | ej mätt | Förhandsvisning en gång (tidigare två) |

**Orsak till katalogens 13 s:** katalogkorten lever 60 sekunder men lärarvyn
uppdaterar varannan minut, så korten har alltid gått ut och alla profiler
läses om. Korten ogiltigförklaras redan när en profil ändras.

**Rättelse:** 2026-11-14 sades att lärarvyn hämtar 44 MB till webbläsaren. Det
var fel: siffran kom från den gamla hela elevlistan som ett analysskript
använde. Lärarvyn hämtar den lätta katalogen, men servern läser fortfarande
44 MB för att bygga den.

## 4. Steg i ordning efter vinst

1. **Katalogkortens livstid.** Låt korten leva länge (till exempel ett dygn)
   och lita på ogiltigförklaringen vid ändring. Väntad effekt: katalogen läser
   små kort i stället för 44 MB, svar på under en sekund.
   *Klart när:* katalogen mäts varm under en sekund och kalla läsningar bara
   sker för ändrade elever; inget kort visar inaktuellt namn, klass eller
   inloggning (test och robot).
   *Byggt lokalt 2026-11-16:* korten lever ett dygn (`CATALOG_TTL_SECONDS`).
   Alla vägar som ändrar kortets fält (namn, årskurs, klass, inloggning, ny
   elev) går via `mutateStudentRecord`, som tar bort kortet; radering städar
   det. Test låser livstiden; befintliga tester täcker varm läsning,
   ogiltigförklaring och klassflytt. 17 robotar för klasser och katalog gröna.
   Mätning i produktion återstår efter publicering.
2. **Screening öppnas.** Hämta screeninglistor bara för de klasser som behövs
   i den flik som visas. *Klart när:* att öppna Resultat för en klass gör
   anrop för den klassen, inte för alla.
3. **Screeningresultat.** Läs bara den screening som visas och en gång för
   tabell och felförståelser. *Klart när:* en screening läses med ett anrop
   och tiden halveras.
4. **Elevens sparande.** Spara nya svar utan att läsa och skriva hela
   profilen varje gång. Störst förändring och störst risk; kräver eget
   förslag före bygge. *Klart när:* ett sparande läser och skriver bara det
   som ändras, utan att något elevsvar tappas (R4, robotar för sparande).

## 5. Regler

- Inget steg ändrar vad läraren eller eleven ser eller vad som sparas.
  R1–R4 gäller; sparande och behörighet har robotar som ska vara gröna.
- Varje steg mäts före och efter och redovisas i `docs/ARBETSLOGG.md`.
- Steg 4 ändrar elevens datalagring och kräver Simons uttryckliga besked
  efter ett separat förslag.
- Publicering som vanligt: bara på Simons besked.

## 6. Beslut som Simon behöver ta

1. Godkänns målet, måtten och ordningen? **Ja, Simon 2026-11-16.**
2. Katalogkortens livstid: ett dygn, eller annat? **Ett dygn, Simon 2026-11-16.**
