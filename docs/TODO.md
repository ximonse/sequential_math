## TODO

### Completed (2026-02-11)
- [x] `Behöver stöd nu` panel with ranked students + reason codes.
- [x] Risk flags per student (activity, success, reasonability, pace, adherence).
- [x] Assignment adherence metrics (today/week/total) + sorting.
- [x] Bottleneck view by operation/`skillTag`/level.
- [x] Quick actions per elevrad: focus, warmup, mix.
- [x] Simplified table percentages while keeping drilldown details.
- [x] Inactivity buckets (today, 2+ days, 7+ days, never started).
- [x] Class-level summaries (started/not started, weekly activity, weekly goal).
- [x] CSV export of current teacher snapshot.

### Next
- [ ] Break out `docs/DIDAKTISK_BLUEPRINT_V2.md` into phase-by-phase technical tickets (Fas 1 -> Fas 3).
- [ ] Add automated tests for teacher dashboard helper logic (risk/adherence/bottlenecks/csv).
- [ ] Add optional pagination/virtualization in student table for larger classes.
- [ ] Add a compact trend sparkline per student (weekly attempts + success).

### Future Ideas
- [ ] Add a small `?` help trigger in student practice view with skill-specific tooltip for current problem type (e.g. step hints for carry/borrow/table/division setup).
- [ ] Add a very token-lean focused AI feedback mode that suggests likely error pattern after wrong answer (heuristics first, AI fallback).
- [ ] Add contextual YouTube help links mapped by `skillTag`/error pattern so students get exact explanation topics (e.g. two-digit addition with carry).
