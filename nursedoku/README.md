# NurseDoku

A colorful, mobile-first nursing logic game for [Siahverse Nursing](https://siahverse.cc/nursing/). [Play NurseDoku](https://siahverse.cc/nursedoku/).

Place one RN in every row, column, and colored care zone. RNs cannot touch, even diagonally.

## Controls

- Tap a cell to toggle an X.
- Swipe from an empty cell to add multiple Xs, or from an X to erase multiple Xs. RNs are protected. Undo reverses the whole stroke.
- Double-tap to place or remove an RN.
- Keyboard: Enter/Space toggles X; R toggles RN; arrow keys move focus.
- Hints highlight a suggested placement or a mistaken RN.

Start from the main menu; loading the app leaves the timer paused. The changelog appears once per update. A solved board celebrates for two seconds before opening the required nursing question. You can change your answer before confirming it, then share the result or continue.

## Completed roadmap

- [x] Guided 56-shift learning journey; first 4×4 board has a single-cell care zone
- [x] Daily puzzle, seeded by the device’s local calendar date
- [x] 144 unique 6×6 and 10×10 practice puzzles with Easy/Medium/Hard ratings based on logical deductions
- [x] Connected-region generator with exhaustive uniqueness checks
- [x] Daily streak, total wins, and best completion time
- [x] Hints, undo, reset, automatic completion, next shift
- [x] General, Pediatrics, and Emergency color themes
- [x] Required original infection-prevention nursing question with answer selection, confirmation, and CDC rationale
- [x] Siahverse nursing hub integration
- [x] Synthesized tap, RN, hint, undo, and win sounds with a saved mute setting
- [x] X pop, RN bounce and sparkle, care-zone feedback, win confetti; reduced-motion support
- [x] Saved progress and themes; timer pauses when the page is hidden

Progress and statistics are saved on this browser/device. Difficulty uses an automated deduction heuristic; human calibration remains future work. The bonus bank currently contains seven original infection-prevention questions. Generation uses bounded attempts and a verified starter fallback if a unique board cannot be produced.

## Run locally

No build step or framework. Open index.html or run `python3 -m http.server 8000` and visit http://localhost:8000.

## Validation

Verified the original eight learning boards, all 72 rated practice boards, and 30 generated boards for exactly one legal solution, connected zones, requested dimensions, and deterministic seeding. Gesture/state checks cover single tap, double tap, drag interpolation, RN protection, undo, completion, and saved progress. Physical iPhone gesture testing remains useful.

## Content source

[CDC: Clinical Safety — Hand Hygiene for Healthcare Workers](https://www.cdc.gov/clean-hands/hcp/clinical-safety/index.html). Bonus questions are original educational practice items.

## Current roadmap

See [ROADMAP.md](ROADMAP.md) for delivered Phase 1 features and the next phase. General/Pediatrics/Emergency are color palettes, not specialty gameplay modes. Offline caching is scoped to NurseDoku.

Current rules: three incorrect RN placements end a shift. Invalid placements are rejected; Undo does not restore strikes. Training advances from Easy through Medium to Hard. The palette selector only changes colors. Supabase private cloud saves and account UI are implemented. Public registration remains disabled until nursing@siahverse.cc is verified with an email provider and SMTP is configured; see accounts/README.md.

Hints now explain direct deductions or confined-zone elimination from placed RNs, independently of player X marks. If those techniques cannot explain a move, the hint explicitly says it is a solution reveal. The daily archive includes a month calendar with completed-day markers and blocks future dates and dates before launch.
