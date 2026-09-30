# NurseDoku roadmap

## Phase 1 — delivered

- [x] More compact mobile shift-station layout and an original teal visual identity
- [x] Drag interpolation, RN protection, whole-stroke undo, canceled-touch handling
- [x] Double-tap tolerance and timer resume fix
- [x] 144 unique practice boards rated by deductions, independently of board size
- [x] 56 training shifts, saved completion, resume first unfinished shift
- [x] 10×10 board selection and difficulty-ordered training
- [x] Three strikes per shift with retry and saved strike count
- [x] Seven source-reviewed optional bonus questions with answer locking and rationales
- [x] Win milestones
- [x] Daily archive from September 29, 2026, completed-date records, copyable results
- [x] Home-screen manifest, local icon, scoped offline cache
- [x] Palette label accurately describes General/Pediatrics/Emergency

Difficulty is an automated heuristic: Easy resolves with row/column/zone singles, Medium also needs confined-zone elimination, and Hard is unresolved by those two techniques. Human playtesting is still needed to calibrate perceived difficulty.

## Phase 2 — next

- [ ] Test gestures and sound on physical iPhones, including VoiceOver
- [ ] Explain each hint with the deduction that supports it
- [ ] Expand original, source-reviewed nursing questions by specialty
- [ ] Specialty modes with actual question/content differences
- [ ] Progression map and unlockable palettes
- [ ] Daily calendar with visual completed-day markers
- [ ] Improved statistics by difficulty, hints used, and puzzle identity

## Optional future work

- [x] Private cloud-save database, account UI, offline saves, guest import, device-conflict handling
- [ ] Activate public registration: configure email delivery/redirects, then verify signup and recovery end to end
- [ ] Account deletion/export and dedicated privacy page
- [ ] Public mobile-store release only if requested

Cloud saves need a backend and an account/privacy design. Current progress remains on the browser/device. No account is required.
