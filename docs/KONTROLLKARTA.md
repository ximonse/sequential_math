# Kontrollkarta — vilka regler kontrolleras automatiskt?

Status: **kartläggning 2026-09-25**. Jämför reglerna i [produktkontraktet](PRODUCT_CONTRACT.md), [funktionskontrakten](FUNCTION_CONTRACTS.md) och [scenarierna](PRODUCT_SCENARIOS.md) med vad som faktiskt kontrolleras av en maskin.

## Varför kartan behövs

Ett dokument kontrollerar ingenting. En regel är skyddad först när något automatiskt underkänner en ändring som bryter den. Före 2026-09-25 fanns:

- **94 enhetstestfiler.** De kontrollerar enskilda funktioner var för sig, till exempel att `createTableQueue` bara lägger valda tabeller i kön. De kör inte appen.
- **Två manuella körningar i webbläsare** (S2 och S3, 2026-09-21), en gång vardera, med ett förlopp på 5–6 svar via det lokala testläget `/qa/adaptive`. Det testläget fungerar inte längre: det skickar tillbaka till inloggningen, eftersom elevernas startsida numera kräver den riktiga pilotinloggningen.
- **Inga automatiska kontroller av hela elevflödet.** Ingenting loggade in som elev, valde något, svarade och kontrollerade att det eleven fick stämde med det eleven valt.

Dessutom saknas de vardagliga självklarheterna helt i kontrakten. Kontrakten handlar om pedagogik och evidens. Ingenstans står det att knappar ska göra det de säger, att ett valt tema ska ligga kvar eller att eleven inte ska loggas ut av sig själv. De reglerna finns nu som R1–R4 nedan.

## De fyra vardagsreglerna

| Regel | Innebörd | Motsvarighet i kontrakten |
| --- | --- | --- |
| R1 | Det jag väljer är det jag får. | P7, D3, F1:s lägesmatris |
| R2 | Det jag valt ligger kvar tills jag själv ändrar det (tema, inloggning, område, nivå). | P8 delvis; tema och inloggning saknas |
| R3 | Det jag trycker på händer (siffror, radera, svara, logga ut). | Saknas |
| R4 | Appen gör ingenting bakom min rygg (nivåfall, utloggning, byte av område). | P9 och F2 regel 5 delvis |
| C1 | Uppgiften är rätt och går att svara på med knapparna. | F3 |
| V1 | Uppgifterna varierar. | F3 (variation), S10 |
| L1 | Lärarvyn visar det eleverna faktiskt gjorde. | P5, F6 |
| T1 | Texten på skärmen är hel och begriplig. | Saknas |

Klickrobotarna i [`robots/`](../robots/README.md) kontrollerar alla åtta vid varje körning.

## Kontraktet regel för regel

"Före" är läget innan klickrobotarna fanns. "Nu" är vad robotarna kontrollerar i den riktiga appen: produktionsbygget, riktig inloggning med kodnamn och PIN och riktig serverkod med en databas i minnet.

| Regel | Före | Nu (robot) | Kvar att kontrollera |
| --- | --- | --- | --- |
| P7/D3 — valt fokus byts inte tyst | Enhetstest av regelfunktioner (`sessionUtils`, `classPracticeFrame`) | Alla 9 områden, 6 tabellval och fri träning med 3 klassuppsättningar kontrolleras uppgift för uppgift | NCM, tickets |
| F1 — tabellträning håller sig till valda tabeller | Enhetstest av `createTableQueue` | 6 tabellval, upp till 3 rundor; varje runda ska ta varje gångerfaktum exakt en gång | — |
| F1 — fri träning bara inom klassens räknesätt | Enhetstest av `classPracticeFrame` | 3 klassuppsättningar, 60 uppgifter vardera, med blandat rätt och fel | Klass där läraren ändrar räknesätten mitt i ett pass |
| D1/S2 — automatisk progression | 1 manuell körning (5 svar, addition) | Alla 9 områden från nivå 1 till 12 med bara rätta svar | Långsamma men säkra svar |
| F2 regel 5/P9 — avbrott ska inte påverka nivå | Enhetstest av startbeslut (`sessionStartDecision`) | Pausspel, nej tack till paus, startsidan och tillbaka, 10 minuter borta, omladdning och ny flik: nivån får inte sjunka och återhämtning får inte starta | Nästa dag (S4, där viss återintroduktion är tillåten) |
| S3 — eleven fastnar | 1 manuell körning (6 fel) | 3 områden med 40 fel i rad: eleven stannar i området och uppgifterna varierar | Lärarsignalen efter ihållande fel |
| F3 — facit rätt | Enhetstest per domän (`verifyContent`) | Varje uppgift robotarna ser kontrolleras med domänens `verifyContent`, och aritmetiken räknas dessutom om oberoende | — |
| F3 — svaret går att skriva | Saknades | Varje rätt svar skrivs med knapparna på skärmen; saknas en knapp blir det ett regelbrott | Pekplatta med skärmtangentbord |
| F3/S10 — variation | Enhetstest av unika frågetexter | Upprepning i rad, andel olika uppgifter per nivå, tabellrundor | Statistisk jämnhet över tusentals uppgifter |
| F4/F5 — svaret sparas en gång | Enhetstester av event-API | Efter varje område kontrolleras att servern har exakt lika många svar som eleven gav | Nätavbrott och synk senare |
| R2 — tema ligger kvar | Enhetstest av `themeRole` | Tema och kontrast genom inloggning, omladdning, övning, lärarsidan och utloggning | — |
| R2/R3 — inloggning | Enhetstester av sessionen | Ingen utloggning vid omladdning, ny flik, en timmes paus eller övning; Logga ut loggar ut; bakåtknappen tar inte tillbaka eleven | QR-inloggning |
| R3 — knappar | Saknades | Varje siffra, Radera/⌫, Rensa, ±, komma, fysiskt tangentbord, Enter och dubbeltryck på Svara i 6 områden | Rityta, pausspelen |
| F6 — lärarsignal | Enhetstester av sammanställningar | Lärarrobot: klassval, antal och rätt/fel per elev, okänt visas inte som 0, tabellstatus, Behöver stöd nu med elevens riktiga felsvar, datakvalitet och rådataexport jämförs med vad eleverna faktiskt gjorde | Veckovy, elevdetaljens siffror, uppdrag |
| P5 — samma betydelse i lista och export | Enhetstester | Lärarroboten jämför snabbstatus med exporten, elev för elev | Övriga exporter |
| D3/S7 — läraruppdrag | Enhetstester | Uppdragsrobot: tre färdiga uppdrag via lärarens kopierade länk och ett låst uppdrag (exakt en nivå), med en elev som svarar rätt och en som svarar fel. Varje uppgift ska ligga inom uppdragets räknesätt och nivåram. Aktivera för alla och Rensa aktivt kontrolleras på elevens egen enhet | Snabbuppdrag från elevraden, uppdragsföljsamhet i lärarvyn |
| NCM, tickets | Enhetstester | **Inte täckt** | Egna robotar |

## Vad robotarna hittade 2026-09-25

Se [robotarnas README](../robots/README.md#senaste-fynd) för detaljer. Kort:

1. **Algebra (förenkla): ±-knappen visades men gjorde ingenting** (R3). Tangentbordet delas med Algebra (räkna ut), där knappen fungerade. Rättat: ± växlar nu minustecken i båda.
2. **Tema och kontrast återställs vid varje omladdning i utvecklingsläget** (R2). I produktionsbygget ligger temat kvar. Orsaken är att `ThemeContext` skriver standardtemat till lagringen innan det sparade temat har lästs, vilket React StrictMode avslöjar. Det drabbar inte eleverna, men det gör att den som testar lokalt ser ett fel som inte finns i produktion.
3. **Testläget `/qa/adaptive` fungerar inte längre** och skickar direkt tillbaka till inloggningen. Robotarna ersätter det.

4. **Lärarens klassval försvann vid varje omladdning** (R2), trots att sidan lovar att det sparas. Rättat.
5. **Datakvaliteten flaggade alla elever som tränat vanligt** (L1), eftersom ett pass bara räknades som avslutat via Startsida. Nu avslutas passet när sidan döljs (låst skärm, byte av app, stängd flik). Rättat efter beslut av Simon 2026-09-25.
6. **"Aktivera för alla" nådde aldrig eleverna** (R1). Det aktiva uppdraget sparades bara i lärarens egen webbläsare. Lärarvyn visade "Aktivt för alla: asg_…" medan eleverna fick fri träning. Nu sparas det på klassen och visas på elevens startsida, och lärarvyn visar uppdragets namn. Rättat.
7. **Texter utan å/ä/ö** i temaväljaren och lärarvyns felmönsterpanel och verktygstips (T1). Rättat.

Utöver det hittade robotarna **inga brott** mot R1, R4, C1 eller V1 i de områden och flöden som körs. Det gäller tabellträning, alla nio områden genom nivå 1–12, pauser och fri träning. Felen som eleverna såg i klassrummet (fel tabell, nivåfall efter paus) kunde inte återskapas i nuvarande kod, vilket stämmer med att de redan är rättade.

## Beslut om snittet

Nivåöversikten visar **Snitt belagt** per elev och **Klassmedel**. [F6](FUNCTION_CONTRACTS.md#7-f6--lärarunderlag) säger att nivåer i olika kompetenser inte får summeras till en generell nivå eller ett jämförande klassnitt. Simon beslutade 2026-09-25 att snittet ska vara kvar, och att nivåöversikten ska gå att exportera (`Exportera nivåöversikt`). Okända områden räknas inte in i snittet. Lärarroboten jämför exporten med panelen cell för cell.

## Hur kartan hålls aktuell

- Robotarna körs i CI (`robots`-jobbet i `.github/workflows/verify.yml`) på varje pull request. Rapporten laddas upp som artefakten `robotrapport`.
- En ny regel i ett kontrakt ska få en rad här: hur den kontrolleras, eller "Inte täckt".
- Ett fel som elever eller lärare hittar blir först en robotkontroll som blir röd, och rättas sedan.
