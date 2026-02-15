# Felsökning

Snabbguide för vanliga problem i appen.

## 1. Lärardashboarden är vit/tom

1. Gör hard refresh i browsern (`Ctrl+F5`).
2. Testa privat fönster/incognito.
3. Kontrollera browserkonsol för fel.
4. Verifiera att senaste deploy verkligen är klar i Vercel.

Om problemet kvarstår:
- skicka felrad + tidpunkt så kan felet spåras upp snabbare.

## 2. Kan inte logga in som lärare

Kontrollera:
1. Att `TEACHER_API_PASSWORD` finns i Vercel.
2. Att senaste deployment är gjord efter ändringen.
3. Att rätta lösenord anges i `/teacher-login`.

Symptom:
- `Lärarlösenord saknas ...`: env-var saknas eller är tom.
- `Fel lösenord`: inmatat lösenord matchar inte servern.

## 3. Elever syns inte i lärarvyn (från iPad/mobil)

Vanlig orsak: cloud-sync är inte aktiv.

Kontrollera:
1. Redis/KV är kopplad i Vercel.
2. `VITE_ENABLE_CLOUD_SYNC=1` är satt.
3. Deploy efter ändringar.

Utan cloud-sync syns bara lokal data i samma browser.

## 4. Ticket syns inte på elevens startsida

Kontrollera:
1. Att utskicket är skapat.
2. Att målgrupp är vald (klass/elev).
3. Att du klickat `Publicera till startsidan`.

Notera:
- Länk fungerar även om ticket inte är publicerad på startsidan.

## 5. Elev kan inte logga in

Kontrollera:
1. Inloggningsnamn stavat rimligt.
2. Rätt lösenord.
3. Att eleven finns skapad i systemet.

Tips:
- Lärare kan byta elevlösenord i dashboardens elevtabell (`Byt lösen`).

## 6. Lärare ser fel/för lite aktivitet

Aktivitetsstatus bygger på fokus + interaktion:
- Grön: fokus + aktivitet senaste 2 min.
- Orange: fokus men ingen aktivitet 2-4 min.
- Svart: inne idag men inte aktiv nu.
- Röd: inte inne idag.

Om status ser fel ut:
1. Kontrollera att elevsidan faktiskt är i förgrunden.
2. Kontrollera internet/uppdateringsintervall.
3. Uppdatera dashboarden.

## 7. Exportfil saknas eller är tom

1. Kontrollera att urvalet inte är tomt.
2. Kontrollera att vald vy faktiskt innehåller data.
3. Prova annan exporttyp (översikt/rådata/aktivitet).
4. Testa elevspecifik export i `Elevvy (lärare)`.

## 8. Vanliga Vercel-env-var

- `TEACHER_API_PASSWORD`: krav för lärarinloggning i production/preview.
- `VITE_ENABLE_CLOUD_SYNC=1`: aktiverar sync mot API/KV.

Efter varje ändring:
1. redeploya,
2. testa inloggning,
3. testa en elevsession,
4. verifiera i lärardashboarden.
