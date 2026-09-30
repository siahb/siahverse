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
2. Resend must finish verifying the sending domain. Custom SMTP is already saved and enabled for nursing@siahverse.cc; the live signup test reached Resend but was rejected because the domain is not verified.
3. End-to-end signup, verification, sign-in, recovery, and cross-device restore with two disposable accounts.
4. Set registrationEnabled to true, rebuild hashes/cache, republish.

Dashboard redirects and SMTP are configured. Resend still reports DKIM pending; public registration stays disabled until successful signup and recovery delivery are tested.

## Activation check — September 30, 2026

- Supabase custom SMTP remains enabled after reloading the dashboard: smtp.resend.com, port 465, sender name NurseDoku. A dedicated NurseDoku Supabase SMTP key exists in Resend.
- An authorized signup test to nursing@siahverse.cc reached Resend through the saved SMTP connection. Supabase returned HTTP 500, and its auth log recorded SMTP 550: `The siahverse.cc domain is not verified`. Resend recorded the corresponding HTTP 403 SMTP request. No email was delivered and no account was retained.
- Cloudflare's published DKIM TXT value exactly matches Resend's required value. Both 1.1.1.1 and 8.8.8.8 resolve it correctly. Resend verification was restarted; DKIM remains pending, while the sending MX, SPF TXT, and CNAME records are verified. Preserve the existing Zoho receiving records.
- Live rollback-only database checks passed: owner restore, stale-write rejection, ownership reassignment denial, second-user isolation, and guest denial. Fixtures were rolled back. Supabase security advisors returned no findings.
- Existing account, gameplay/state, NCLEX question history, and offline checks passed. Browser signup confirmation, password recovery, and cross-device account restore remain unverified because sending is blocked.

Next: check Resend's domain status, then repeat signup and recovery with nursing@siahverse.cc. Enable registration only after email confirmation, password update, and cross-device restore succeed. If domain verification remains pending despite the matching public record, use Resend support; do not replace the working DNS records or switch off confirmation to bypass the failure.

## Data and behavior
One row per user stores active game, completed shift IDs and statistics. Each save has a revision; stale updates change zero rows. The UI never imports guest data automatically. Sign-out restores guest progress.
When combining saves, completion/date records are unioned and best time is the minimum. Win count uses the larger device count, so separately repeated wins on different devices can be undercounted. It is not a leaderboard metric.
Active board data is validated on restore. Browser data is local to the account namespace; use a private device and sign out on shared devices.
Account deletion/export tooling and a full privacy page remain follow-up work.

## Resend domain verification

These records are already published in the DNS zone for siahverse.cc (TTL Auto). Resend receiving is disabled; these records configure outgoing account emails only. Existing Zoho mail receiving remains in place.

| Type | Name | Value | Priority |
| --- | --- | --- | --- |
| TXT | resend._domainkey | p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDNWT8LWkFxdq72kG3A3jV9pjMRHQaX48cDNJ+pD14zoRTsvz9H0pbpKaBv1mSKplsricji/VJtNR+ciKgYkqYVQ4WO7WkeRUWCp6+X6EoxnHVwdNO2drYtwT+VoL9LrL70K0bwtnuS3yZipSngg21i40EH5RZwPYH/pLjE8Jr/7wIDAQAB | — |
| MX | send | feedback-smtp.us-east-1.amazonses.com | 10 |
| TXT | send | v=spf1 include:amazonses.com ~all | — |
| CNAME | rsend | send.forge.rmta.net | — |

Supabase custom SMTP is saved with smtp.resend.com, port 465, and the dedicated sending credential. Keep its password out of the static site. Sender: nursing@siahverse.cc; name: NurseDoku. Domain verification and successful signup confirmation/password recovery tests are still required before enabling registration.
