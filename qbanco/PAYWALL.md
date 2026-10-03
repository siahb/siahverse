# Class Exams access

The server protects both `/qbanco/class-exams/*` and the legacy `/pharm1/*` and `/medsurg1/*` routes, preventing the old URLs from bypassing the live-site lock. The host verifies the existing nursing session first. A general Siahverse account is not sufficient.

Approved nursing students also need an active server-side Class Exams grant. Nursing administrators may preview/manage without purchasing. Unconfigured or malformed grants, expired/revoked subscriptions and mismatched credentials deny access. Successful content responses are private/no-store. There is no checkout, advertised price or payment fulfillment yet; the purchase page says purchases are unavailable.

Host integration is in the Siahverse Pages Function, with `server/class-access.mjs` copied to `server/qbanco-class-access.mjs`. `QBANCO_CLASS_ENTITLEMENTS` is a server environment value containing an array of `{credential_id, status: "active", expires_at, revoked}` objects. Only verified paid/manual grants should be configured there. Never send that value to the frontend. Payment-provider webhook verification and automated grants must be added after price/provider selection. Browser storage flags, payment-success query strings and client claims cannot grant access.

This locks future live-site requests. Existing offline saves/downloads and question text already present in the legacy public Siahverse Git history are not revoked or hidden by a site paywall. No history purge or deletion was performed. New question imports must stay in private storage.

Run `node --test server/class-access.test.mjs core.test.mjs` for server access, expiry, invalid-config, bypass-route and cache checks. Production purchasing remains disabled until payment integration is tested.

## Subscription policy
Class Exams is subscription-only. Only active, unexpired subscriptions grant access; missing, canceled or past-due status denies access. The paid-through date must come from verified payment-provider events. The existing nursing gate revokes previous sessions on each new login, allowing one active login per account. This discourages concurrent sharing but cannot guarantee that credentials are never shared. Proposed pricing is $3/month, pending owner confirmation; no checkout or recurring billing exists yet.

## Full QBanco scope
All /qbanco routes and assets now require the verified nursing session and active subscription. This covers NCLEX, HESI and Class Exams. Discord #NCLEX-Prep remains the free daily-question channel. The original public NCLEX feed remains public and unchanged. QBANCO_CLASS_ENTITLEMENTS is retained as the server configuration name for compatibility, but grants apply to all QBanco modes.
