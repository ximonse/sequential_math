# Syntetisk körning: hela utredningskedjan

Regelversion: `synthetic-investigation-v1`. Konstruerade observationer och simulerad granskning; ingen elevapp, datalagring eller didaktisk effekt verifierad.

## single_exchange

| Steg | Fas | Handling | Regel | Fråga / motivering |
|---|---|---|---|---|
| 1 | investigate | ask | check_prerequisite | 13 − 8 |
| 2 | teaching | propose_teaching | reviewed_learning_need | Konstruerad granskning: två felkontraster och förenligt synligt resonemang. |
| 3 | independent | ask | check_without_help | 831 − 416 |
| 4 | independent | ask | check_without_help | 972 − 548 |
| 5 | followup | ask | followup_required | 752 − 436 |
| 6 | followup | ask | followup_required | Du har 83 kr och betalar 46 kr. Hur mycket har du kvar? |
| 7 | closed | stop | supported_in_tested_scope | Stabil självständig förståelse i prövade situationer, även vid senare uppföljning. Inget besked om oprövade delmoment eller permanent borttagen felförståelse. |

## fraction_comparison

| Steg | Fas | Handling | Regel | Fråga / motivering |
|---|---|---|---|---|
| 1 | investigate | ask | separate_fraction_rules | Vilket är störst: 4/7 eller 4/9? |
| 2 | teaching | propose_teaching | reviewed_learning_need | Konstruerad granskning: två felkontraster och förenligt synligt resonemang. |
| 3 | independent | ask | check_without_help | Vilket är störst: 5/6 eller 11/13? |
| 4 | independent | ask | check_without_help | Vilket är störst: 13/15 eller 6/7? |
| 5 | followup | ask | followup_required | Vilket är störst: 8/9 eller 17/19? |
| 6 | followup | ask | followup_required | Två lika stora flaskor är fyllda till 19/21 respektive 9/10. Vilken innehåller mest? |
| 7 | closed | stop | supported_in_tested_scope | Stabil självständig förståelse i prövade situationer, även vid senare uppföljning. Inget besked om oprövade delmoment eller permanent borttagen felförståelse. |

Varje beslut och dess indata finns i investigation-prototype.json. Antal frågor och senare tillfälle är prototypregler, inte validerade diagnostiska trösklar.
