# NurseDoku roadmap

## Phase 1 — delivered

- [x] More compact mobile shift-station layout and an original teal visual identity
- [x] Drag interpolation, RN protection, whole-stroke undo, canceled-touch handling
- [x] Double-tap tolerance and timer resume fix
- [x] 144 unique practice boards rated by deductions, independently of board size
- [x] 56 training shifts, saved completion, resume first unfinished shift
- [x] 10×10 board selection and difficulty-ordered training
- [x] Three strikes per shift for any incorrect RN square, with retry and saved strike count
- [x] Seven source-reviewed nursing questions with answer locking and rationales
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
- [ ] Expand original, source-reviewed nursing questions by specialty
- [ ] Specialty modes with actual question/content differences
- [ ] Progression map and unlockable palettes
- [x] Daily calendar with completed-day markers, date selection, and month navigation
- [ ] Improved statistics by difficulty, hints used, and puzzle identity

## Optional future work

- [x] Private cloud-save database, account UI, offline saves, guest import, device-conflict handling
- [ ] Activate public registration: configure email delivery from nursing@siahverse.cc (redirects done), then verify signup and recovery end to end
- [ ] Account deletion/export and dedicated privacy page
- [ ] Public mobile-store release only if requested

Guest progress stays on the browser/device. The private cloud-save backend is implemented; public signup is waiting for Resend domain verification and SMTP delivery tests. No account is required for guest play.

## September 29 guidance update — delivered

- [x] Copy and social sharing icons with accessible labels
- [x] Hints explain row/column/zone singles and confined-zone elimination
- [x] Incorrect Xs never become false evidence in a hint
- [x] Daily calendar accessible from the main menu and the game
- [x] First-open changelog includes the new guidance and calendar
