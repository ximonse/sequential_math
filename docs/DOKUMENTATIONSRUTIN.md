# Dokumentationsrutin (obligatorisk)

Syfte: manualer och felsökning ska alltid spegla hur appen faktiskt fungerar.

Grundprincip: **Koden är alltid facit**.
- Om dokumentation och implementation skiljer sig ska dokumentationen uppdateras.
- Konceptdokument och pseudokod måste markeras tydligt som designnivå, inte runtime.

## När måste dokumentationen uppdateras?

Uppdatera dokumentation vid alla ändringar som påverkar:
1. lärarflöden (dashboard, elevvy i lärarvyn, exporter, ticket/publicering),
2. elevflöden (inloggning, startsida, träningsläge, feedback, pausflöde, ticket),
3. organisation eller behörighet (skolor, klasser, roller, klasslänk eller elevkod),
4. installation/deploy (env-vars, auth, cloud-sync),
5. datatolkning i UI (nya statusfärger, nya nyckeltal, nya etiketter),
6. felsökning (nya vanliga fel eller ändrad felorsak/åtgärd).

Vid ändringar i lärardashboardens siffror/kolumner ska dessa också granskas:
- `docs/LARARDASHBOARD_LOGIK.md`
- `docs/EXPORTER_OVERSIKT.md`
- `docs/EXPORTER_RADATA.md`
- `docs/reflektion.md` (om pedagogisk tolkning eller datakvalitet påverkas)

## Definition of Done för funktionsändringar

En ändring är inte klar förrän denna check är gjord:
1. `docs/MANUAL_LARARE.md` granskad/uppdaterad vid lärarpåverkan.
2. `docs/MANUAL_ELEV.md` granskad/uppdaterad vid elevpåverkan.
3. `docs/ORGANISATION_OCH_INLOGGNING_KONTRAKT.md` uppdaterad vid ändrad organisation, roll, behörighet eller inloggning.
4. `docs/FELSOKNING.md` uppdaterad vid nya felbilder eller ändrad setup.
5. `README.md` uppdaterad vid ändrade env-vars, auth eller driftkrav.
6. `docs/LARARDASHBOARD_LOGIK.md` uppdaterad vid ändrad panel-/kolumnlogik i lärarvyn.
7. `docs/EXPORTER_OVERSIKT.md` och/eller `docs/EXPORTER_RADATA.md` uppdaterade vid ändrade exportkolumner/beräkningar.
8. `docs/reflektion.md` uppdaterad vid ändrade principer för tolkning, reliabilitet eller validitet.

## Pull request och CI

Varje pull request har en dokumentationschecklista i `.github/pull_request_template.md`. CI kräver att exakt ett av alternativen är markerat: berörd dokumentation är uppdaterad, eller att ändringen saknar dokumentationseffekt med en kort förklaring.

CI kör också `npm run check:architecture`. Kontrollen rapporterar källfiler från 600 rader och stoppar filer över 800 rader. Trösklarna är granskningssignaler, inte en ersättning för ansvarsfördelning: vid cirka 600 rader ska nästa ändring bedöma och dokumentera om filen bör delas upp.

## Praktisk commit-regel

Vid varje relevant featurefix eller feature:
1. inkludera docs-ändring i samma commit, eller
2. gör direkt efterföljande docs-commit med tydlig referens till feature-commit.

Om ingen dokumentation påverkas ska PR-checklistan ange varför.

## Snabb kontroll innan push

1. Läs igenom text i aktuell vy i appen.
2. Kontrollera att ordval i manualen matchar UI-rubriker och knappnamn.
3. Kontrollera att exempel och felmeddelanden fortfarande stämmer.
4. Kör dokumentations- och arkitekturkontrollerna som ingår i CI.
