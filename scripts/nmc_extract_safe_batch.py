#!/usr/bin/env python3
"""
Extract a first "safe batch" of NMC diagnostics into structured files.

Current batch target:
- AS1, AS2, AS4, AS7, AS9, AS10 (numeric expression tasks with explicit operators)

Outputs:
- NMC/processed/safe_batch_as_expressions.json
- NMC/processed/safe_batch_as_expressions.csv
- NMC/processed/safe_batch_parse_report.json
- NMC/processed/IMPORT_LOG.md
"""

from __future__ import annotations

import csv
import json
import re
from dataclasses import dataclass, asdict
from decimal import Decimal, InvalidOperation
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
NMC_DIR = ROOT / "NMC"
OUT_DIR = NMC_DIR / "processed"

SAFE_CODES = ["AS1", "AS2", "AS4", "AS7", "AS9", "AS10"]


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


def find_pdf_for_code(code: str, kind: str) -> Path:
    # kind: "diagnos" or "facit"
    pattern = f"{code}*{kind}.pdf"
    matches = sorted(NMC_DIR.glob(pattern))
    if not matches:
        raise FileNotFoundError(f"Missing {kind} PDF for code {code}")
    return matches[0]


def extract_code_and_kind(path: Path) -> Tuple[str | None, str | None]:
    stem = path.stem.replace("%20", " ").strip()
    lower = stem.lower()
    if lower.endswith("diagnos"):
        code = stem[: -len("diagnos")].strip(" -_")
        return code.upper(), "diagnos"
    if lower.endswith("facit"):
        code = stem[: -len("facit")].strip(" -_")
        return code.upper(), "facit"
    return None, None


def discover_all_codes() -> List[str]:
    codes = set()
    pairs: Dict[str, Dict[str, bool]] = {}
    for path in NMC_DIR.glob("*.pdf"):
        code, kind = extract_code_and_kind(path)
        if not code or not kind:
            continue
        bucket = pairs.setdefault(code, {"diagnos": False, "facit": False})
        bucket[kind] = True
    for code, bucket in pairs.items():
        if bucket["diagnos"] and bucket["facit"]:
            codes.add(code)
    return sorted(codes)


def parse_diagnos_items(cleaned_text: str) -> Dict[int, str]:
    """
    Parse expression items from diagnostics.
    Expected shape: "<nr> Beräkna <expression> Svar: ..."
    """
    items: Dict[int, str] = {}
    for match in re.finditer(r"(?<!\S)(\d+)\s+Beräkna\s+(.+?)\s+Svar\s*:", cleaned_text, re.IGNORECASE):
        no = int(match.group(1))
        expr = match.group(2).strip()
        expr = re.sub(r"\s+", " ", expr)
        items[no] = expr
    return items


def evaluate_expression(question_text: str) -> Decimal | None:
    expression = question_text.strip()
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


def format_decimal(value: Decimal) -> str:
    normalized = value.normalize()
    text = format(normalized, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text.replace(".", ",")


def extract_facit_segment(cleaned_text: str) -> str:
    match = re.search(
        r"\bFacit\b(.+?)(\n\s*(Kontrollera|Studera|Observera|Genomförande|Uppföljning)\b|$)",
        cleaned_text,
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
            # Require at least one answer token between two markers.
            if marker > 1 and pos <= previous_marker_idx + 1:
                continue
            if marker == expected_count:
                # Last marker must still have at least one answer token after it.
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


def build_rows_for_code(code: str) -> Dict[str, object]:
    diagnos_pdf = find_pdf_for_code(code, "diagnos")
    facit_pdf = find_pdf_for_code(code, "facit")

    diagnos_text = normalize_text(read_pdf_text(diagnos_pdf))
    facit_text = read_pdf_text(facit_pdf)

    diagnos_items = parse_diagnos_items(diagnos_text)
    facit_answers = parse_facit_answers(facit_text, expected_count=len(diagnos_items))

    rows: List[ItemRow] = []
    item_numbers = sorted(set(diagnos_items.keys()) | set(facit_answers.keys()))
    for no in item_numbers:
        question_text = diagnos_items.get(no, "")
        facit_raw = facit_answers.get(no, "")

        answer_source = "missing"
        expected_answer = ""
        facit_decimal = parse_decimal_text(facit_raw)
        computed_decimal = evaluate_expression(question_text) if question_text else None

        if facit_decimal is not None:
            expected_answer = format_decimal(facit_decimal)
            answer_source = "facit"
        elif computed_decimal is not None:
            expected_answer = format_decimal(computed_decimal)
            answer_source = "computed"
        elif facit_raw:
            expected_answer = facit_raw
            answer_source = "facit_raw"

        if question_text and expected_answer:
            confidence = "high" if answer_source == "facit" else "medium"
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
            )
        )

    report = {
        "code": code,
        "diagnos_pdf": diagnos_pdf.name,
        "facit_pdf": facit_pdf.name,
        "diagnos_item_count": len(diagnos_items),
        "facit_item_count": len(facit_answers),
        "merged_item_count": len(rows),
        "high_confidence_items": sum(1 for row in rows if row.extraction_confidence == "high"),
        "computed_answer_items": sum(1 for row in rows if row.answer_source == "computed"),
    }
    return {"rows": rows, "report": report}


def write_outputs(rows: List[ItemRow], report: Dict[str, object]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    json_path = OUT_DIR / "safe_batch_as_expressions.json"
    csv_path = OUT_DIR / "safe_batch_as_expressions.csv"
    report_path = OUT_DIR / "safe_batch_parse_report.json"

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
            ],
            delimiter=";",
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))

    with report_path.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)


def screen_remaining_codes(codes: List[str]) -> List[Dict[str, object]]:
    results: List[Dict[str, object]] = []
    for code in codes:
        if code in SAFE_CODES:
            continue
        try:
            diagnos_pdf = find_pdf_for_code(code, "diagnos")
            facit_pdf = find_pdf_for_code(code, "facit")
            diagnos_text = normalize_text(read_pdf_text(diagnos_pdf))
            facit_text = read_pdf_text(facit_pdf)
            diagnos_items = parse_diagnos_items(diagnos_text)
            facit_answers = parse_facit_answers(facit_text, expected_count=len(diagnos_items))

            item_count = len(diagnos_items)
            facit_count = len(facit_answers)
            evaluatable = 0
            compared = 0
            mismatches = 0
            for no, question in diagnos_items.items():
                computed = evaluate_expression(question)
                if computed is not None:
                    evaluatable += 1
                facit_raw = facit_answers.get(no, "")
                facit_value = parse_decimal_text(facit_raw)
                if computed is not None and facit_value is not None:
                    compared += 1
                    if computed != facit_value:
                        mismatches += 1

            if item_count == 0:
                status = "review"
                reason = "diagnos_pattern_missing"
            elif facit_count != item_count:
                status = "review"
                reason = "facit_count_mismatch"
            elif evaluatable != item_count:
                status = "review"
                reason = "non_numeric_or_non_binary_expression"
            elif compared != item_count:
                status = "review"
                reason = "facit_non_numeric"
            elif mismatches > 0:
                status = "review"
                reason = "facit_vs_expression_mismatch"
            else:
                status = "candidate_safe"
                reason = "auto_match_all_items"

            results.append(
                {
                    "code": code,
                    "status": status,
                    "reason": reason,
                    "diagnos_pdf": diagnos_pdf.name,
                    "facit_pdf": facit_pdf.name,
                    "item_count": item_count,
                    "facit_count": facit_count,
                    "evaluatable_items": evaluatable,
                    "compared_items": compared,
                    "mismatch_items": mismatches,
                }
            )
        except Exception as error:  # pragma: no cover - defensive for mixed PDF quality
            results.append(
                {
                    "code": code,
                    "status": "review",
                    "reason": "processing_error",
                    "error": str(error),
                    "item_count": 0,
                    "facit_count": 0,
                    "evaluatable_items": 0,
                    "compared_items": 0,
                    "mismatch_items": 0,
                }
            )
    return results


def write_screening_report(screening: List[Dict[str, object]]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = OUT_DIR / "safe_candidate_screening.json"
    with report_path.open("w", encoding="utf-8") as handle:
        json.dump(
            {
                "generated_at_utc": datetime.now(timezone.utc).isoformat(),
                "candidate_safe_count": sum(1 for row in screening if row["status"] == "candidate_safe"),
                "review_count": sum(1 for row in screening if row["status"] != "candidate_safe"),
                "rows": screening,
            },
            handle,
            ensure_ascii=False,
            indent=2,
        )


def append_import_log(summary: Dict[str, object], all_codes: List[str], screening: List[Dict[str, object]]) -> None:
    log_path = OUT_DIR / "IMPORT_LOG.md"
    per_code = summary.get("per_code", [])
    processed_codes = set(summary.get("codes", []))
    pending_codes = [code for code in all_codes if code not in processed_codes]

    status_rows = []
    for entry in per_code:
        merged_item_count = int(entry.get("merged_item_count", 0))
        high_confidence_items = int(entry.get("high_confidence_items", 0))
        computed_answer_items = int(entry.get("computed_answer_items", 0))
        status = "safe"
        if merged_item_count == 0:
            status = "review"
        elif high_confidence_items != merged_item_count or computed_answer_items > 0:
            status = "review"
        status_rows.append(
            f"| {entry.get('code', '')} | {status} | {merged_item_count} | {high_confidence_items} | {computed_answer_items} |"
        )
    candidate_rows = [row for row in screening if row.get("status") == "candidate_safe"]
    candidate_codes = [row.get("code", "") for row in candidate_rows]

    section_lines = [
        f"## {summary.get('generated_at_utc', '')}",
        "",
        f"- Batch: `{summary.get('batch_name', '')}`",
        f"- Processade koder: `{', '.join(summary.get('codes', []))}`",
        f"- Totalt extraherade rader: `{summary.get('total_rows', 0)}`",
        f"- Hög confidence: `{summary.get('high_confidence_rows', 0)}`",
        f"- Kvar i kö: `{len(pending_codes)}`",
        "",
        "| Kod | Status | Items | High | Computed |",
        "|---|---|---:|---:|---:|",
        *status_rows,
        "",
        f"Auto-kandidater för nästa safe-batch: {', '.join(candidate_codes[:30]) if candidate_codes else 'Inga ännu'}"
        + (" ..." if len(candidate_codes) > 30 else ""),
        "",
        f"Kvar i kö: {', '.join(pending_codes[:30])}{' ...' if len(pending_codes) > 30 else ''}",
        "",
    ]

    header = "# NMC Importlogg\n\nLöpande logg för vilka NMC-diagnoser som redan är hanterade i safe-batcher.\n\n"
    if not log_path.exists():
        log_path.write_text(header + "\n".join(section_lines) + "\n", encoding="utf-8")
        return

    with log_path.open("a", encoding="utf-8") as handle:
        handle.write("\n".join(section_lines))
        handle.write("\n")


def main() -> None:
    all_rows: List[ItemRow] = []
    per_code_reports: List[Dict[str, object]] = []

    for code in SAFE_CODES:
        result = build_rows_for_code(code)
        all_rows.extend(result["rows"])
        per_code_reports.append(result["report"])

    summary = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "batch_name": "safe_as_expressions",
        "codes": SAFE_CODES,
        "total_rows": len(all_rows),
        "high_confidence_rows": sum(1 for row in all_rows if row.extraction_confidence == "high"),
        "per_code": per_code_reports,
    }

    write_outputs(all_rows, summary)
    all_codes = discover_all_codes()
    screening = screen_remaining_codes(all_codes)
    write_screening_report(screening)
    append_import_log(summary, all_codes, screening)
    print(f"Wrote {len(all_rows)} rows to {OUT_DIR}")


if __name__ == "__main__":
    main()
