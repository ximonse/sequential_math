# Uppföljning av Pong och Snake

Beslutat med Simon 2026-11-05: samla registrerade spelomgångar och följ upp
under fem skoldagar efter publicering. Spelens svårighet ändras inte här.
Den befintliga highscore-listan med topp sju behålls och används inte som
underlag för vinst- eller överlevnadsandelar.

## Registrering

Varje Pong-/Snake-mount får ett unikt omgångs-ID. Avslutad match, Snake-
kollision, manuellt avslut och vanlig navigering bort registrerar version,
start/sluttid, varaktighet, poäng och avslutsorsak. Pong har dessutom båda
sidornas poäng. En omgång registreras högst en gång. Klass vid försöket
härleds av servern från elevens behöriga medlemskap.

Resultatet läggs som en append-only-händelse i den befintliga krypterade
elevlagringen och synkas genom elevens vanliga autentiserade event-API.
Offlineförsök behåller samma ID vid återförsök. Inga matematikrader, mastery-
belägg eller matematiksiffror skapas. Servern behåller högst 1 000 omgångar
per elev inom 30 dagar i elevprofilen. Därmed följer loggen också befintlig
elevradering utan ytterligare elevindex eller personuppgiftskopior.

Plötslig krasch eller processavslut före lokal skrivning kan lämna en
oregistrerad omgång. Rapporten betyder därför registrerade omgångar,
inte en garanti för alla någonsin spelade omgångar. Historiska highscore
kan inte fylla den luckan. Tiden är omgångens väggklocktid, begränsad till
90 sekunder, inte en separat mätning av aktiv koncentration.

## Läsning

Lärarbehörigt GET mot `/api/students?resource=break-games&classId=EXAKT_ID`
returnerar enbart aggregat för aktuell klasslista och angiven period.
`from`/`to` är millisekunder sedan epok; perioden får vara högst 30 dagar
och slutgränsen är exklusiv. Saknad behörighet ger 401/403. Standard är sju
dygn. Historik för elever som inte längre finns i aktuell klasslista ingår
inte. Svarens `coverage: recorded_rounds_only` skiljer detta från full historik.

Per spel visas antal omgångar, antal elever, avslutade och avbrutna omgångar,
medelvaraktighet, poäng och spelversioner. Pong redovisar vinster, oavgjorda
och förluster samt båda sidornas medelpoäng. Snake redovisar överlevnad till
tidsgränsen respektive kollision. Avbrutna omgångar ingår inte i nämnaren
för vinst eller överlevnad. Noll underlag ger null för medelvärden.

```text
node scripts/pause-game-stats.mjs
node scripts/pause-game-stats.mjs --class-id EXAKT_ID --days 7
```

Skriptet loggar in med datorns befintliga läraruppgifter, läser samtliga
sidor av behöriga klassval och skriver endast aggregat till stdout. Det
skriver inga elevrader till filer och loggar inga inloggningsuppgifter.
Ett äldre API utan rätt version/täckningsmarkör ger fel; det räknas inte
som noll spelade matcher.

## Schemalagd uppföljning

Trådens automation `f-lj-pong-och-snake-i-fem-skoldagar` är schemalagd till
vardagar kl. 16. Den väntar tills insamling och läs-API är publicerade via
det vanliga GitHub-flödet, följer sedan fem skoldagar och sammanfattar
svårigheten. Den får inte pusha, publicera eller ändra appen. Fel eller
opublicerat API redovisas som okänt läge. Olika spelversioner ska inte
jämföras som en gemensam svårighetskurva. Efter fem dagar pausas uppföljningen.
