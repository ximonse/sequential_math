# Aktuell modell- och kontrasttäckning

Datum: 2026-11-04. Kodbas `82ab332`; regelversion v7, aritmetikbank v5. Se [syntesen](LEARNING_SYSTEM_SYNTHESIS.md) för ansvar, motsägelser och genomförandeordning.

Senare samma dag rättar E1 kontrastens operatorvisning och uppföljningsresultatets
fullständighet/påståenden. Kandidat-ID:n och bankinnehåll i tabellen är oförändrade.
De länkade maskinbeläggen är den frysta ursprungsinventeringen; se syntesens
genomförandestatus för skillnaden mellan historiskt fynd och rättat beteende.

E2 bevarar därefter alla möjliga modellsvar och deras överlapp i urval och
sparad prövningsavsikt. Kandidat-ID:n är fortfarande samma, men tabellens
frysta bankexempel är inte en ny körning av den förbättrade väljaren.

## Läs tabellen rätt

- Varje rad är ett explicit kandidat-ID inom en domän, inte en fastställd felförståelse eller NCM-diagnos. Samma ID kan förekomma i flera domäner.
- 62 domän/modell-par har inventerats statiskt och fått minst ett beräknat exempel i en ändlig sökning med 8 500 konstruerade problem. Räknehäftets avvikelsesignal tillkommer separat.
- **Probe** betyder att ett oanvänt exempel hittades i den lilla probelistan när bara en modell prövades. Det bevisar inte separation av samtidiga rivaler.
- **Bank** betyder att aritmetikens väljare hittade något urval med stöduppgiften utesluten och i övrigt tom tidigare historik. Det bevisar inte två nya frågor, samma matematiska delmoment eller att alla rivaler skiljs åt.
- **Ej hittat** gäller den dokumenterade sökningen. För andra domäners bankflöde är begränsningen dessutom strukturell: kontrastpanelen använder bara aritmetikbanken.
- Tillämplighet är observerade scopes i exemplen. De fullständiga talgränserna och strukturvillkoren finns i respektive kandidatmodul, länkad per område. Ingen fullständighet över alla uppgiftstyper påstås.
- Inmatningssignaler saknar avsiktligt kontrastknapp. Snabbhetsträning föreslår inte kontrastfrågor. Bankträffar i tabellen får inte kringgå dessa regler.

## Kandidater per domän

### arithmetic (34)

Källor: [arithmetic.js](../src/domains/predictableErrors/arithmetic.js), [subtractionCandidates.js](../src/domains/arithmetic/subtractionCandidates.js), [core.js](../src/domains/predictableErrors/core.js).

| Modell | Scope i exemplen | Exempel: modellsvar / facit | Probe | Bank |
|---|---|---|---|---|
| `add_left_to_right` | addition | 16 / 125 | `rule-add-b` | `add-tens-carry-001`, `add-chain-carry-001` |
| `answer_off_by_one` | multiplication | 55 / 56 | `rule-mul-a` | Ej hittat |
| `borrow_forget` | decimal_subtraction, subtraction | 4.3 / 4.25 | `rule-zero-a` | `sub-exchange-001`, `sub-exchange-002` |
| `carry_forget` | addition, decimal_addition | 75 / 85 | `rule-add-b` | `add-carry-001`, `add-tens-carry-001` |
| `column_sums_concatenated` | addition | 715 / 85 | `rule-add-b` | `add-carry-001`, `add-tens-carry-001` |
| `decimal_parts_multiplied_separately` | multiplication | 42.49 / 46.9 | Ej hittat | Ej hittat |
| `div_remainder_as_ones` | division | 12 / 17 | Ej hittat | `div-short-001`, `div-short-002` |
| `div_remainder_ignored` | division | 12 / 17 | Ej hittat | `div-short-001`, `div-short-002` |
| `div_zero_dropped` | division | 3 / 30 | Ej hittat | `div-zero-001`, `div-zero-002` |
| `dividend_as_answer` | division | 42 / 7 | `rule-div-b` | `div-short-001`, `div-short-002` |
| `divisor_as_answer` | division | 6 / 7 | `rule-div-b` | `div-short-001`, `div-short-002` |
| `exchange_not_decremented` | subtraction | 45 / 35 | `rule-zero-a` | `sub-exchange-003`, `sub-exchange-004` |
| `last_two_digits_swapped` | addition, division, multiplication, subtraction | 58 / 85 | `rule-add-b` | `add-carry-001`, `add-no-carry-002` |
| `mul_carry_added_before` | multiplication | 122 / 92 | `rule-mul-b` | `mul-carry-002`, `mul-carry-003` |
| `mul_carry_always_one` | multiplication | 74 / 84 | Ej hittat | `mul-carry-002`, `mul-carry-004` |
| `mul_carry_forgotten` | multiplication | 82 / 92 | `rule-mul-b` | `mul-carry-002`, `mul-carry-003` |
| `mul_columnwise` | multiplication | 32 / 92 | `rule-mul-b` | `mul-carry-002`, `mul-carry-003` |
| `mul_no_row_shift` | multiplication | 22 / 121 | Ej hittat | `mul-two-digit-001`, `mul-two-digit-002` |
| `mul_partials_concatenated` | multiplication | 812 / 92 | `rule-mul-b` | `mul-carry-002`, `mul-carry-003` |
| `one_carry_forgotten` | addition | 115 / 125 | `rule-add-b` | `add-chain-carry-001`, `add-chain-carry-002` |
| `ones_digits_only` | multiplication | 12 / 92 | `rule-mul-b` | `mul-carry-002`, `mul-carry-003` |
| `operation_swap` | addition, decimal_addition, decimal_subtraction, division, multiplication, subtraction | 9 / 85 | `rule-add-b` | `add-no-carry-001`, `add-carry-001` |
| `partial_answer_entry` | addition, division, multiplication, subtraction | 8 / 85 | `rule-add-b` | `add-no-carry-001`, `add-carry-001` |
| `phantom_carry` | addition | 21 / 11 | Ej hittat | `add-no-carry-001`, `add-no-carry-002` |
| `place_value_scaling` | addition, decimal_addition, decimal_subtraction, division, multiplication, subtraction | 850 / 85 | `rule-add-b` | `add-no-carry-001`, `add-carry-001` |
| `quotient_off_by_one` | division | 6 / 7 | `rule-div-b` | `div-short-001`, `div-short-002` |
| `reversed_operands` | division | 0.14285714285714285 / 7 | `rule-div-b` | `div-short-001`, `div-short-002` |
| `second_exchange_inverted` | subtraction | 266 / 236 | `rule-zero-b` | `sub-through-zero-001`, `sub-through-zero-003` |
| `smaller_minus_larger` | decimal_subtraction, subtraction | 4.35 / 4.25 | `rule-zero-a` | `sub-exchange-001`, `sub-exchange-002` |
| `sub_left_to_right` | subtraction | 345 / 236 | `rule-zero-b` | `sub-through-zero-001`, `sub-through-zero-003` |
| `table_off_by_one` | multiplication | 49 / 56 | `rule-mul-b` | `mul-carry-001`, `mul-carry-002` |
| `unnecessary_exchange` | subtraction | 1 / 11 | Ej hittat | `sub-no-exchange-001`, `sub-no-exchange-002` |
| `zero_donor_not_decremented` | subtraction | 336 / 236 | `rule-zero-b` | `sub-through-zero-001`, `sub-through-zero-003` |
| `zero_intermediate_ten` | subtraction | 246 / 236 | `rule-zero-b` | `sub-through-zero-001`, `sub-through-zero-003` |

### fractions (4)

Källor: [fractions.js](../src/domains/predictableErrors/fractions.js).

| Modell | Scope i exemplen | Exempel: modellsvar / facit | Probe | Bank |
|---|---|---|---|---|
| `fraction_add_instead_of_multiply` | multiplication | 19/15 / 2/5 | `rule-frac-int-a` | Saknar domänväg |
| `fraction_components_separately` | addition, subtraction | 3/8 / 11/15 | `rule-frac-add-b` | Saknar domänväg |
| `fraction_integer_in_denominator` | multiplication | 3/28 / 12/7 | Ej hittat | Saknar domänväg |
| `fraction_keep_first_denominator` | addition, multiplication, subtraction | 3/5 / 11/15 | `rule-frac-add-b` | Saknar domänväg |

### percentage (6)

Källor: [percentage.js](../src/domains/predictableErrors/percentage.js).

| Modell | Scope i exemplen | Exempel: modellsvar / facit | Probe | Bank |
|---|---|---|---|---|
| `percentage_change_amount_only` | discount, increase | 50 / 200 | Ej hittat | Saknar domänväg |
| `percentage_change_reversed` | discount, increase | 300 / 200 | Ej hittat | Saknar domänväg |
| `percentage_divide_by_percent_number` | percent_of | 20.833333333333332 / 30 | Ej hittat | Saknar domänväg |
| `percentage_number_as_amount` | discount, increase, percent_of | 12 / 30 | Ej hittat | Saknar domänväg |
| `percentage_part_whole_reversed` | share | 333.33333333333337 / 30 | Ej hittat | Saknar domänväg |
| `percentage_ratio_not_converted` | share | 0.3 / 30 | Ej hittat | Saknar domänväg |

### algebra (6)

Källor: [algebra.js](../src/domains/predictableErrors/algebra.js).

| Modell | Scope i exemplen | Exempel: modellsvar / facit | Probe | Bank |
|---|---|---|---|---|
| `algebra_coefficient_added` | algebra_evaluate | 12 / 23 | Ej hittat | Saknar domänväg |
| `algebra_coefficient_dropped` | algebra_evaluate | 8 / 23 | Ej hittat | Saknar domänväg |
| `algebra_constant_dropped` | algebra_simplify | 5x / 5x+4 | Ej hittat | Saknar domänväg |
| `algebra_square_as_double` | algebra_evaluate | 12 / 36 | Ej hittat | Saknar domänväg |
| `algebra_unlike_terms_combined` | algebra_simplify | 9x / 5x+4 | Ej hittat | Saknar domänväg |
| `algebra_variable_dropped` | algebra_simplify | 9 / 5x+4 | Ej hittat | Saknar domänväg |

### arithmetic_expressions (3)

Källor: [expressions.js](../src/domains/predictableErrors/expressions.js).

| Modell | Scope i exemplen | Exempel: modellsvar / facit | Probe | Bank |
|---|---|---|---|---|
| `expression_left_to_right` | numeric_expression | 35 / 19 | `rule-expr-b` | Saknar domänväg |
| `expression_left_to_right_no_parentheses` | numeric_expression | 35 / 19 | `rule-expr-b` | Saknar domänväg |
| `expression_parentheses_ignored` | numeric_expression | 29 / 44 | Ej hittat | Saknar domänväg |

### number_fluency (9)

Källor: [fluency.js](../src/domains/predictableErrors/fluency.js), [core.js](../src/domains/predictableErrors/core.js).

| Modell | Scope i exemplen | Exempel: modellsvar / facit | Probe | Bank |
|---|---|---|---|---|
| `answer_off_by_one` | forward_double, number_bonds | 8 / 9 | Ej hittat | Saknar domänväg |
| `bond_known_term_returned` | number_bonds | 6 / 9 | Ej hittat | Saknar domänväg |
| `bond_sum_instead_of_missing` | number_bonds | 21 / 9 | Ej hittat | Saknar domänväg |
| `bond_target_returned` | number_bonds | 15 / 9 | Ej hittat | Saknar domänväg |
| `double_instead_of_half` | inverse_double | 56 / 14 | Ej hittat | Saknar domänväg |
| `double_known_product_returned` | inverse_double | 28 / 14 | Ej hittat | Saknar domänväg |
| `double_no_carry` | forward_double | 46 / 56 | Ej hittat | Saknar domänväg |
| `double_original_returned` | forward_double | 28 / 56 | Ej hittat | Saknar domänväg |
| `partial_answer_entry` | forward_double | 5 / 56 | Ej hittat | Saknar domänväg |

## Kompletterande metod-/inmatningssignaler

`notebook_answer_mismatch` produceras i [evidensanalysen](../src/lib/evidencePredictableAnalysis.js) för felaktigt screening-slutsvar när den snäva additions-/subtraktionsläsaren ser rätt resultat i räknehäftet. Den räknar inte självständigt ut hur eleven tänkte. Den saknar avsiktligt kontrastknapp och ska inte användas som en matematisk felförståelse.

Screeningens separata placerings-/resultatsignaler P/Ö och den uppgiftsspecifika M-regeln finns i [screeningsammanfattningen](../src/domains/arithmetic/diagnosticScreeningSummary.js). M gäller endast 402−178 med särskilda rutnätsvillkor. De är inte ytterligare generella v7-modeller. Metodanalys av multiplikationsdelprodukter och divisionsrester saknas i den snäva rutnätsläsningen.

## Äldre signalinventering jämförd med aktuella källor

Följande 33 filbundna signalposter från [inventeringen 2026-10-30](NCM_RULE_READINESS.json) har lästs igen. Tabellen visar äldre analyslager, inte ytterligare 33 unika modellkandidater. En kvarvarande literal bevisar inte samma beteende eller didaktisk giltighet. Historiska hashskillnader är väntade efter senare ändringar.

| Domän | Signal | Äldre klass | Literal finns kvar | Filhash samma som historisk inventering |
|---|---|---|---|---|
| arithmetic | [`place_value_error`](../src/domains/arithmetic/analyzeError.js) | candidate | Ja | Nej |
| arithmetic | [`calculation_error`](../src/domains/arithmetic/analyzeError.js) | generic | Ja | Nej |
| arithmetic | [`operation_swap`](../src/domains/arithmetic/analyzeError.js) | candidate | Ja | Nej |
| arithmetic | [`digit_reversal`](../src/domains/arithmetic/analyzeError.js) | candidate | Ja | Nej |
| arithmetic | [`carry_forget`](../src/domains/arithmetic/errorHypotheses/additionHypotheses.js) | candidate | Ja | Ja |
| arithmetic | [`carry_double`](../src/domains/arithmetic/errorHypotheses/additionHypotheses.js) | candidate | Ja | Ja |
| arithmetic | [`ones_digit_only`](../src/domains/arithmetic/errorHypotheses/additionHypotheses.js) | candidate | Ja | Ja |
| arithmetic | [`smaller_minus_larger`](../src/domains/arithmetic/errorHypotheses/subtractionHypotheses.js) | candidate | Ja | Nej |
| arithmetic | [`borrow_forget`](../src/domains/arithmetic/errorHypotheses/subtractionHypotheses.js) | candidate | Ja | Nej |
| arithmetic | [`table_off_by_one`](../src/domains/arithmetic/errorHypotheses/multiplicationHypotheses.js) | candidate | Ja | Nej |
| arithmetic | [`ones_digits_only`](../src/domains/arithmetic/errorHypotheses/multiplicationHypotheses.js) | candidate | Ja | Nej |
| arithmetic | [`quotient_off_by_one`](../src/domains/arithmetic/errorHypotheses/divisionHypotheses.js) | candidate | Ja | Ja |
| arithmetic | [`reversed_operands`](../src/domains/arithmetic/errorHypotheses/divisionHypotheses.js) | candidate | Ja | Ja |
| arithmetic | [`divisor_as_answer`](../src/domains/arithmetic/errorHypotheses/divisionHypotheses.js) | candidate | Ja | Ja |
| arithmetic | [`dividend_as_answer`](../src/domains/arithmetic/errorHypotheses/divisionHypotheses.js) | candidate | Ja | Ja |
| fractions | [`not_simplified`](../src/domains/fractions/analyzeError.js) | property | Ja | Ja |
| fractions | [`invalid_input`](../src/domains/fractions/analyzeError.js) | input | Ja | Ja |
| fractions | [`wrong_denominator`](../src/domains/fractions/analyzeError.js) | property | Ja | Ja |
| fractions | [`wrong_answer`](../src/domains/fractions/analyzeError.js) | generic | Ja | Ja |
| percentage | [`wrong_percentage`](../src/domains/percentage/analyzeError.js) | generic | Ja | Ja |
| algebra | [`no_answer`](../src/domains/algebra/analyzeError.js) | input | Ja | Ja |
| algebra | [`forgot_coefficient`](../src/domains/algebra/analyzeError.js) | candidate | Ja | Ja |
| algebra | [`added_instead_of_multiplied`](../src/domains/algebra/analyzeError.js) | candidate | Ja | Ja |
| algebra | [`square_as_double`](../src/domains/algebra/analyzeError.js) | candidate | Ja | Ja |
| algebra | [`calculation_error`](../src/domains/algebra/analyzeError.js) | generic | Ja | Ja |
| algebra | [`did_not_simplify`](../src/domains/algebra/analyzeError.js) | property | Ja | Ja |
| algebra | [`forgot_constant`](../src/domains/algebra/analyzeError.js) | heuristic | Ja | Ja |
| algebra | [`combined_unlike_terms`](../src/domains/algebra/analyzeError.js) | heuristic | Ja | Ja |
| algebra | [`simplify_error`](../src/domains/algebra/analyzeError.js) | generic | Ja | Ja |
| arithmetic_expressions | [`invalid_input`](../src/domains/arithmetic_expressions/analyzeError.js) | input | Ja | Ja |
| arithmetic_expressions | [`wrong_order_of_operations`](../src/domains/arithmetic_expressions/analyzeError.js) | generic | Ja | Ja |
| number_fluency | [`number_bond_not_recalled`](../src/domains/number_fluency/analyzeError.js) | generic | Ja | Nej |
| number_fluency | [`double_not_recalled`](../src/domains/number_fluency/analyzeError.js) | generic | Ja | Nej |

## Kvarstående didaktisk täckning

Bråks storleksjämförelse/likvärdighet, decimalers storlek/täthet, procentenheter och successiva förändringar, bredare ekvationer, språk/texttolkning och flera skriftliga metoder saknar full kandidat- och kontrastkedja. NCM-katalogens 126 innehållskoder är inventerade källområden, inte 126 implementerade felmodeller. [Den fullständiga historiska innehållsinventeringen](NCM_DIDACTIC_COVERAGE.md) bevaras; dess enskilda kodstatusar är inte automatiskt nuläge.

Kända tillämpningsgränser: bråkmodulen tolkar vissa uttryck med addition/subtraktion/multiplikation; procent kräver strukturerad del/helhet/förändring; algebra tolkar vissa linjära uttryck och en kvadratform; uttrycksmodulen räknar vissa alternativa prioriteringar. Talflyt omfattar talpar/dubblor, inte en generell begreppsanalys av talbild.

Varje framtida paket ska granskas för konkurrerande förklaringar, negativa fall, oberoende uppgifter, metodbelägg och tillåten lärarväg. Ingen slutsats om faktisk elevförståelse kan dras ur denna kodinventering.

Fulla konstruerade problem, korrekta svar, modellprediktioner, olösta par och filhashar finns i [evidence.json](evaluations/learning-synthesis-2026-11-04/evidence.json). Körskriptet skriver enbart JSON till stdout; det kan jämföras med detta frysta underlag vid senare ändringar.
