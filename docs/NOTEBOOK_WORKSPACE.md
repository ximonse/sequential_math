# Diagnostic notebook workspace

## Optional workspaces in ordinary assignments

Teachers choose Notebook and Drawing when creating an ordinary arithmetic/domain
assignment by preset or a custom math-practice assignment. The explicit choices
travel in `workspaces: { notebook, drawing }` through shared normalization,
class activation and assignment links. Legacy assignments without that field
retain drawing and do not silently gain a notebook. Talbild uses its separate
quick-recognition view and is not part of these arithmetic workspaces.

The pupil opens the ordinary notebook on demand. Folding leaves the editor mounted
and preserves its cells, marks, pen preferences and strokes for the active page/
training session, just like ordinary drawing. This scratch work is not uploaded,
recovered after a reload or submitted to the teacher. It does not create a
diagnostic attempt or change the answer/mastery pipeline. Normal answers still
use the existing task's answer input and submission button.

Screening keeps its existing per-question workspace flags and encrypted/server
save contract. Its notebook starts open for compatibility but can now be folded
without clearing the observation; the answer remains available while folded.
Its drawing remains foldable independently. Submitted observations stay read-only.

The approved compact workspace uses shared `NumberKeys` with ordinary practice.
The paper remains 12 by 8 cells with the existing rectangular proportions: saved
attempts are never cropped or reconstructed. Main digits use regular 38px type;
carry notes use regular 20px type lower in the cell. Cross-outs follow the glyph,
including the lowered note, rather than a fixed position in the cell.

## Touch shortcuts

Hold for 500ms, then drag. A horizontal drag on a numeric main/carry cell toggles
its cross-out. Down converts to a carry note; up converts to a main digit. Both
one- and two-digit values retain their value and historical events. Holding
without dragging does nothing. A held empty cell starts a line on grid borders;
operation signs also permit the existing horizontal-line shortcut. Explicit line
mode supports immediate horizontal/vertical drawing. Eraser mode supports taps
and dragging. Movement before the hold threshold scrolls instead of editing.

The five tools occupy one row. Loan acts once on the selected number, without
leaving a persistent loan mode. Touch help and percent/algebra symbols open as
overlays, preserving keypad and paper geometry. The information icon supports
hover with a mouse and explicit taps/clicks; Escape/outside taps dismiss help.

## Saving and navigation

Numeric input uses the fixed keypad, without a soft keyboard. Written answers
still use the device keyboard. Decimal numeric answers and the offered algebra
symbols are validated by the shared event/replay model, not UI-only rules.
Autosave retains encrypted local drafts until server acknowledgement. Errors
remain visible and offer explicit retry; there is no redundant Svara/save button.
Next, previous and Startsida await saving before navigating. Submitting retains
the existing atomic whole-collection flow and missing-answer confirmation.
Submitted work remains read-only and separate from mastery/progression.

The folded drawing component stays mounted to preserve pen/grid preferences.
Expanded paper spans the workspace with a 320px scrolling viewport. The original
portrait coordinate system is retained so existing drawings and the teacher's
replay do not stretch. Shared black/magenta pen, eraser, square grid and confirmed
clear remain as described in DRAWING_TOOLS.md.

Local Chromium touch robots and rendered theme screenshots are not a physical
iPad check or production verification. Publishing requires a separate decision.
