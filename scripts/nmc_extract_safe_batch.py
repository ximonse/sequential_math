#!/usr/bin/env python3
"""
Extract safe NMC batches into structured files and keep a running import log.

Current safe batches:
- safe_as_expressions: AS1, AS2, AS4, AS7, AS9, AS10
- safe_as_word_problems: AS3, AS6

Outputs (per batch):
- NMC/processed/safe_batch_<batch>.json
- NMC/processed/safe_batch_<batch>.csv
- NMC/processed/safe_batch_<batch>_report.json

Additional outputs:
- NMC/processed/safe_candidate_screening.json
- NMC/processed/ncm_code_skill_map.json
- NMC/processed/ncm_code_skill_map.csv
- NMC/processed/IMPORT_LOG.md
"""

from __future__ import annotations

import csv
import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Dict, List, Tuple

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
NMC_DIR = ROOT / "NMC"
OUT_DIR = NMC_DIR / "processed"

SAFE_BATCHES = [
    {
        "name": "safe_as_expressions",
        "codes": ["AS1", "AS2", "AS4", "AS7", "AS9", "AS10"],
        "parser": "expression",
    },
    {
        "name": "safe_as_word_problems",
        "codes": ["AS3", "AS6"],
        "parser": "word",
    },
]

MANUAL_NCM_MAP = {
    "AS1": {
        "domain_tag": "arithmetic",
        "operation_tag": "addition",
        "ability_tags": ["ncm_arithmetic", "ncm_written_method", "op_addition", "multi_digit"],
        "mapping_confidence": "high",
        "mapping_source": "manual",
    },
    "AS2": {
        "domain_tag": "arithmetic",
        "operation_tag": "subtraction",
        "ability_tags": ["ncm_arithmetic", "ncm_written_method", "op_subtraction", "multi_digit"],
        "mapping_confidence": "high",
        "mapping_source": "manual",
    },
    "AS3": {
        "domain_tag": "arithmetic",
        "operation_tag": "mixed",
        "ability_tags": ["ncm_arithmetic", "ncm_word_problem", "op_addition", "op_subtraction"],
        "mapping_confidence": "high",
        "mapping_source": "manual",
    },
    "AS4": {
        "domain_tag": "arithmetic",
        "operation_tag": "multiplication",
        "ability_tags": ["ncm_arithmetic", "ncm_written_method", "op_multiplication"],
        "mapping_confidence": "high",
        "mapping_source": "manual",
    },
    "AS5": {
        "domain_tag": "arithmetic",
        "operation_tag": "division",
        "ability_tags": ["ncm_arithmetic", "ncm_written_method", "op_division"],
        "mapping_confidence": "medium",
        "mapping_source": "manual",
    },
    "AS6": {
        "domain_tag": "arithmetic",
        "operation_tag": "mixed",
        "ability_tags": ["ncm_arithmetic", "ncm_word_problem", "op_multiplication", "op_division"],
        "mapping_confidence": "high",
        "mapping_source": "manual",
    },
    "AS7": {
        "domain_tag": "arithmetic",
        "operation_tag": "multiplication",
        "ability_tags": ["ncm_arithmetic", "ncm_written_method", "op_multiplication", "multi_digit"],
        "mapping_confidence": "high",
        "mapping_source": "manual",
    },
    "AS8": {
        "domain_tag": "arithmetic",
        "operation_tag": "division",
        "ability_tags": ["ncm_arithmetic", "ncm_written_method", "op_division"],
        "mapping_confidence": "medium",
        "mapping_source": "manual",
    },
    "AS9": {
        "domain_tag": "arithmetic",
        "operation_tag": "mixed",
        "ability_tags": ["ncm_arithmetic", "concept_decimal", "op_addition", "op_subtraction"],
        "mapping_confidence": "high",
        "mapping_source": "manual",
    },
    "AS10": {
        "domain_tag": "arithmetic",
        "operation_tag": "multiplication",
        "ability_tags": ["ncm_arithmetic", "concept_decimal", "op_multiplication"],
        "mapping_confidence": "high",
        "mapping_source": "manual",
    },
    "AS11": {
        "domain_tag": "arithmetic",
        "operation_tag": "division",
        "ability_tags": ["ncm_arithmetic", "concept_decimal", "op_division"],
        "mapping_confidence": "medium",
        "mapping_source": "manual",
    },
}

PREFIX_RULES = [
    ("AUP", "arithmetic", "mixed", ["ncm_arithmetic", "ncm_place_value"]),
    ("AUN", "arithmetic", "mixed", ["ncm_arithmetic", "ncm_number_sense"]),
    ("AS", "arithmetic", "mixed", ["ncm_arithmetic", "ncm_written_method"]),
    ("AG", "arithmetic", "mixed", ["ncm_arithmetic", "ncm_basic_number_operations"]),
    ("AF", "arithmetic", "mixed", ["ncm_arithmetic"]),
    ("RB", "rational_numbers", "mixed", ["ncm_rational_numbers", "concept_fraction"]),
    ("RD", "rational_numbers", "mixed", ["ncm_rational_numbers", "concept_decimal"]),
    ("RP", "rational_numbers", "mixed", ["ncm_rational_numbers", "concept_percent"]),
    ("GFO", "geometry", "mixed", ["ncm_geometry"]),
    ("GSK", "geometry", "mixed", ["ncm_geometry"]),
    ("GVI", "geometry", "mixed", ["ncm_geometry"]),
    ("G", "geometry", "mixed", ["ncm_geometry"]),
    ("M", "measurement", "mixed", ["ncm_measurement"]),
    ("ST", "statistics_probability", "mixed", ["ncm_statistics_probability"]),
    ("SA", "statistics_probability", "mixed", ["ncm_statistics_probability"]),
    ("TA", "number_sense", "mixed", ["ncm_number_sense"]),
]


@dataclass
class ItemRow:
    ncm_code: str
    item_no: int
    question_text: str
    expected_answer: str
    source_diagnos_pdf: str
    source_facit_pdf: str
    answer_source: str
    extraction_confidence: str
    ncm_domain_tag: str
    operation_tag: str
    ability_tags: str


@dataclass
class BatchSummary:
    generated_at_utc: str
    batch_name: str
    codes: List[str]
    total_rows: int
    high_confidence_rows: int
    per_code: List[Dict[str, object]]


def read_pdf_text(path: Path) -> str:
    reader = PdfReader(str(path))
    text_parts: List[str] = []
    for page in reader.pages:
        text_parts.append(page.extract_text() or "")
    return "\n".join(text_parts)


def normalize_text(value: str) -> str:
    normalized = value.replace("\u00ad", "")  # soft hyphen
    normalized = normalized.replace("\ufb01", "fi")
    normalized = normalized.replace("\ufb02", "fl")
    normalized = normalized.replace("\n", " ")
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip()


def normalize_ncm_code(code: str) -> str:
    cleaned = str(code or "").upper()
    cleaned = cleaned.replace("%20", "")
    cleaned = re.sub(r"[^A-Z0-9]", "", cleaned)
    return cleaned


def find_pdf_for_code(code: str, kind: str) -> Path:
    pattern = f"{code}*{kind}.pdf"
    matches = sorted(NMC_DIR.glob(pattern))
    if not matches:
        raise FileNotFoundError(f"Missing {kind} PDF for code {code}")
    return matches[0]


def extract_code_and_kind(path: Path) -> Tuple[str | None, str | None]:
    stem = path.stem.replace("%20", " ").strip()
    lower = stem.lower()
    if lower.endswith("diagnos"):
        code = normalize_ncm_code(stem[: -len("diagnos")])
        return code, "diagnos"
    if lower.endswith("facit"):
        code = normalize_ncm_code(stem[: -len("facit")])
        return code, "facit"
    return None, None


def discover_all_codes() -> List[str]:
    pairs: Dict[str, Dict[str, bool]] = {}
    for path in NMC_DIR.glob("*.pdf"):
        code, kind = extract_code_and_kind(path)
        if not code or not kind:
            continue
        bucket = pairs.setdefault(code, {"diagnos": False, "facit": False})
        bucket[kind] = True
    valid = [code for code, kinds in pairs.items() if kinds["diagnos"] and kinds["facit"]]
    return sorted(valid)


def parse_expression_items(cleaned_text: str) -> Dict[int, str]:
    items: Dict[int, str] = {}
    pattern = re.compile(r"(?<!\S)(\d+)\s+Beräkna\s+(.+?)\s+S\s*var\s*:", re.IGNORECASE)
    for match in pattern.finditer(cleaned_text):
        no = int(match.group(1))
        expr = re.sub(r"\s+", " ", match.group(2)).strip()
        items[no] = expr
    return items


def parse_word_items(cleaned_text: str) -> Dict[int, str]:
    items: Dict[int, str] = {}
    pattern = re.compile(r"(?<!\S)(\d+)\s+(.+?)\s+S\s*var\s*:", re.IGNORECASE)
    for match in pattern.finditer(cleaned_text):
        no = int(match.group(1))
        question = re.sub(r"\s+", " ", match.group(2)).strip()
        if not question:
            continue
        items[no] = question
    return items


def parse_diagnos_items(cleaned_text: str, parser_mode: str) -> Dict[int, str]:
    if parser_mode == "expression":
        return parse_expression_items(cleaned_text)
    if parser_mode == "word":
        return parse_word_items(cleaned_text)

    expression = parse_expression_items(cleaned_text)
    if expression:
        return expression
    return parse_word_items(cleaned_text)


def evaluate_expression(question_text: str) -> Decimal | None:
    expression = str(question_text or "").strip()
    expression = expression.replace("–", "-").replace("−", "-").replace("·", "*").replace("×", "*")
    expression = expression.replace("÷", "/").replace(":", "/")
    expression = expression.replace(",", ".")
    expression = expression.replace(" ", "")
    match = re.fullmatch(r"(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)", expression)
    if not match:
        return None

    left_raw, op, right_raw = match.groups()
    try:
        left = Decimal(left_raw)
        right = Decimal(right_raw)
    except InvalidOperation:
        return None

    if op == "+":
        return left + right
    if op == "-":
        return left - right
    if op == "*":
        return left * right
    if op == "/":
        if right == 0:
            return None
        return left / right
    return None


def parse_decimal_text(value: str) -> Decimal | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    raw = raw.replace(" ", "").replace(",", ".")
    if not re.fullmatch(r"-?\d+(?:\.\d+)?", raw):
        return None
    try:
        return Decimal(raw)
    except InvalidOperation:
        return None


def parse_primary_numeric_from_text(value: str) -> Decimal | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    compact = re.sub(r"(?<=\d)\s+(?=\d)", "", raw)
    matches = re.findall(r"-?\d+(?:[\.,]\d+)?", compact)
    if len(matches) != 1:
        return None
    candidate = matches[0].replace(",", ".")
    try:
        return Decimal(candidate)
    except InvalidOperation:
        return None


def format_decimal(value: Decimal) -> str:
    normalized = value.normalize()
    text = format(normalized, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text.replace(".", ",")


def extract_facit_segment(raw_text: str) -> str:
    match = re.search(
        r"\bFacit\b(.+?)(\n\s*(Kontrollera|Studera|Observera|Genomförande|Uppföljning)\b|$)",
        raw_text,
        re.IGNORECASE | re.DOTALL,
    )
    if not match:
        return ""
    return match.group(1).strip()


def _find_marker_positions(tokens: List[str], expected_count: int) -> List[int] | None:
    marker_positions: Dict[int, List[int]] = {
        marker: [idx for idx, token in enumerate(tokens) if token == str(marker)]
        for marker in range(1, expected_count + 1)
    }
    if any(len(marker_positions[marker]) == 0 for marker in range(1, expected_count + 1)):
        return None

    memo: Dict[Tuple[int, int], Tuple[int, ...] | None] = {}

    def solve(marker: int, previous_marker_idx: int) -> Tuple[int, ...] | None:
        key = (marker, previous_marker_idx)
        if key in memo:
            return memo[key]

        for pos in marker_positions[marker]:
            if pos <= previous_marker_idx:
                continue
            if marker > 1 and pos <= previous_marker_idx + 1:
                continue
            if marker == expected_count:
                if pos >= len(tokens) - 1:
                    continue
                memo[key] = (pos,)
                return memo[key]

            tail = solve(marker + 1, pos)
            if tail is not None:
                memo[key] = (pos,) + tail
                return memo[key]

        memo[key] = None
        return None

    solved = solve(1, -1)
    if solved is None:
        return None
    return list(solved)


def parse_facit_answers(raw_text: str, expected_count: int) -> Dict[int, str]:
    if expected_count <= 0:
        return {}
    segment = extract_facit_segment(raw_text)
    if not segment:
        return {}

    tokens = [token for token in re.split(r"\s+", segment) if token]
    positions = _find_marker_positions(tokens, expected_count)
    if positions is None:
        return {}

    answers: Dict[int, str] = {}
    for index, marker_idx in enumerate(positions):
        item_no = index + 1
        next_marker_idx = positions[index + 1] if index + 1 < len(positions) else len(tokens)
        answer_tokens = tokens[marker_idx + 1 : next_marker_idx]
        if not answer_tokens:
            continue
        answer = " ".join(answer_tokens).strip(" ,;.")
        answer = re.sub(r"\s+", " ", answer)
        if answer:
            answers[item_no] = answer
    return answers


def infer_ncm_mapping(code: str) -> Dict[str, object]:
    normalized = normalize_ncm_code(code)
    manual = MANUAL_NCM_MAP.get(normalized)
    if manual:
        return {
            "code": normalized,
            "domain_tag": manual["domain_tag"],
            "operation_tag": manual["operation_tag"],
            "ability_tags": list(manual["ability_tags"]),
            "mapping_confidence": manual["mapping_confidence"],
            "mapping_source": manual["mapping_source"],
        }

    for prefix, domain_tag, operation_tag, ability_tags in PREFIX_RULES:
        if normalized.startswith(prefix):
            return {
                "code": normalized,
                "domain_tag": domain_tag,
                "operation_tag": operation_tag,
                "ability_tags": list(ability_tags),
                "mapping_confidence": "heuristic",
                "mapping_source": f"prefix:{prefix}",
            }

    return {
        "code": normalized,
        "domain_tag": "unknown",
        "operation_tag": "mixed",
        "ability_tags": ["ncm_unknown"],
        "mapping_confidence": "low",
        "mapping_source": "fallback",
    }


def build_rows_for_code(code: str, parser_mode: str) -> Dict[str, object]:
    mapping = infer_ncm_mapping(code)
    diagnos_pdf = find_pdf_for_code(code, "diagnos")
    facit_pdf = find_pdf_for_code(code, "facit")

    diagnos_text = normalize_text(read_pdf_text(diagnos_pdf))
    facit_raw_text = read_pdf_text(facit_pdf)

    diagnos_items = parse_diagnos_items(diagnos_text, parser_mode=parser_mode)
    facit_answers = parse_facit_answers(facit_raw_text, expected_count=len(diagnos_items))

    rows: List[ItemRow] = []
    item_numbers = sorted(set(diagnos_items.keys()) | set(facit_answers.keys()))
    for no in item_numbers:
        question_text = diagnos_items.get(no, "")
        facit_raw = facit_answers.get(no, "")

        answer_source = "missing"
        expected_answer = ""

        facit_decimal = parse_decimal_text(facit_raw)
        facit_primary_numeric = parse_primary_numeric_from_text(facit_raw)
        computed_decimal = evaluate_expression(question_text) if question_text else None

        if facit_decimal is not None:
            expected_answer = format_decimal(facit_decimal)
            answer_source = "facit"
        elif facit_primary_numeric is not None:
            expected_answer = format_decimal(facit_primary_numeric)
            answer_source = "facit_numeric_text"
        elif computed_decimal is not None:
            expected_answer = format_decimal(computed_decimal)
            answer_source = "computed"
        elif facit_raw:
            expected_answer = facit_raw
            answer_source = "facit_raw"

        if question_text and expected_answer and answer_source in {"facit", "facit_numeric_text"}:
            confidence = "high"
        elif question_text and expected_answer:
            confidence = "medium"
        elif question_text or expected_answer:
            confidence = "medium"
        else:
            confidence = "low"

        rows.append(
            ItemRow(
                ncm_code=code,
                item_no=no,
                question_text=question_text,
                expected_answer=expected_answer,
                source_diagnos_pdf=diagnos_pdf.name,
                source_facit_pdf=facit_pdf.name,
                answer_source=answer_source,
                extraction_confidence=confidence,
                ncm_domain_tag=str(mapping["domain_tag"]),
                operation_tag=str(mapping["operation_tag"]),
                ability_tags="|".join(mapping["ability_tags"]),
            )
        )

    report = {
        "code": code,
        "parser_mode": parser_mode,
        "diagnos_pdf": diagnos_pdf.name,
        "facit_pdf": facit_pdf.name,
        "diagnos_item_count": len(diagnos_items),
        "facit_item_count": len(facit_answers),
        "merged_item_count": len(rows),
        "high_confidence_items": sum(1 for row in rows if row.extraction_confidence == "high"),
        "computed_answer_items": sum(1 for row in rows if row.answer_source == "computed"),
        "facit_numeric_text_items": sum(1 for row in rows if row.answer_source == "facit_numeric_text"),
    }
    return {"rows": rows, "report": report}


def get_batch_file_stem(batch_name: str) -> str:
    suffix = batch_name[5:] if batch_name.startswith("safe_") else batch_name
    return f"safe_batch_{suffix}"


def write_batch_outputs(batch_name: str, rows: List[ItemRow], summary: Dict[str, object]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stem = get_batch_file_stem(batch_name)

    json_path = OUT_DIR / f"{stem}.json"
    csv_path = OUT_DIR / f"{stem}.csv"
    report_path = OUT_DIR / f"{stem}_report.json"

    with json_path.open("w", encoding="utf-8") as handle:
        json.dump([asdict(row) for row in rows], handle, ensure_ascii=False, indent=2)

    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "ncm_code",
                "item_no",
                "question_text",
                "expected_answer",
                "source_diagnos_pdf",
                "source_facit_pdf",
                "answer_source",
                "extraction_confidence",
                "ncm_domain_tag",
                "operation_tag",
                "ability_tags",
            ],
            delimiter=";",
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))

    with report_path.open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, ensure_ascii=False, indent=2)

    # Backward compatibility: previous pipeline consumed this legacy report path.
    if batch_name == "safe_as_expressions":
        legacy_report_path = OUT_DIR / "safe_batch_parse_report.json"
        with legacy_report_path.open("w", encoding="utf-8") as handle:
            json.dump(summary, handle, ensure_ascii=False, indent=2)


def process_batch(batch: Dict[str, object]) -> Tuple[List[ItemRow], Dict[str, object]]:
    batch_name = str(batch["name"])
    codes = list(batch["codes"])
    parser_mode = str(batch["parser"])

    all_rows: List[ItemRow] = []
    per_code_reports: List[Dict[str, object]] = []

    for code in codes:
        result = build_rows_for_code(code, parser_mode=parser_mode)
        all_rows.extend(result["rows"])
        per_code_reports.append(result["report"])

    summary = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "batch_name": batch_name,
        "parser_mode": parser_mode,
        "codes": codes,
        "total_rows": len(all_rows),
        "high_confidence_rows": sum(1 for row in all_rows if row.extraction_confidence == "high"),
        "per_code": per_code_reports,
    }

    write_batch_outputs(batch_name, all_rows, summary)
    return all_rows, summary


def screen_remaining_codes(all_codes: List[str], safe_lookup: Dict[str, str]) -> List[Dict[str, object]]:
    rows: List[Dict[str, object]] = []

    for code in all_codes:
        if code in safe_lookup:
            continue

        try:
            diagnos_pdf = find_pdf_for_code(code, "diagnos")
            facit_pdf = find_pdf_for_code(code, "facit")

            diagnos_text = normalize_text(read_pdf_text(diagnos_pdf))
            facit_text = read_pdf_text(facit_pdf)

            expr_items = parse_expression_items(diagnos_text)
            word_items = parse_word_items(diagnos_text)
            if len(expr_items) > 0 and len(expr_items) >= len(word_items):
                parser_mode = "expression"
                chosen_items = expr_items
            elif len(word_items) > 0:
                parser_mode = "word"
                chosen_items = word_items
            else:
                parser_mode = "none"
                chosen_items = {}

            item_count = len(chosen_items)
            facit_answers = parse_facit_answers(facit_text, expected_count=item_count)
            facit_count = len(facit_answers)

            numeric_answer_count = 0
            for answer in facit_answers.values():
                if parse_decimal_text(answer) is not None or parse_primary_numeric_from_text(answer) is not None:
                    numeric_answer_count += 1

            if item_count == 0:
                status = "review"
                reason = "diagnos_pattern_missing"
            elif facit_count != item_count:
                status = "review"
                reason = "facit_count_mismatch"
            elif numeric_answer_count != item_count:
                status = "review"
                reason = "facit_non_numeric_or_ambiguous"
            else:
                status = "candidate_safe"
                reason = f"auto_{parser_mode}_numeric"

            rows.append(
                {
                    "code": code,
                    "status": status,
                    "reason": reason,
                    "recommended_parser": parser_mode,
                    "diagnos_pdf": diagnos_pdf.name,
                    "facit_pdf": facit_pdf.name,
                    "item_count": item_count,
                    "facit_count": facit_count,
                    "numeric_answer_count": numeric_answer_count,
                }
            )
        except Exception as error:  # pragma: no cover
            rows.append(
                {
                    "code": code,
                    "status": "review",
                    "reason": "processing_error",
                    "recommended_parser": "none",
                    "item_count": 0,
                    "facit_count": 0,
                    "numeric_answer_count": 0,
                    "error": str(error),
                }
            )

    return rows


def write_screening_report(screening: List[Dict[str, object]]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = OUT_DIR / "safe_candidate_screening.json"
    payload = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "candidate_safe_count": sum(1 for row in screening if row["status"] == "candidate_safe"),
        "review_count": sum(1 for row in screening if row["status"] != "candidate_safe"),
        "rows": screening,
    }
    with report_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def build_ncm_mapping_rows(all_codes: List[str], safe_lookup: Dict[str, str]) -> List[Dict[str, object]]:
    rows: List[Dict[str, object]] = []
    for code in all_codes:
        mapping = infer_ncm_mapping(code)
        safe_batch_name = safe_lookup.get(code, "")
        rows.append(
            {
                "ncm_code": code,
                "safe_batch": safe_batch_name,
                "in_safe_batch": bool(safe_batch_name),
                "domain_tag": mapping["domain_tag"],
                "operation_tag": mapping["operation_tag"],
                "ability_tags": list(mapping["ability_tags"]),
                "mapping_confidence": mapping["mapping_confidence"],
                "mapping_source": mapping["mapping_source"],
            }
        )
    return rows


def write_ncm_mapping_outputs(rows: List[Dict[str, object]]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    json_path = OUT_DIR / "ncm_code_skill_map.json"
    csv_path = OUT_DIR / "ncm_code_skill_map.csv"

    with json_path.open("w", encoding="utf-8") as handle:
        json.dump(
            {
                "generated_at_utc": datetime.now(timezone.utc).isoformat(),
                "total_codes": len(rows),
                "rows": rows,
            },
            handle,
            ensure_ascii=False,
            indent=2,
        )

    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "ncm_code",
                "safe_batch",
                "in_safe_batch",
                "domain_tag",
                "operation_tag",
                "ability_tags",
                "mapping_confidence",
                "mapping_source",
            ],
            delimiter=";",
        )
        writer.writeheader()
        for row in rows:
            csv_row = dict(row)
            csv_row["ability_tags"] = "|".join(csv_row.get("ability_tags", []))
            writer.writerow(csv_row)


def append_import_log(
    run_timestamp: str,
    batch_summaries: List[Dict[str, object]],
    all_codes: List[str],
    safe_lookup: Dict[str, str],
    screening: List[Dict[str, object]],
    mapping_rows: List[Dict[str, object]],
) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    log_path = OUT_DIR / "IMPORT_LOG.md"

    processed_rows: List[str] = []
    for summary in batch_summaries:
        for entry in summary.get("per_code", []):
            merged_item_count = int(entry.get("merged_item_count", 0))
            high_confidence = int(entry.get("high_confidence_items", 0))
            computed_items = int(entry.get("computed_answer_items", 0))
            facit_numeric_text_items = int(entry.get("facit_numeric_text_items", 0))
            status = "safe"
            if merged_item_count == 0:
                status = "review"
            elif high_confidence != merged_item_count or computed_items > 0:
                status = "review"

            processed_rows.append(
                "| {code} | {batch} | {parser} | {status} | {items} | {high} | {facit_numeric_text} | {computed} |".format(
                    code=entry.get("code", ""),
                    batch=summary.get("batch_name", ""),
                    parser=summary.get("parser_mode", ""),
                    status=status,
                    items=merged_item_count,
                    high=high_confidence,
                    facit_numeric_text=facit_numeric_text_items,
                    computed=computed_items,
                )
            )

    pending_codes = [code for code in all_codes if code not in safe_lookup]
    candidate_rows = [row for row in screening if row.get("status") == "candidate_safe"]
    candidate_codes = [row.get("code", "") for row in candidate_rows]

    manual_mapping_count = sum(1 for row in mapping_rows if row.get("mapping_source") == "manual")
    heuristic_mapping_count = sum(1 for row in mapping_rows if str(row.get("mapping_source", "")).startswith("prefix:"))
    low_mapping_count = len(mapping_rows) - manual_mapping_count - heuristic_mapping_count

    section_lines = [
        f"## {run_timestamp}",
        "",
        "Körda batcher:",
    ]

    for summary in batch_summaries:
        section_lines.append(
            "- `{name}` ({parser}): {codes} | rows={rows} | high={high}".format(
                name=summary.get("batch_name", ""),
                parser=summary.get("parser_mode", ""),
                codes=", ".join(summary.get("codes", [])),
                rows=summary.get("total_rows", 0),
                high=summary.get("high_confidence_rows", 0),
            )
        )

    section_lines.extend(
        [
            "",
            "| Kod | Batch | Parser | Status | Items | High | FacitNumericText | Computed |",
            "|---|---|---|---|---:|---:|---:|---:|",
            *processed_rows,
            "",
            f"Safe totalt: {len(safe_lookup)} av {len(all_codes)} koder.",
            f"Kvar i kö: {len(pending_codes)}.",
            "",
            "NCM-mappning:",
            f"- Manuellt mappade: {manual_mapping_count}",
            f"- Prefix-heuristik: {heuristic_mapping_count}",
            f"- Låg/fallback: {low_mapping_count}",
            "",
            "Auto-kandidater för nästa safe-batch: "
            + (", ".join(candidate_codes[:30]) if candidate_codes else "Inga ännu")
            + (" ..." if len(candidate_codes) > 30 else ""),
            "",
            "Kvar i kö: "
            + ", ".join(pending_codes[:30])
            + (" ..." if len(pending_codes) > 30 else ""),
            "",
        ]
    )

    header = "# NMC Importlogg\n\nLöpande logg för vilka NMC-diagnoser som redan är hanterade i safe-batcher.\n\n"
    if not log_path.exists():
        log_path.write_text(header + "\n".join(section_lines) + "\n", encoding="utf-8")
        return

    with log_path.open("a", encoding="utf-8") as handle:
        handle.write("\n".join(section_lines))
        handle.write("\n")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    all_codes = discover_all_codes()
    safe_lookup: Dict[str, str] = {}
    batch_summaries: List[Dict[str, object]] = []

    for batch in SAFE_BATCHES:
        _, summary = process_batch(batch)
        batch_summaries.append(summary)
        for code in batch["codes"]:
            safe_lookup[normalize_ncm_code(code)] = str(batch["name"])

    screening = screen_remaining_codes(all_codes, safe_lookup)
    write_screening_report(screening)

    mapping_rows = build_ncm_mapping_rows(all_codes, safe_lookup)
    write_ncm_mapping_outputs(mapping_rows)

    run_timestamp = datetime.now(timezone.utc).isoformat()
    append_import_log(
        run_timestamp=run_timestamp,
        batch_summaries=batch_summaries,
        all_codes=all_codes,
        safe_lookup=safe_lookup,
        screening=screening,
        mapping_rows=mapping_rows,
    )

    total_rows = sum(int(summary.get("total_rows", 0)) for summary in batch_summaries)
    print(f"Wrote {total_rows} rows across {len(batch_summaries)} safe batches to {OUT_DIR}")


if __name__ == "__main__":
    main()
