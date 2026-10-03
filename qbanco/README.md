# QBanco by NCLEXapro

Static mobile practice app at `/qbanco/`. Created by Siah. No build or new backend.

Reads only the public `siahb/nclexapro/main/generated-questions.json` feed at runtime. Never bundles publisher questions or the bot's private bank. Validates ready/original metadata, unique IDs and prompt text, recognized topics, consecutive choice letters, answer letters, per-option rationale text, and HTTPS sources. Invalid items are excluded and counted. Network errors and an empty bank have explicit retry states. Original provenance is the feed author's assertion; automated validation cannot prove authorship or clinical accuracy.

Daily sets use America/Los_Angeles dates and round-robin topic balancing. Up to 10 unseen IDs are reserved once per date and stored, including unfinished sets, so tomorrow never silently repeats them. Explicit retries and topic practice are allowed. Completing a question elsewhere counts toward that daily set. Feed removals may shorten an existing set; new items enter the next daily assignment. A date change is applied when returning to the dashboard; an active session can finish its original set.

Uses the existing `/account-client.js` identity and `/account/` sign-in. No Supabase configuration, cookies, APIs or database schema were changed. Guest and signed-in profiles have separate origin-local storage keys. Auth changes discard the active session. Scores and answers are never sent to the account service, bot or feed. Identity reuse does not provide cross-device sync. Browser-profile access is not cryptographic protection; guest data can be accessed by anyone using that profile. No accounts are required.

Latest attempts determine missed status and dashboard accuracy; each retry gets a new session score. Reset deletes only the active profile's QBanco data. Blocking storage produces an explicit temporary mode. Cross-tab storage updates discard the active session to avoid continuing with stale progress. There is no offline question cache or analytics.

## Preview and validation

From repository root: `python -m http.server 8080 --bind 127.0.0.1`, then open `http://127.0.0.1:8080/qbanco/`.

`node --test qbanco/core.test.mjs` validates grading, malformed feed handling, daily balancing/repeat prevention, Pacific dates including DST, retries and profile separation. Optional `QBANCO_FEED_FILE` points to a local copy of the public feed for strict validation. Synthetic test fixtures contain no clinical teaching content and are never loaded by the app.

Browser validation additionally covers mobile overflow, submit gating, rationales/sources, bookmarks, reload persistence, retries, session summaries, mocked existing account transitions, reset/cancel, HTTP failure, empty feed and blocked storage. Production sign-in and Cloudflare deployment require live checks after preview approval. A static preview does not execute Pages Functions.

Reproduce browser checks from repository root with the static preview server running: set `PLAYWRIGHT_MODULE` to a Playwright installation if it is not on the module path; set `QBANCO_FEED_FILE` to a downloaded public feed JSON; create a `work/` directory for screenshots; run `node qbanco/tests/browser-check.cjs` and `node qbanco/tests/live-check.cjs`. These scripts use installed Microsoft Edge in headless mode. The first uses feed/account mocks for deterministic state checks; the second reads the real public feed and mocks only the existing account session.

## Publishing

Deploy through the existing Siahverse Cloudflare Pages workflow after preview approval. Keep the repository root as the static output and preserve all current Functions/bindings. The nursing hub currently labels QBanco Preview. Verify the exact live app assets and public feed loading; verify existing account transitions and unrelated routes before marking the app live.
