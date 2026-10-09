# Shared drawing tools

`MathScratchpad` provides the same tools in ordinary practice and diagnostic
workspaces: pen, eraser, square-grid toggle and clear. Clicking the active pen
alternates black and magenta; returning from the eraser retains the chosen ink.
The paper stays light so both ink colors remain legible in every app theme.
Grid lines are a background layer: erasing ink does not erase the pattern.

Clear asks for confirmation and affects only the drawing, not the answer or
calculation grid. Diagnostic clearing appends `drawing_clear`; earlier strokes
remain available in event history. `drawing_stroke.color` is optional and accepts
only `black` or `magenta`; old strokes without a color still render as black.
Submitted/read-only drawings cannot be changed. Ordinary practice drawings remain
local to the mounted scratchpad, including hiding/showing and resizing; they are
not saved across a page reload. Grid selection is local to the mounted workspace,
not currently part of diagnostic history. No mastery/progression changes.
