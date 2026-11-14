// Error models that do not point to a misconception, and why
// (docs/STYRNING_FELFORSTAELSER.md, step 1b). Kept apart from the catalogue of
// misconceptions so that each file stays readable.
// Why an error model is not linked to a misconception, from a fixed set.
export const NOT_A_MISCONCEPTION_REASONS = ['fact_retrieval', 'cognitive', 'input', 'needs_review']
export const MODELS_WITHOUT_MISCONCEPTION = {
  table_off_by_one: { reason: 'fact_retrieval', noteSv: 'Angränsande produkt: tabellfaktumet plockas fram fel. Kan också vara arbetsminne eller hastighet.' },
  quotient_off_by_one: { reason: 'fact_retrieval', noteSv: 'Kvoten ett fel: tabellen plockas fram fel.' },
  quotient_stops_at_twelve: { reason: 'needs_review', noteSv: 'Simon 2026-11-14, "kanske": tabellen slutar vid 12, eller 6 · 10 + 6 · 2 utan kontroll.' },
  answer_off_by_one: { reason: 'fact_retrieval', noteSv: 'Utanför udda gånger udda: oftast framplockning eller fokus.' },
  partial_answer_entry: { reason: 'input', noteSv: 'Bara första siffran inskriven.' },
  last_two_digits_swapped: { reason: 'input', noteSv: 'Siffror omkastade vid inmatning. Tabellen (10 + 9 = 91) räknar detta som positionsfel; Simon avgör.' },
  notebook_answer_mismatch: { reason: 'input', noteSv: 'Rätt i räknehäftet, annat svar inskrivet.' },
  answer_zero: { reason: 'cognitive', noteSv: 'Ger upp eller klickar förbi: fokus eller motivation.' },
  answer_55: { reason: 'cognitive', noteSv: 'Ger upp eller klickar förbi: fokus eller motivation.' },
  place_value_scaling: { reason: 'needs_review', noteSv: 'Utanför decimalmultiplikation kan skalningen vara inmatning eller positionsfel.' },
  bond_ten_friend: { reason: 'cognitive', noteSv: '10-kompisen används av vana fast måltalet är ett annat (Simon).' },
  double_original_returned: { reason: 'cognitive', noteSv: 'Talet lämnas utan att dubblas: fokus.' },
  bond_known_term_returned: { reason: 'needs_review', noteSv: 'Den kända termen skrivs i svaret: likhetstecknet eller fokus.' },
  dividend_as_answer: { reason: 'needs_review', noteSv: 'Täljaren som svar: divisionens innebörd eller fokus.' },
  divisor_as_answer: { reason: 'needs_review', noteSv: 'Nämnaren som svar (8 : 4 = 4): divisionens innebörd eller fokus; vanligt i åk 5.' },
  algebra_constant_dropped: { reason: 'needs_review', noteSv: 'Konstanten tappas vid förenkling.' },
  decimal_only_fraction_added: { reason: 'cognitive', noteSv: 'Kan också vara fokus: "fokuserade på halva additionen" (Simon).' },
}
