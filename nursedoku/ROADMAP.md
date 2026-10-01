# NurseDoku roadmap

## Phase 1 — delivered

- [x] More compact mobile shift-station layout and an original teal visual identity
- [x] Drag interpolation, RN protection, whole-stroke undo, canceled-touch handling
- [x] Double-tap tolerance and timer resume fix
- [x] 144 unique practice boards rated by deductions, independently of board size
- [x] 56 training shifts, saved completion, resume first unfinished shift
- [x] 10×10 board selection and difficulty-ordered training
- [x] Three strikes per shift for any incorrect RN square, with retry and saved strike count
- [x] Original NCLEX-style nursing questions with answer locking and rationales
- [x] Win milestones
- [x] Daily archive from September 29, 2026, completed-date records, copyable results
- [x] Home-screen manifest, local icon, scoped offline cache
- [x] Palette label accurately describes General/Pediatrics/Emergency

Difficulty is an automated heuristic: Easy resolves with row/column/zone singles, Medium also needs confined-zone elimination, and Hard is unresolved by those two techniques. Human playtesting is still needed to calibrate perceived difficulty.

## September 29 flow update — delivered

- [x] Main menu; loading the app does not start the game timer
- [x] Main-menu sharing: device share sheet, X, WhatsApp, Facebook, copy link
- [x] Swipe from an X to erase multiple Xs; protect RNs; undo the whole stroke
- [x] Two-second completed-board celebration before results, with reduced-motion support
- [x] First-open changelog shown once per update, accessible again from the menu
- [x] Required nursing question; select/change the answer, then confirm before submission
- [x] Next shift unlocks after submitting the answer; feedback and submitted state persist
- [x] Results sharing with score/time/board/strikes via device share sheet, X, WhatsApp, copy
- [x] Removed the patient-information notice from the account screen

## Phase 2 — next

- [ ] Test gestures and sound on physical iPhones, including VoiceOver
- [x] Explain direct deductions and care-zone elimination hints; label deeper solution reveals honestly
- [x] Replace the initial hand-hygiene set with 12 original NCLEX-style questions, clinical source links, and calculation rationales
- [ ] Specialty modes with actual question/content differences
- [ ] Progression map and unlockable palettes
- [x] Daily calendar with completed-day markers, date selection, and month navigation
- [ ] Improved statistics by difficulty, hints used, and puzzle identity

## Optional future work

- [x] Private cloud-save database, account UI, offline saves, guest import, device-conflict handling
- [ ] Activate public registration: configure email delivery from nursing@siahverse.cc (redirects done), then verify signup and recovery end to end
- [ ] Account deletion/export and dedicated privacy page
- [ ] Public mobile-store release only if requested

Guest progress stays on the browser/device. The private cloud-save backend is implemented. As checked September 30, custom SMTP is saved and reaches Resend, but signup email is rejected because domain verification is pending. Live database isolation and stale-write checks pass; signup confirmation, recovery, and cross-device restore still require successful email delivery. No account is required for guest play.

## September 29 guidance update — delivered

- [x] Copy and social sharing icons with accessible labels
- [x] Hints explain row/column/zone singles and confined-zone elimination
- [x] Incorrect Xs never become false evidence in a hint
- [x] Daily calendar accessible from the main menu and the game
- [x] First-open changelog includes the new guidance and calendar

## Question bank growth — scheduled

- [x] Stable question IDs; per-user history included in local and cloud progress
- [x] Unseen questions first; correctly answered questions never repeat; missed questions may return until answered correctly
- [x] Show a caught-up state instead of recycling correct answers when the bank is exhausted
- [x] Daily task scheduled for 50 runs starting September 30, 2026, to add up to 100 source-checked original questions per run, capped at 5,000
- [ ] Reach 5,000 original reviewed questions (currently 12; daily publishing is subject to successful verification and task execution)

Guest question history belongs to the browser/device. Account history travels with cloud progress. Clearing guest storage resets its history. Saved questions can be reopened to review the same completed shift. No historical correctness is inferred for questions answered before tracking existed.

- [x] Main-menu daily nursing tip: seven concise tips with NIH source links, deterministic local-date rotation, dismissal for the current day, and no artificial loading delay. Dismissal is a device preference and persists across reloads.

## Version 1.1.0 — delivered

- [x] 72 rebuilt 10×10 boards, exactly one starter, distinct colors, connected care zones, verified unique solutions and difficulty
- [x] Immediate single-tap X feedback; double-tap RN preserves a single undo action
- [x] Care-zone-clear animation, brief message, and synthesized sound; mute/reduced-motion support
- [x] Practice controls above the separate Practice your way button
- [x] NCLEX question heading and concise introduction
- [x] Share/copy/Facebook/Instagram/X/WhatsApp on both menu and results
- [x] Remove redundant navigation and changelog wording; date/year and version footer

## Beginner tutorial — delivered

- [x] Five numbered steps with a solved example, RN and X practice, and plain explanations of every placement rule
- [x] Independent practice board, keyboard controls, light/dark support, and replay from How to play

- [x] Next tip control cycles the sourced nursing tip bank and keeps the source link matched to the displayed tip

## Shift 000 — delivered

- [x] Guided RN/X board before Shift 001 for new players; replay from menu
- [x] Explain every placement and exclusion; preserve existing progress, wins, and numbering

## Post-shift improvements — delivered

- [x] Return to menu from questions without bypassing required answers
- [x] Choose 1–10 saved NCLEX questions per shift; rationale before advancing
- [x] Native radio answer selection, three EKG hearts, and 650 ms win pause

- [x] Manual cloud sync checks newer saves and gives visible saving, up-to-date, offline, and conflict feedback

- [x] Confirm account puzzle replacement, guest import and shared sign-out; disable unavailable import and serialize conflict resolution
