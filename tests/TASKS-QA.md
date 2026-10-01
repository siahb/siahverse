# Tasks QA

Run from the repository root:

```powershell
node tests/tasks-qa.mjs
node tests/siahdo-recurrence.cjs
node tests/shared-accounts.mjs
node tests/theme-sync.cjs
```

The DOM integration suite uses jsdom 29.1.1. Keep its dependency outside the deployed site:

```powershell
npm install --prefix ../qa-deps jsdom@29.1.1 --no-audit --no-fund
$env:JSDOM_MODULE_PATH = (Resolve-Path ../qa-deps/node_modules/jsdom).Path
node tests/tasks-ui.cjs
Remove-Item Env:JSDOM_MODULE_PATH
```

The integration suite runs the actual frontend and account adapter against disposable in-memory lists. It covers original and private lists, add/edit/complete/reopen/delete/Undo, literal text and attributes, daily and weekly recurrence, every sort mode, search and focus filters, full-list drag/reorder, hidden archive selection, account changes, stale loads, and failed writes. It does not contact production or send account emails.

For live QA, use uniquely named disposable tasks, remove them afterward, and compare the complete original list before and after. Never replace the original table, import over a populated account, or test password recovery by sending email without explicit authorization.
