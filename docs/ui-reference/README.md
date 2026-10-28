# Godkänd screeningreferens

`screening-approved.html` är en oförändrad kopia av den klickbara skiss Simon
bedömde i samtalet 2026-10-28, efter sökbart flerval och balanserad täthet.
Det är en HTML-fragmentreferens med syntetiska data, inte en produktionsvy.
Ursprunglig SHA256: `e5a90e7357750b3f9d00a14c7a59b016d792a4cdccf2de7d360cf90048f84808`.

## Det som ska följas

| Referens | Kontroll i den riktiga appen |
| --- | --- |
| Systemtypsnitt, 14 px grundtext, 23/17 px rubriker, 14 px panelpadding, indigo huvudhandling, mjuka valmarkeringar och gul aktiv navigation | Granska den faktiska ljusa renderingen, även stående. Kompakta kontroller får inte göra vyn platt eller hoptryckt. |
| Utdelat / Materialbibliotek | Biblioteket visar verkliga privata versionsutkast och tidigare innehåll som kan återanvändas. Inga falska sparade mallar eller demokvitton. |
| Kompakt Visa för på översikten | Urvalet påverkar listans elever, antal och status, samt den resultatvy som öppnas. Det väljer inga utdelningsmottagare. Kombinationer och enskilda elever finns under ett uttryckligt avancerat visningsurval. |
| Återanvänd / Skapa ny → Innehåll → Mottagare → Kontroll → Kvitto | Nya flöden börjar utan gamla mottagare. Sökning, överlapp och tillbakagång bevarar val. Kvittot bygger på verklig serverrespons och kan återförsökas utan dubbletter. |
| Avgränsat innehållssteg | Produktionens privata utkast, versionshistorik och ofärdiga frågor bevaras. Bara tillagda frågor delas ut. |

Skissens förenklade innehållsformulär ersätter inte den verkliga redigerarens
funktioner. Den kompletteras enligt den skriftliga planen: kategoriserad
uppgiftsbank, fasta bildroller Fråga/Svar, explicit bildinfogning och
elevförhandsvisning. Byte av svarssätt får inte tyst radera alternativ/facit.

Appens kontoknappar, synkstatus och temaväljare finns kvar; skissens demobanner
och demodata förs inte in i appen. Den lokala screeningvarianten ändrar inte
Framsteg, andra arbetslägen eller elevens tema. Vid mörkt tema behålls appens
temafärger med samma struktur och läsbar hierarki.

## Före klartbesked

Jämför fylld översikt, material, mottagare och kontroll/kvitto med referensen.
Prova även redigering av frågebild och svarsalternativ, privat sparning/
omladdning/versioner, avböjt destruktivt svarssättsbyte, gruppens status och
resultat samt bevarade utkast vid tillbakagång. Kontrollera tangentbord,
fokus, smal vy och felkvittens. Skilj lokal kod/render/test från publicering.

Referensen är ett underlag att jämföra mot, inte en bild som varje test ska
matcha pixel för pixel oavsett innehåll. Betydande avvikelser ska förankras
i stället för att referensen skrivs om till att passa implementationen.
