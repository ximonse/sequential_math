# Felmodellernas källa och slumprisk

Genereras med `node scripts/model-profile.mjs --write`; testet i `modelProfile.test.js` kräver att den stämmer.
Slumprisk = hur många olika svar modellen förutsäger per uppgift, mätt på bankens uppgifter, NCM-frågorna med struktur och katalogens exempel.
En felförståelse med fler än två svar per uppgift visas bara som mönster (Simons beslut 3, 2026-11-12).

| Modell | Slag | Svar per uppgift | Uppgifter | Krav | Källa |
| --- | --- | ---: | ---: | --- | --- |
| Annat räknesätt | felförståelse | 1 | 161 | 3 uppgifter | Källa: Tabellen (Utför fel räknesätt) ger 234 − 45 = 279. |
| Svaret är tio, hundra eller tusen gånger fel | observation | 4 | 161 |  | Källa: Tabellen ger 3.4 · 0.2 = 6.8 (tio gånger för stort); gäller decimaluppgifter. |
| Ett ifrån facit | observation | 2 | 22 |  | Källa: Tabellen (±1-fel vid multiplikation av udda tal, Karlsson & Kilborn) beskriver ±1-fel; gäller bara udda gånger udda. |
| Bara första siffran inskriven | inmatning | 1 | 127 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Två sista siffrorna omkastade | inmatning | 1 | 104 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Olika svar i räknehäftet och svarsrutan | inmatning | – | Läses ur räknehäftet, inte beräknat: ett svar per uppgift. |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Svarar 0 | ger upp | 1 | 177 | 3 uppgifter | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Svarar 55 | ger upp | 1 | 176 | 3 uppgifter | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Större minus mindre i varje kolumn | felförståelse | 1 | 45 |  | Källa: Tabellen (Övergeneralisering) ger 321 − 245 = 124 som exempel; NCM AS2 kallar det "störst minus minst". |
| Växlar men minskar inte kolumnen till vänster | felförståelse | 1 | 42 |  | Källa: Tabellen: "Minskar inte föregående siffra vid växling i subtraktion". |
| Skriver 0 där växling behövs | felförståelse | 1 | 45 |  | Beskrivning: NCM-område AS2 (skriftlig subtraktion), förkunskap AG3 (tiotalsövergång). ”Förstå och använda tal” kap. 20. |
| Klarar första växlingen men vänder nästa (0 − x = x) | felförståelse | 1 | 23 |  | Beskrivning: NCM-område AS2 (skriftlig subtraktion), förkunskap AG3 (tiotalsövergång). ”Förstå och använda tal” kap. 20. |
| Räknar från vänster, växlar från höger | felförståelse | 1 | 21 |  | Beskrivning: NCM-område AS2 (skriftlig subtraktion), förkunskap AG3 (tiotalsövergång). ”Förstå och använda tal” kap. 20. |
| Växling genom noll: hundratalet minskas inte | felförståelse | 1 | 14 |  | Källa: Tabellen (Växling över noll) ger 304 − 21 = 323; NCM AS2. |
| Växling genom noll: tio tiotal behålls | felförståelse | 1 | 14 |  | Beskrivning: NCM-område AS2 (skriftlig subtraktion), förkunskap AG3 (tiotalsövergång). ”Förstå och använda tal” kap. 20. |
| Minskar en kolumn trots att ingen växling behövs | felförståelse | 1 | 21 |  | Beskrivning: NCM-område AS2 (skriftlig subtraktion), förkunskap AG3 (tiotalsövergång). ”Förstå och använda tal” kap. 20. |
| Minnessiffran glöms | felförståelse | 1 | 26 |  | Källa: Tabellen ger 77 + 54 = 121 som exempel. |
| Kolumnsummor skrivs efter varandra | felförståelse | 1 | 12 |  | Källa: NCM-täckningen (lucka G1, McIntosh-sammanfattning): kolumnsummor sammanfogas utan växling. |
| En av flera minnessiffror glöms | felförståelse | 2 | 8 |  | Beskrivning: NCM-område AS1 (skriftlig addition), förkunskap AG3 (tiotalsövergång). ”Förstå och använda tal” kap. 20. |
| Lägger till minnessiffra som inte behövs | felförståelse | 1 | 10 |  | Beskrivning: NCM-område AS1 (skriftlig addition), förkunskap AG3 (tiotalsövergång). ”Förstå och använda tal” kap. 20. |
| Räknar från vänster, minnessiffran åt höger | felförståelse | 1 | 7 |  | Beskrivning: NCM-område AS1 (skriftlig addition), förkunskap AG3 (tiotalsövergång). ”Förstå och använda tal” kap. 20. |
| Multiplicerar i stället för att addera | felförståelse | 1 | 36 | 3 uppgifter | Källa: Tabellen ger 3 + 2 = 6 som exempel. |
| Tiondelar blir hundradelar | felförståelse | 1 | 4 |  | Källa: Klustret ger 0,7 + 0,8 = 0,150; tabellen (Förstå och använda tal s. 111) ger 0,6 + 0,8 = 0,14. |
| Lägger bara till decimaldelen av ena talet | felförståelse | 1.5 | 8 |  | Beskrivning: Simons iakttagelse i riktiga elevsvar 2026-11-12. |
| Heltalet ställs under sista decimalen | felförståelse | 1 | 4 |  | Källa: Tabellen ger 120.4 + 63.21 = 75.25 (högerjusterat) som exempel. |
| Minnessiffran glöms när decimaltal multipliceras | felförståelse | 1 | 11 |  | Simons iakttagelse: Simon 2026-11-14: 3 × 2,4 = 6,2, glömd minnessiffra. |
| Minnessiffran läggs till före multiplikationen i decimaltal | felförståelse | 1 | 11 |  | Beskrivning: Agentens förslag ur riktiga elevsvar, godkänt av Simon 2026-11-14. |
| Decimaltalet delas upp och räknas från vänster | felförståelse | 1.91 | 11 |  | Simons iakttagelse: Simon 2026-11-14: 7 × 6,7 räknat som 7 + 6 · 7 = 91 från vänster; 6 och 7 blir två tal. |
| Bara decimaldelen multipliceras | felförståelse | 1 | 10 |  | Simons iakttagelse: Simon 2026-11-14: 3 × 2,4 = 3,2; bara 0,4 multipliceras, 2 står kvar. |
| Kvoten stannar vid 12 | felförståelse | 1 | 4 |  | Beskrivning: Simons tolkning av riktiga elevsvar 2026-11-14. |
| Räknar med starttalet vid växling | felförståelse | 1 | 37 | 3 uppgifter | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| En av växlingarna minskar inte talet som lånar ut | felförståelse | 2 | 9 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Hundratalet minskas två gånger vid växling över nolla | felförståelse | 1 | 14 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Sista minnessiffran glöms i multiplikationen | felförståelse | 1 | 4 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Fel tabellfaktum inne i uppställningen | felförståelse | 2 | 17 | 3 uppgifter | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Bara heltalet multipliceras | felförståelse | 1 | 13 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Tappar växlingen och decimaltecknet | felförståelse | 1.5 | 16 |  | Simons iakttagelse: Simon 2026-11-13: 1,76 + 2,58 = 334, "glömt växling och decimaltecken". |
| Minnessiffran glöms i multiplikationen | felförståelse | 1 | 18 |  | Källa: Tabellen ger 56 · 2 = 102 som exempel. |
| Minnessiffran läggs till före multiplikationen | felförståelse | 1.17 | 18 |  | Beskrivning: NCM-område AS4 (skriftlig multiplikation), förkunskap AG6–AG7 (tabeller, positioner). |
| Minnessiffran blir alltid 1 | felförståelse | 1 | 9 |  | Beskrivning: NCM-område AS4 (skriftlig multiplikation), förkunskap AG6–AG7 (tabeller, positioner). |
| Delprodukterna skrivs efter varandra | felförståelse | 1.11 | 18 |  | Beskrivning: NCM-område AS4 (skriftlig multiplikation), förkunskap AG6–AG7 (tabeller, positioner). |
| Multiplicerar kolumnvis som vid addition | felförståelse | 1 | 23 |  | Beskrivning: NCM-område AS4 (skriftlig multiplikation), förkunskap AG6–AG7 (tabeller, positioner). |
| Andra delprodukten flyttas inte | felförståelse | 1.6 | 5 |  | Beskrivning: NCM-område AS7 (flersiffrig multiplikation, åk 7–9), förkunskap AS4. |
| Bara entalen multipliceras | felförståelse | 1 | 23 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Angränsande produkt | felförståelse | 3.88 | 32 | 3 uppgifter | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Heltal och decimaldel multipliceras var för sig | felförståelse | 1 | 10 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Resten förs inte vidare | felförståelse | 1 | 15 |  | Beskrivning: NCM-område AS5 (kort division), förkunskap AG8. |
| Resten läggs till som ental | felförståelse | 1 | 15 |  | Beskrivning: NCM-område AS5 (kort division), förkunskap AG8. |
| Nollan i kvoten tappas | felförståelse | 1 | 6 |  | Beskrivning: NCM-område AS5 (kort division), förkunskap AG8. |
| Kvoten blir ett fel | felförståelse | 2 | 19 | upprepning | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Talet som ska delas blir svaret | felförståelse | 1 | 20 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Talet man delar med blir svaret | felförståelse | 1 | 20 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Divisionens tal byter plats | felförståelse | 1 | 20 |  | Källa: Tabellen ger 3 : 6 = 2 som exempel. |
| Täljare och nämnare räknas var för sig | felförståelse | 1 | 8 |  | Källa: Klustret ger 1/2 + 1/3 = 2/5 som exempel. |
| Ingen gemensam nämnare; första nämnaren behålls | felförståelse | 1 | 8 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Heltalet multipliceras in i nämnaren | felförståelse | 1 | 4 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Adderar i stället för att multiplicera | felförståelse | 1 | 7 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Adderar bara täljarna | felförståelse | 1 | 8 |  | Beskrivning: Simons iakttagelse i riktiga elevsvar 2026-11-12. |
| Täljare och nämnare byter plats | felförståelse | 1 | 15 |  | Beskrivning: Simons iakttagelse i riktiga elevsvar 2026-11-12. |
| Adderar täljare och nämnare vid multiplikation | felförståelse | 1 | 3 |  | Beskrivning: Agentens förslag ur riktiga elevsvar, godkänt av Simon 2026-11-14. |
| Multiplicerar täljarna men adderar nämnarna | felförståelse | 1 | 3 |  | Beskrivning: Agentens förslag ur riktiga elevsvar, godkänt av Simon 2026-11-14. |
| Procenttalet blir svaret | felförståelse | 1 | 7 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Multiplicerar med procenttalet utan att dela med 100 | felförståelse | 1 | 4 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Dividerar med procenttalet | felförståelse | 1 | 4 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Svarar med förändringen, inte det nya värdet | felförståelse | 1 | 3 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Räknar förändringen åt fel håll | felförståelse | 1 | 3 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Andelen görs inte om till procent | felförståelse | 1 | 5 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Vänder på del och helhet | felförståelse | 1 | 5 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Talet utan bokstav faller bort | felförståelse | 1 | 3 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Slår ihop bokstavsterm och tal | felförståelse | 1 | 3 |  | Källa: Tabellen (sammanslagning) ger 2x + 3 = 5x som exempel. |
| Bokstaven faller bort | felförståelse | 1 | 3 |  | Källa: Tabellen ger 2x + 4x + 7x + 2x = 15 som exempel; Simon såg a + a + a = 3. |
| Talet framför bokstaven faller bort | felförståelse | 1 | 3 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Adderar talet framför bokstaven i stället för att multiplicera | felförståelse | 1 | 3 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Kvadrat räknas som dubbelt | felförståelse | 1 | 3 |  | Källa: Tabellen ger 6² = 12 (tre rader); samma logik som x · x = 2x. |
| Räknar från vänster till höger utan prioritering | felförståelse | 1 | 4 |  | Källa: Tabellen ger 2 + 3 · x = 5x och vänster-till-höger-beräkning. |
| Bortser från parenteserna | felförståelse | 1 | 5 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Räknar från vänster och bortser från parenteserna | felförståelse | 1 | 6 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Adderar i stället för att söka den saknade termen | felförståelse | 1 | 7 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Svarar med den kända termen | felförståelse | 1 | 7 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Svarar med måltalet | felförståelse | 1 | 7 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Använder 10-kompisen fast måltalet är ett annat | felförståelse | 1 | 4 |  | Beskrivning: Simons iakttagelse i riktiga elevsvar 2026-11-12. |
| Dubblar utan minnessiffra | felförståelse | 1 | 4 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Tio för mycket i dubbeln | felförståelse | 1 | 6 |  | Beskrivning: Simons iakttagelse i riktiga elevsvar 2026-11-12. |
| Svarar med talet utan att dubbla | felförståelse | 1 | 6 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Svarar med det givna talet i stället för hälften | felförståelse | 1 | 3 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
| Dubblar i stället för att halvera | felförståelse | 1 | 3 |  | Beskrivning: Agentens förslag, granskat och godkänt av Simon 2026-11-14. |
