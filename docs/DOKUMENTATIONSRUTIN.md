# Dokumentationsrutin (obligatorisk)

Syfte: manualer och felsokning ska alltid spegla hur appen faktiskt fungerar.

Grundprincip: **Kod ar alltid facit**.
- Om dokumentation och implementation skiljer sig ska dokumentationen uppdateras.
- Konceptdokument/pseudokod maste markeras tydligt som designniva, inte runtime.

## Nar maste dokumentationen uppdateras?

Uppdatera dokumentation vid alla andringar som paverkar:
1. lararfloden (dashboard, elevvy i lararvyn, exporter, ticket/publicering),
2. elevfloden (inloggning, startsida, traningslage, feedback, pausflode, ticket),
3. installning/deploy (env-vars, auth, cloud-sync),
4. datatolkning i UI (nya statusfarger, nya nyckeltal, nya etiketter),
5. felsokning (nya vanliga fel eller andrad felorsak/atgard).

Vid andringar i larardashboardens siffror/kolumner ska dessa ocksa granskas:
- `docs/LARARDASHBOARD_LOGIK.md`
- `docs/EXPORTER_OVERSIKT.md`
- `docs/EXPORTER_RADATA.md`
- `docs/reflektion.md` (om pedagogisk tolkning eller datakvalitet paverkas)

## Definition of Done for funktionsandringar

En andring ar inte klar forran denna check ar gjord:
1. `docs/MANUAL_LARARE.md` granskad/uppdaterad vid lararpaverkan.
2. `docs/MANUAL_ELEV.md` granskad/uppdaterad vid elevpaverkan.
3. `docs/FELSOKNING.md` uppdaterad vid nya felbilder eller andrad setup.
4. `README.md` uppdaterad vid andrade env-vars, auth, eller driftkrav.
5. `docs/LARARDASHBOARD_LOGIK.md` uppdaterad vid andrad panel-/kolumnlogik i lararvyn.
6. `docs/EXPORTER_OVERSIKT.md` och/eller `docs/EXPORTER_RADATA.md` uppdaterade vid andrade exportkolumner/berakningar.
7. `docs/reflektion.md` uppdaterad vid andrade principer for tolkning, reliabilitet eller validitet.

## Praktisk commit-regel

Vid varje relevant featurefix/feature:
1. inkludera docs-andring i samma commit, eller
2. gor direkt efterfoljande docs-commit med tydlig referens till feature-commit.

Om ingen dokumentation paverkas:
- skriv `Docs impact: none` i commit-meddelandet eller PR-beskrivningen.

## Snabb kontroll innan push

1. Las igenom text i aktuell vy i appen.
2. Kontrollera att ordval i manualen matchar UI-rubriker/knappnamn.
3. Kontrollera att exempel och felmeddelanden fortfarande stammer.
