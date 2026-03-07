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

## Arbetsflöde

1. Börja med kontextanalys mot arkitekturen innan större ändringar.
2. Vid domänspecifika uppgifter: läs relevant dokument i `docs/` först.
3. Efter större ändringar: verifiera mot målbilden i `app_utvardering.md`.
4. Om kodändringen påverkar beteende/flöde: uppdatera dokumentation i repo.
5. Commita ofta i små, tydliga steg.
6. Fråga människan innan `git push` och innan destruktiva kommandon.

## Verifiering efter kodändring

1. `npm run test`
2. `npm run build`

Om test eller build faller: rapportera felet tydligt, gör inga fler riskfyllda steg
och committa inte som om ändringen vore klar.
