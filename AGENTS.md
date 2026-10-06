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

### Projektkartan är den gemensamma arbetsöversikten

Läs `docs/screening-map/plan.json` och `docs/screening-map/README.md` före
implementation. Simon redigerar samma plan i HTML-kartan; agenten ansvarar för
att visualisera arbetet och hålla kort, deluppgifter, beslut, tanketrådar,
beroenden och belägg aktuella. Kartan omfattar nu främst Screening; när annat
repoarbete saknar kort, lägg till relevant kort/område i denna karta.

- Läs alltid senaste fil/revision innan skrivning. Bevara Simons ändringar,
  kryssrutor och anteckningar. Återgenerera aldrig planen från `generate.py`.
- Uppdatera kartan i samma ändringssjok när kod, funktion, verifieringsstatus,
  beslut, issue, beroende eller publiceringsstatus ändras. Skilj mellan
  föreslaget, beslutat, byggt, lokalt testat, pushat och produktion i beläggen.
  Ett avbockat delmoment innebär inte automatiskt en publicerad funktion.
- Skriv en kort nästa uppgift och ett konkret klart-när-villkor. Behåll
  tanketrådar och beslutshistorik. Ändra inte produktbeslut utan Simons mandat.
- Agentens skrivning ska använda `scripts/update-project-map.mjs` med en
  uttryckligt läst SHA256-revision; HTML-vyn använder samma lås/CAS/backup.
  Vid konflikt: läs nytt underlag och sammanför avsiktliga ändringar; skriv
  inte över med en gammal helplan. Se README för kommandon.
- Kör `npm run check:project-map` och före commit
  `npm run check:project-map -- --staged`. CI kontrollerar också att kartan
  ingår vid kodändringar. Kontrollens täckning är syntaktisk: agenten måste
  själv kontrollera att texten faktiskt beskriver ändringen korrekt.

HTML-kartan körs lokalt med `npm run plan:dev` på port 5325. Uttrycklig Spara
kort skriver `plan.json`; ingen dold autosparning. Produktionspublicering
av matematikappen är ett separat mandat och följer reglerna nedan.

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
