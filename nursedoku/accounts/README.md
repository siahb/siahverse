# Accounts and cloud saves

Supabase project: duimxtfcnbfgpeawzszl (Siahverse, us-west-1). Project creation quote: $0/month.

Implemented:
- Official Supabase JS 2.117.2, pinned CDN URL, lazy loading; guest play has no SDK dependency.
- Email/password sign-in, verification-aware sign-up, password recovery and update form, local sign-out.
- Separate local namespaces per authenticated user and unchanged original guest keys.
- Debounced private cloud saves, offline local persistence, manual sync retry.
- Conditional revision updates detect concurrent saves; users choose the active puzzle.
- Explicit guest import preserves original guest progress and combines completion records.
- Strict database ownership RLS with SELECT/INSERT/UPDATE/DELETE restricted to authenticated owner.
- Only project URL and publishable key are public. No service-role/secret key in browser code.
- SQL transaction tests verify two-user isolation, reassignment denial, stale-write rejection, guest denial. Fixtures roll back.
- Security advisors: no database findings.

## Remaining activation steps
Registration is disabled in account-config.js until these checks pass:
1. Authentication URL configuration: completed and verified; Site URL and allowed redirect are https://siahverse.cc/nursedoku/.
2. Custom SMTP for public verification and recovery emails, sent from nursing@siahverse.cc. Supabase default SMTP only sends to organization team members.
3. End-to-end signup, verification, sign-in, recovery, and cross-device restore with two disposable accounts.
4. Set registrationEnabled to true, rebuild hashes/cache, republish.

Dashboard is signed in and redirects have been configured. Email-provider connection, sender-domain verification, and SMTP credentials remain outstanding.

## Data and behavior
One row per user stores active game, completed shift IDs and statistics. Each save has a revision; stale updates change zero rows. The UI never imports guest data automatically. Sign-out restores guest progress.
When combining saves, completion/date records are unioned and best time is the minimum. Win count uses the larger device count, so separately repeated wins on different devices can be undercounted. It is not a leaderboard metric.
Active board data is validated on restore. Browser data is local to the account namespace; use a private device and sign out on shared devices.
Account deletion/export tooling and a full privacy page remain follow-up work.
