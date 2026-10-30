# Gemensam adminstil från screening, 2026-10-29

Simon beställer samma grafiska stil som **Screening: dela ut** i admin,
med uttryckligt undantag för **Framsteg**. Elevvyer ingår inte.
Referens: [godkänd screening](ui-reference/README.md), `ui-planering`
och Simons designgrund. Simon godkände publicering av den visade och
verifierade ändringen 2026-10-29. Faktisk publiceringsstatus finns i kartan.

Arbetet återanvänder referensens systemtypsnitt, rubrikhierarki, kompakta
kontroller, vita temaanpassade paneler, indigo huvudhandlingar, mjuka
valmarkeringar och gul aktiv navigation. Ingen ny meny eller lagring införs.

| Arbetsläge | Struktur som behålls |
|---|---|
| Fokusövningar | Klassurval, grupp/individ/pass, visualisering och underlag |
| Uppdrag & tickets | Visningsurval, tydliga mottagare, uppdrag och tickets |
| Statistik & stöd | Klassurval, sammanfattning och separata analysmoduler |
| Screening: dela ut | Befintlig godkänd referens, översikt och redigeringsflöde |
| Screening: resultat | Mottagare, samling och genomgång av konkreta svar |
| Administration | Klasser/grupper, objektets flikar och separat farlig hantering |
| Materialgranskning | Versionsval, innehåll, underlag, mottagare och godkännande |

Genomförande: dela screeningens visuella grund, använd den enbart på
berörda arbetslägen, anpassa paneler och flikar och granska verkliga
renderingar med syntetiska data. Framsteg jämförs före/efter. Semantiska
statusfärger, diagram, räknehäfte och elevförhandsvisningar behåller sina
betydelser. Bekräftelser, spargränser och urval ändras inte.

Klart när breda och stående vyer är läsbara, mörkt tema fungerar,
huvudinteraktioner fungerar och Framsteg/elevsidor är opåverkade.
Verifiering och publiceringsstatus förs i projektkartan.

## Lokalt verifierat

- 194 testfiler / 955 tester, slutligt produktionsbygge och riktad lint gröna.
- 18 berörda browserfall gröna: klass/grupp, uppdrag/tickets, läraruppföljning,
  screeningnavigation och materialgranskning. Ytterligare sju fall mot
  produktionsbygget verifierar adminlänk, fokusunderlag, diagram och behörigheter.
- Separat vygranskning med tre syntetiska elever: alla sju arbetslägen i
  1024×768 och 768×1024, öppnade klassflikar, tickets, uppdragsdialog och
  materialgranskning. Mörkt tema samt 390 px admin/uppdrag/material ingår.
- Framstegs 1024×4979-skärmbild i utvecklingsläget är pixelidentisk före/efter; även uppmätta
  typsnitt och rubriker är identiska. Detta avser det syntetiska underlaget,
  inte en fullständig pixeljämförelse av alla tänkbara tillstånd.
- Inga nya tester för CSS-värden. Tillfälligt vygranskningsskript och kvittenser
  finns ignorerade under `robots/test-results/admin-style/`.

Funktions- och vyproven använder lokal Chromium-/touch-emulering med
minnes-KV. Ingen fysisk iPad eller riktig elevdata användes i dessa prov.

Samma vygranskning passerar även mot det slutliga produktionsbyggets CSS.
Produktionsläge saknar utvecklingslägets lokala testdatamodul i Framsteg;
skärmbilder mellan dessa olika körlägen används därför inte som pixelbevis.

Exempel från den verkliga lokala renderingen, med syntetiska data:
[Administration](ui-reference/admin-style-2026-10-29/administration.png),
[uppdrag stående](ui-reference/admin-style-2026-10-29/assignments-portrait.png),
[fokus mörkt](ui-reference/admin-style-2026-10-29/focus-dark.png),
[materialgranskning](ui-reference/admin-style-2026-10-29/material-review.png).

## Publicerat 2026-10-29

Efter Simons uttryckliga klartecken publicerades ändringen via
[PR #27](https://github.com/ximonse/sequential_math/pull/27).
Testad PR-head `d90894a2a7e6d5ed137ce66e902bd1d856d2d40f` har gröna
quality/documentation-kontroller (run 40870490137) och READY-preview.
Produktionsmerge: `56bec85c72dc05fbe247483df3fd4311f48a8002`.
Vercel `sekvens`, deployment `dpl_D6yGnQxk1KGEV9n3pcT7EdJmvmk9`, är READY
med target production och alias `matematik.ximon.se` på samma Git-revision.

Domänen svarar HTTP 200. JavaScript `index-ovZ-cZgE.js` och CSS
`index-CWjLGKg0.css` matchar det lokalt verifierade bygget exakt med SHA256.
Både materialutkastens och screeningutkastens API svarar 401 utan inloggning.
Det verifierar publicering, filer och åtkomstskydd; ingen inloggad visuell
produktionsgenomgång eller elevutdelning utfördes i releasekontrollen.
