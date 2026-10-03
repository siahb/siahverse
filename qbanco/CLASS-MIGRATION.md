# Class Exams migration — first stage

QBanco defaults to Class Exams and includes separate HESI and NCLEX sections.

Pharmacology Exam 1 now has its own page under `class-exams/pharmacology-exam-1/`. The existing engine was moved without bundling its question-bank declaration. It loads the existing protected `/pharm1/` page with credentials, reads only the known BANK JSON declaration, and never executes remote HTML/scripts. Nursing access remains enforced at that source route. Source-format changes fail closed with an access/loading message.

This is a compatibility bridge, not a completed private-bank backend migration. `/pharm1/` must remain available as its gated question source. Do not redirect or delete the old route yet. The CSV import/private-storage backend still requires YourBestWorld headers and a future migration. General Siahverse sign-in does not substitute for nursing access. The new public engine contains no clinical question-bank payload.

The legacy `siahverse_pharm1_sessions_v4` key is unchanged so sessions, selections, grades, marks, hints, confidence, question order and exam timing remain compatible on the same Siahverse origin. The older v3 save is retained when converted rather than deleted. Localhost is a different origin and cannot show students' Siahverse saves or use nursing cookies. No production saves are bulk rewritten.

Preserved engine features include single-answer, SATA, dosage/fill-in grading, calculator/conversion tools, practice and exam modes, timer/stopwatch settings, source/chapter/type filters, saved/resumable sessions, review filters, retakes, hints, confidence ratings and question navigation. Its existing dosage parsing behavior is preserved; this is not a grading-policy redesign. Class question authorship is not inferred from the old "Original 81" UI label, which is now "Existing 81".

Med-Surg Exam 1 is an empty course card. Its original page stays available. No synthetic clinical questions were inserted. Class-session review/reset remains in the course engine rather than being mixed with HESI/NCLEX dashboard data.

Validation: core tests, plus the class-engine test, check MC/SATA/fill-in grading, exact preservation of a synthetic saved session, hints/marks/confidence, loader denial on a nursing-login response, and omission of the bank from the new engine source. The original protected bank was inspected locally: 100 total, 86 single-answer, 7 SATA, 7 fill-in. Production authenticated bank loading must be checked with an approved nursing account before retiring the original app. No new account access is granted by this migration.
