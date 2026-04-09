Accepted Codex review feedback is now a single documentation contradiction inside `src/games/number-balloon/DESIGN.md`: the prose line says rounds 37+ use 7 balloons, but `BALLOON_LOAD_LEVELS[2]` clearly produces 8~9 balloons. This is a one-line direct correction with no design rework.

```json
{
  "kind": "review_repair_route",
  "route": "direct-fix",
  "summary": "single-line correction for late-round number-balloon load cadence",
  "confidence": "high",
  "reasons": [
    "accepted comment targets one incorrect value in one sentence",
    "DifficultyDirector table directly proves the correct value",
    "no broader wording or architecture change is needed"
  ],
  "accepted_items": [
    "discussion_r3055923674"
  ],
  "blocking_unknowns": [],
  "handoff_notes": [
    "change 37+ balloon count from 7개 to 8~9개 to match load level 2"
  ]
}
```
