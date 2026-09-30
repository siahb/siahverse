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

Dashboard is signed in and redirects have been configured. Resend is connected and siahverse.cc has been added as a sending domain. DNS verification and SMTP credentials remain outstanding; public registration stays disabled until delivery is tested.

## Data and behavior
One row per user stores active game, completed shift IDs and statistics. Each save has a revision; stale updates change zero rows. The UI never imports guest data automatically. Sign-out restores guest progress.
When combining saves, completion/date records are unioned and best time is the minimum. Win count uses the larger device count, so separately repeated wins on different devices can be undercounted. It is not a leaderboard metric.
Active board data is validated on restore. Browser data is local to the account namespace; use a private device and sign out on shared devices.
Account deletion/export tooling and a full privacy page remain follow-up work.

## Resend domain verification

Add these records to the DNS zone for siahverse.cc (TTL Auto). Receiving mail is disabled; these records configure outgoing account emails only.

| Type | Name | Value | Priority |
| --- | --- | --- | --- |
| TXT | resend._domainkey | p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDNWT8LWkFxdq72kG3A3jV9pjMRHQaX48cDNJ+pD14zoRTsvz9H0pbpKaBv1mSKplsricji/VJtNR+ciKgYkqYVQ4WO7WkeRUWCp6+X6EoxnHVwdNO2drYtwT+VoL9LrL70K0bwtnuS3yZipSngg21i40EH5RZwPYH/pLjE8Jr/7wIDAQAB | — |
| MX | send | feedback-smtp.us-east-1.amazonses.com | 10 |
| TXT | send | v=spf1 include:amazonses.com ~all | — |
| CNAME | rsend | send.forge.rmta.net | — |

After domain verification, configure Supabase custom SMTP with smtp.resend.com, port 465, username resend, and a domain-restricted sending API key as its password. Keep the key out of the static site. Sender: nursing@siahverse.cc; name: NurseDoku. Test signup confirmation and password recovery before enabling registration.
