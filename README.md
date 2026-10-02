# Siahverse

Josiah Borja's personal portal for nursing study tools, productivity, cloud services, and homelab access.

**Website:** [siahverse.cc](https://siahverse.cc)

## Explore

| Area | Purpose |
| --- | --- |
| [Nursing](https://siahverse.cc/nursing/) | Hub for nursing practice apps and study tools |
| [Pharmacology Exam 1](https://siahverse.cc/pharm1/) | Practice and exam modes, MC/SATA/DDC questions, hints, review, and saved sessions |
| [Med-Surg Exam 1](https://siahverse.cc/medsurg1/) | App shell; question bank awaiting course materials |
| [NurseDoku](https://siahverse.cc/nursedoku/) | Colorful nursing logic puzzles with a question after each completed shift |
| [DeskHop](/deskhop/) | Browser launcher for your personal Windows desktop; gateway setup required |
| [Tasks](https://todo.siahverse.cc) | Tasks, routines, priorities, and planning |
| [NextSet](https://nextset.siahverse.cc) | PPL at Home workouts, set logging, rest timer, and plate calculator; also accessible through `/nextset` |
| [SiahCloud](https://vault.siahverse.cc) | Personal cloud portal |

The homepage also links to Proxmox, Home Assistant, and system status services.

## Features

- Responsive portal with separate spaces for each tool.
- Light/dark theme switching and an animated star background.
- Siahbot interactions and a keyboard shortcut to the admin area.
- Nursing access requests and an admin center for accounts and sessions.
- Cloudflare Pages Functions with D1-backed access and task data.
- A custom 404 page and web app manifests.

### NurseDoku

NurseDoku starts at a main menu and includes guided training, daily puzzles, practice, 10×10 boards, colorful care zones, sounds, and win celebrations.

Tap to mark Xs, swipe to add or erase several Xs, and double-tap to place an RN. Every incorrect RN square costs a strike; three strikes end the attempt. Winning pauses on the completed board for two seconds before a required nursing question with answer confirmation and a rationale. The menu and results support sharing.

Private Supabase cloud-save code is implemented. Public registration remains disabled pending verified email delivery and end-to-end signup/recovery testing.

See [NurseDoku documentation](nursedoku/README.md), its [roadmap](nursedoku/ROADMAP.md), and the [standalone repository](https://github.com/siahb/nursedoku).

## Repository layout

| Path | Purpose |
| --- | --- |
| `index.html`, `main.css`, `toggle-theme.js` | Portal homepage and theme |
| `nursing/` | Nursing resource hub |
| `pharm1/` | Pharmacology practice app |
| `medsurg1/` | Med-Surg app shell |
| `nursedoku/` | NurseDoku app, account integration, and checks |
| `public/` | SiahDo frontend served on its subdomain |
| `functions/[[path]].js` | Pages Function routing, nursing access, admin center, and SiahDo API |
| `server.mjs` | Separate legacy Express task backend |
| `wordle/` | Additional game files |
| `404.html`, `favicon.svg`, `manifest.json`, `_headers` | Site support files |
| `secret.html`, `easter-egg.js` | Legacy extra page and interaction script |

The current homepage uses `main.css`; it does not use the old README's `style.css` path. Its inline keyboard shortcut opens `/admin/`.

## Local preview

The static frontend has no build step:

```sh
git clone https://github.com/siahb/siahverse.git
cd siahverse
python3 -m http.server 8080
```

Open `http://localhost:8080`. A plain static server previews pages but does not run Cloudflare Functions, D1 access controls, or task API routes.

NurseDoku's checks can be run with Node.js, for example:

```sh
node nursedoku/tests/check-state.cjs
node nursedoku/tests/check-offline.cjs
node nursedoku/tests/check-accounts.cjs
```

## Hosting and backend configuration

The site targets Cloudflare Pages. Serve the repository root as the static site and deploy `functions/` for server-side routes.

The Pages Function requires:
- A Cloudflare D1 binding named `DB`.
- The nursing access database tables used by the function, including `credentials`, `sessions`, and `access_log`.
- A server-side `SIAHDO_ADMIN_PASSWORD` secret for SiahDo changes.

The function contains routing for `todo.siahverse.cc` and `nursing.siahverse.cc`; DNS/custom-domain configuration is managed outside the source files. Nursing study apps and the admin center require the appropriate session. The nursing hub and NurseDoku are public routes.

SiahDo's Cloudflare backend includes task storage in D1 and an admin migration action for importing the homelab list. Source support alone does not establish that a domain cutover or data migration has been completed.

The separate [siah-todo repository](https://github.com/siahb/siah-todo) retains its SSH/rsync homelab frontend deployment workflow. Its `public/` copy and this repository's `public/` copy must be maintained deliberately.

## Development notes

Keep service credentials in backend environment secrets. NurseDoku's public Supabase configuration belongs in `nursedoku/account-config.js`; privileged credentials and SMTP passwords do not belong in frontend files.

Check the relevant app's README before editing its assets, storage format, or deployment configuration.

Made with Siahverse by Josiah Borja.

## Shared appearance

All Siahverse pages use `sv_theme`, a one-year, Secure, SameSite=Lax cookie scoped to `siahverse.cc` and `/`. Every explicit toggle replaces that value; navigation never writes a preference. Old per-app local storage is ignored. Pages apply it before rendering and refresh on return, focus, visibility, and once per second while visible. Without a choice, the device theme is used. Outside the Siahverse domain, local previews use origin-local storage. Unrelated external services do not share this cookie.

`toggle-theme.js`, `public/theme.js`, and `nursedoku/appearance.js` must contain the same controller; the copies support Tasks subdomain routing and NurseDoku offline assets. Run `node tests/theme-sync.cjs` after changes, then rebuild NurseDoku immutable assets.

## DeskHop

`deskhop/` contains the browser launcher from [siahb/deskhop](https://github.com/siahb/deskhop).
The homepage links to `/deskhop/`. Configure `deskhop/config.js` with an HTTPS
Guacamole gateway URL after securing and testing that gateway. Until configured,
the page shows setup needed and keeps the connection button disabled. Hosting
this page alone does not provide remote desktop access. Gateway configuration
and the Windows setup guide live in the standalone DeskHop repository; keep
credentials there in backend secrets, never in this site's browser files.

### DeskHop private access

All `/deskhop` and `/deskhop/*` requests are checked on the server before static
assets or the launch redirect are served. Supabase verifies the account using
Siahverse's HttpOnly session cookies. Only verified user IDs in the server's
`DESKHOP_OWNER_IDS` list (or the `DESKHOP_OWNER_IDS` runtime variable) are allowed.
The default empty list denies everyone; registration does not grant DeskHop
access. Unauthorized visitors get a dedicated sign-in form or a 403 response.
Private responses are never publicly cached. `/deskhop/connect` verifies the
account again, validates the HTTPS gateway URL, and redirects only the owner.

This protects the Siahverse launcher, not the external gateway itself. Guacamole
must independently require its own restricted account and MFA. Signing out of
Siahverse does not sign out of Guacamole or terminate an existing remote session.
Keep the gateway unconfigured until those protections are verified. Run
`node --test tests/deskhop-access.mjs` to check the authorization boundaries.
