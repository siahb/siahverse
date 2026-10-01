# NurseDoku

A colorful, mobile-first nursing logic game for [Siahverse Nursing](https://siahverse.cc/nursing/). [Play NurseDoku](https://siahverse.cc/nursedoku/).

Place one RN in every row, column, and colored care zone. RNs cannot touch, even diagonally.

## Controls

- Tap a cell to toggle an X.
- Swipe from an empty cell to add multiple Xs, or from an X to erase multiple Xs. RNs are protected. Undo reverses the whole stroke.
- Double-tap to place or remove an RN.
- Keyboard: Enter/Space toggles X; R toggles RN; arrow keys move focus.
- Hints highlight a suggested placement or a mistaken RN.

Start from the main menu; loading the app leaves the timer paused. The changelog appears once per update. A solved board celebrates briefly (650 ms) before opening the required nursing question. You can change your answer before confirming it, then share the result or continue.

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

Progress and statistics are saved on this browser/device. Difficulty uses an automated deduction heuristic; human calibration remains future work. The NCLEX question bank currently contains 54 original questions. Generation uses bounded attempts and a verified starter fallback if a unique board cannot be produced.

## Run locally

No build step or framework. Open index.html or run `python3 -m http.server 8000` and visit http://localhost:8000.

## Validation

Verified the original eight learning boards, all 72 rated practice boards, and 30 generated boards for exactly one legal solution, connected zones, requested dimensions, and deterministic seeding. Gesture/state checks cover single tap, double tap, drag interpolation, RN protection, undo, completion, and saved progress. Physical iPhone gesture testing remains useful.

## Content source

[CDC: Clinical Safety — Hand Hygiene for Healthcare Workers](https://www.cdc.gov/clean-hands/hcp/clinical-safety/index.html). Bonus questions are original educational practice items.

## Current roadmap

See [ROADMAP.md](ROADMAP.md) for delivered Phase 1 features and the next phase. General/Pediatrics/Emergency are color palettes, not specialty gameplay modes. Offline caching is scoped to NurseDoku.

Current rules: three incorrect RN placements end a shift. Invalid placements are rejected; Undo does not restore strikes. Training advances from Easy through Medium to Hard. The palette selector only changes colors. Supabase private cloud saves and account UI are implemented. Custom SMTP is configured, but public registration remains disabled while Resend DKIM verification is pending. The September 30 signup test reached Resend and was rejected for an unverified domain; see accounts/README.md for checked activation status.

Hints now explain direct deductions or confined-zone elimination from placed RNs, independently of player X marks. If those techniques cannot explain a move, the hint explicitly says it is a solution reveal. The daily archive includes a month calendar with completed-day markers and blocks future dates and dates before launch.

The required post-shift question bank contains 54 original NCLEX single-answer items covering prioritization, adult health, pediatrics, medication safety, mental health, oncology, infection prevention, and dosage calculations. Clinical items link to authoritative government health sources; calculations explain the order supplied in the question. They are independently authored practice items. Append-only NCLEX bank expansions preserve saved answers and history.

### Question expansion — October 1, 2026

Added 20 original questions (15 clinical and five calculation), bringing the bank to 54. Existing questions, IDs, answer order, correct indices, and `QUIZ_VERSION` remain unchanged. The current review records are in `content/question-reviews/`.

### Question history

Questions have permanent IDs. Each progress owner stores `stats.questionHistory` (`seen`, `missed`, or `correct`), included in the cloud progress snapshot. Unseen items are offered first, then previously missed items. Correct items are retired. An exhausted bank allows continued play with a caught-up message. Reloading the same shift preserves its selected question and answer. Current submitted answers migrate into history; older answers without recorded correctness cannot be reconstructed. Guest history is device-local and resets when site storage is cleared.

The scheduled bank expansion targets up to 100 original source-checked questions per day, stopping at 5,000. Preserve existing IDs and append questions; do not reorder old answer choices or change their correct indices.

## Daily nursing tips

Main-menu daily nursing tip: seven concise tips with NIH source links, deterministic local-date rotation, dismissal for the current day, and no artificial loading delay. Dismissal is a device preference and persists across reloads.

### Version 1.1.0 — September 29, 2026

All 72 new 10×10 practice boards have exactly one single-cell zone, ten distinct colors in every palette, connected regions, and exactly one solution. No region exceeds 40 cells. Logical difficulty is rechecked independently. Existing saved custom boards remain resumable; choose a new practice shift to use the revised bank.

Single taps place/erase X immediately; a second tap on the same square within 360 ms replaces that first tap with an RN action, with one undo entry. Zone-clear feedback requires a correct RN plus Xs in every other zone square, honors mute/reduced motion, and is suppressed on saved-board restoration.

The menu separates Learn/Daily from custom practice controls. One nursing hub link and one What's new control remain. The bottom footer shows the release date and version. Results sharing includes Facebook and an Instagram image option; file sharing uses the native share sheet when supported, otherwise downloads an image to upload manually. It never posts automatically.

After changing any source file or question/board bank, run `node scripts/build-assets.cjs` from this repository and publish index.html, sw.js, and the generated assets/ files together with the source. Keep old content-hashed assets for existing offline clients. Never overwrite the bytes at an existing hashed asset path.

## Dark mode

Use the moon/sun icon in the header to switch appearance. NurseDoku follows the device setting until you choose a mode, then remembers your preference on this browser. Care-zone colors and progress stay unchanged.

The How to play tutorial has five numbered steps, a solved 4×4 example, and separate RN/X practice squares. It explains rows, columns, care zones, diagonal spacing, and the required NCLEX question without assuming prior puzzle experience. Tutorial practice does not change saved progress or strikes.

Select Next tip on the nursing tip card to browse the existing sourced tips. Browsing wraps at the end and resets to the daily tip on a new day or page reload.

Shift 000 is a guided 4×4 tutorial before the first unsolved training shift for new players. Sixteen coached moves explain RN placement and Xs for rows, columns, and touching corners. It has no timer, strikes, quiz, or counted win. Completion is stored per progress owner in stats and included in cloud snapshots. Existing shift numbers and completion IDs stay unchanged. Replay it from the menu. Closing midway leaves the current shift intact and restarts the lesson next time.

Post-shift flow: choose 1–10 NCLEX questions in the menu (default 1). The selected set is saved with the solved shift and must be confirmed before another puzzle; closing the results returns to the menu without skipping questions. Read each rationale, then select Next question. If fewer eligible unseen/missed questions remain, only those are offered. Native radio choices remain editable until confirmation. Three EKG hearts show remaining strikes. The completed-board pause is 650 ms.

Sync now reports its result inside Account. It uploads pending device changes, checks and restores newer cloud progress when the device is clean, and confirms when saves already match. Offline and conflicting saves explain the next action; conflicting active puzzles require a choice. The button shows Syncing while a request is running.
