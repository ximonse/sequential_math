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
1. Att du använder ett aktivt lärarkonto med rätt användarnamn och lösenord.
2. Att senaste deployment är klar.
3. Att en administratör har tilldelat rätt skola och klass.

Vid fel lösenord eller saknat konto: be administratören återställa lösenordet eller kontrollera kontot. Lärarinloggning använder konton i serverlagringen; `TEACHER_API_PASSWORD` är inte ett användarlösenord.

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
1. Att eleven öppnar rätt klasslänk eller QR-kod.
2. Att namnet skrivs som i den klassens elevlista.
3. Att den fyrsiffriga koden är rätt.
4. Att eleven fortfarande finns i klassen.

Lärare kan se upprepade felaktiga kodförsök och ge eleven en ny kod. Eleven väljer aldrig skola eller klass på egen hand.

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

- `VITE_ENABLE_CLOUD_SYNC=1`: aktiverar sync mot API/KV.

Lärar- och elevinloggning kräver även den serverlagring som appen använder för konton, klasser och sessioner. Efter ändringar i miljö eller deployment:
1. deploya om,
2. testa lärarinloggning,
3. testa en elevsession via klasslänk,
4. verifiera i lärardashboarden.
