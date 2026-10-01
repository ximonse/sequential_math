# AGENTS.md — Sequential Math

Detta är den lokala agentguiden för just detta repo.
Använd inte instruktioner från andra projektmappar om de krockar med denna fil.
Vid konflikt gäller system-/developer-instruktioner först, därefter denna fil.

## Grundregel

Om något är oklart: fråga människan. Gissa inte.

## Läsordning (source of truth)

1. `.agent-instructions.md`
2. `ARCHITECTURE.md`
3. `app_utvardering.md`
4. relevanta filer i `docs/`

Notis: I vissa miljöer kan motsvarande dokument refereras under `src/`.
Om de inte finns där, använd filerna i projektroten.

## Aktiv projektriktning: NCM-diagnostik

Vid arbete med NCM, diagnostiska uppdrag, uppställningar eller analys av
elevens räknesätt: läs `docs/NCM_DIAGNOSTIK_PROJEKT.md` innan planering eller
kodändring. Projektets kärna är att bevara och analysera elevens uträkning
som underlag för begripliga lärarsignaler. Det är inte mängdträning och får
inte tyst påverka vanlig mastery eller adaptiv progression.

## Arbetsflöde

1. Börja med kontextanalys mot arkitekturen innan större ändringar.
2. Vid domänspecifika uppgifter: läs relevant dokument i `docs/` först.
3. Efter större ändringar: verifiera mot målbilden i `app_utvardering.md`.
4. Om kodändringen påverkar beteende/flöde: uppdatera dokumentation i repo.
5. Commita ofta i små, tydliga steg.
6. Fråga människan innan `git push` och innan destruktiva kommandon.
7. Avsluta aldrig ett arbetspass utan ett tydligt nästa steg: ställ en konkret fråga,
   lämna ett förslag eller ge en slutlig bekräftelse när uppdraget faktiskt är klart.

### Fortsättning och stoppregel för alla agenter

När Simon säger ”fortsätt” eller ”jobba på” ska agenten ta nästa genomförbara
delmål i den aktiva projektplanen och arbeta vidare. En lokal commit, en grön
testkörning eller ett svar med ”nästa steg” är inte i sig ett stoppvillkor.

Innan ett ofärdigt projekt lämnas tillbaka till Simon ska agenten kontrollera:

1. Är det efterfrågade målet faktiskt klart och verifierat?
2. Krävs ett **konkret** beslut eller en uppgift som bara Simon kan utföra nu?
3. Finns ett **verifierat** tekniskt hinder som stoppar nästa genomförbara steg?

Om alla svar är nej fortsätter agenten med nästa steg. Om ett beslut eller hinder
finns ska agenten ange exakt vad det gäller, vad som redan är gjort och vilket
arbete som kan fortsätta utan svar. Fråga inte om beslut som ännu inte påverkar
arbetet. Förväxla inte en avgränsad provning med driftsättning för riktiga elever.

Be aldrig Simon testa en funktion innan agenten har verifierat att just den
funktionens kod, åtkomstväg, kontotyp och publiceringsstatus gör testet möjligt.
Särskilj alltid lokal kod, lokal webbläsare, pushad gren och produktion.

## Publicering

Publicera alltid via GitHub — aldrig direkt till Vercel.

Push till `origin/master` triggar Vercel-projektet `sekvens`, som äger
produktionsdomänen `matematik.ximon.se`. Det är den enda vägen till produktion.

Kör aldrig `vercel deploy` eller annan manuell Vercel-deploy från denna mapp,
och skapa ingen `.vercel`-länk här. Behöver något deployas utanför GitHub-flödet:
fråga människan först.

Varning: det finns ett gammalt, övergivet Vercel-projekt som heter
`sequential_math` (domän `sequentialmath.vercel.app`). Det saknar git-koppling
och serverar ett inaktuellt bygge. Namnet matchar repot och är lätt att förväxla
med `sekvens` — kontrollera alltid projektnamnet innan slutsatser dras om
deploy-status.

## Verifiering efter kodändring

1. `npm run test`
2. `npm run build`
3. `npm run robots` — klickrobotar som använder appen som en elev (se `robots/README.md`). Behövs när logik ändras (uppgifter, nivåer, uppdrag, tabeller, pauser, inloggning, sparande, lärarvyns siffror), inte för CSS, texter eller dokument. De körs inte automatiskt i CI.

Varje ändring ska hålla de fyra vardagsreglerna, oavsett vad uppgiften gällde:

- **R1** Det jag väljer är det jag får.
- **R2** Det jag valt ligger kvar tills jag själv ändrar det.
- **R3** Det jag trycker på händer.
- **R4** Appen gör ingenting bakom min rygg.

Hittar du ett fel som bryter mot någon av dem: lägg först till en robotkontroll som blir röd och rätta sedan felet.

Om test eller build faller: rapportera felet tydligt, gör inga fler riskfyllda steg
och committa inte som om ändringen vore klar.
