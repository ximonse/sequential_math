# Elevdata för analys (Claude Code och Codex)

Skriptet `scripts/teacher-data.mjs` hämtar elevernas frågor och svar från den
levande appen och skriver CSV och JSON. Det är skrivskyddat: bara inloggning och
GET mot samma API som lärarvyn. Skriptet ser exakt de klasser som lärarkontot ser.

## Kör

```
node scripts/teacher-data.mjs --list                                  # klasser och elever kontot ser
node scripts/teacher-data.mjs --class Lärare                          # hela klassen, veckan hittills
node scripts/teacher-data.mjs --pupil Kerstin --class 6 --from 2026-10-19 --to 2026-10-25
node scripts/teacher-data.mjs --class 6 --wrong-only                  # bara felsvar
node scripts/teacher-data.mjs --list-classes                         # exakta klass-ID:n och namn
node scripts/teacher-data.mjs --class-id CLASS_ID --from 2026-10-27T12:00 --to 2026-10-27
node scripts/teacher-data.mjs --class-exact "6" --from 2026-10-27 --to 2026-10-27
```

- `--from`/`--to` tar `ÅÅÅÅ-MM-DD` eller `ÅÅÅÅ-MM-DDTHH:mm`, alltid enligt
  Europe/Stockholm. Datum inkluderar hela slutdagen; ett slut med klockslag är
  exklusivt. Exemplet ovan betyder från 12:00 till dagens slut. Utan gränser
  gäller måndag denna vecka till och med idag. Ogiltiga datum/tider och omvänt
  intervall avvisas. Ett tvetydigt vinterklockslag kräver explicit `+02:00`
  eller `+01:00`; vårens överhoppade klockslag avvisas.
- `--pupil` matchar delsträng i elevens namn eller ett exakt elev-ID.
  Rekommenderat klassval: `--class-id` är exakt och `--class-exact` kräver ett
  entydigt helt klassnamn. Samma namn i två klasser kräver ID; inga elever väljs
  automatiskt ur båda. `--class` behåller äldre delsträngsbeteende och kan
  därför matcha både 6 och 16. Kombinera inte klassvalsflaggorna.
- De nya exakta klassvalen/`--list-classes` kräver det lokalt byggda API:t
  `GET /api/students?resource=classes`. Vid gammal server avbryts exporten;
  inget tyst byte till delsträngssökning. Lokal kod betyder inte produktion.
- `--base <url>` byter server (standard `https://matematik.ximon.se`), `--out <mapp>` byter utmapp.
- Utdata hamnar i `%USERPROFILE%\teacher-data-out\` (utanför repot). Sista raderna
  skriver ut sökvägarna. CSV är UTF-8 med BOM och semikolon, så Excel öppnar den rätt.

Kolumner: Elev, ElevID, Klass, Tid, Uppgift, Problemtyp, Nivå, ElevensSvar, RättSvar,
Rätt (1/0; tomt vid partiellt/okänt), Felkategori (`none`/`knowledge`/`inattention`/`unknown`),
Felmönster, Feldetalj, SvarstidSek, Svarsstatus, ObservationsID och Källreferens.
Saknad felkategori blir inte ett antaget kunskapsfel. En `.coverage.json` följer
med och visar källrevision och historikbegränsning; full historik kan inte utlovas.

## Spårbart underlag för en elev (nytt lokalt API)

```
node scripts/teacher-data.mjs --evidence --pupil Kerstin --class 6 --from 2026-10-19 --to 2026-10-25
```

Ger en `.evidence.json` med frågor, svar, kontext och versionsbundna referenser,
utan privata elevetiketter. Kräver det nya API:t; lokal implementation innebär
inte produktion. `--base` kan ange isolerad provserver. Lägg till `--source all`
för Screening om kontot har rätt roll/klass/pilotåtkomst. Inga riktiga elevdata
behövs för utveckling. Detaljer: [PUPIL_EVIDENCE.md](PUPIL_EVIDENCE.md).

`--pupil` måste ge en entydig träff. `--evidence` kräver exakt en elev och kan
inte kombineras med `--wrong-only`. Klassvis CSV-export finns kvar utan `--evidence`.

## Inloggning

Miljövariablerna `MATH_TEACHER_USER` och `MATH_TEACHER_PASS` ligger på Simons dator
(Windows, `setx`). Skriptet läser dem även när skalet startades före `setx`.
Lösenordet får aldrig skrivas i chatten, i repot eller i en fil. Skriv aldrig ut det.
Kontot måste ha klassen tilldelad (Administration → Lärare och skolor → Klassansvar),
annars är listan tom.

## Elevnamn

API:t levererar bara pseudonymer (t.ex. "Lila Äng Bok Fisk"). Riktiga namn som
"Kerstin" finns som lärarens privata etiketter (`/api/teacher-pupil-labels`) och
är per lärarkonto. Har kontot inga etiketter går det inte att söka på namn. Sök då på
klass, eller be Simon ange pseudonymen. Skapa inte etiketter åt kontot utan att Simon
ber om det, eftersom det är en skrivning.

## Analys

1. Kör skriptet och läs JSON-filen tillsammans med täckningsinformationen.
   Granska både felsvar och rätta svar som kan ge motexempel.
2. Behandla `Felkategori`, `Felmönster` och `Feldetalj` som befintliga signaler.
   Skilj observerat fel från hypotes om orsaken; saknade uppgifter förblir okända.
3. Gruppera per `Problemtyp` och `Felmönster`. Redovisa vad eleven faktiskt svarade
   mot rätt svar, med några konkreta exempel.
4. Excel: skriv `.xlsx` från JSON med `openpyxl` eller xlsx-skillen. Skriptet har inget
   Excel-beroende.

## Integritet

Det här är elevdata. Behåll filerna lokalt, klistra inte in namn eller svar i externa
tjänster, och lägg aldrig utdata i repot.
