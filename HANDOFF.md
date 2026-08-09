# Handoff: migrate Apps Script + Drive to a new Google account

Working note for continuing this specific task in a fresh Claude Code session (e.g. on
another PC) — conversation history and Claude's memory don't transfer between machines,
so this file carries the context forward instead. Safe to delete once the migration
below is done and verified; it isn't meant to be permanent project documentation.

## What this project is

Portal Limiar — a construction-project-management web app (RDOs/weekly reports,
cronograma, financeiro, project photos) for a small business. Static site (no build
step) on GitHub Pages, backed by:
- **Firebase** (Firestore + Auth) — the actual database and login. Everything except
  images/PDFs lives here, read/written directly from the browser.
- **Google Apps Script** — the only piece that still needs a server-side credential,
  because only it can write to Google Drive. Handles exactly two things: uploading
  images (project cover photos, RDO photos, financeiro receipt photos) and generating
  RDO PDFs. Everything it creates is stored as real files in a Google Drive folder
  (`ROOT_FOLDER_ID`, a Script Property), with the fileId saved back into Firestore.

## The task

Move the Apps Script project + its Drive storage from André's Google account to his
sister's Google account — it's her business, the app should run on her account/quota,
not his personal one.

Decisions already made (don't re-ask):
- **Firebase stays under André's account.** Not part of this migration. Firestore data,
  logins, everything there is untouched.
- **Existing Drive files (photos/PDFs) are disposable.** They were test data, not real
  client records. No need to transfer or preserve them — just start the new Drive
  folder empty. (If old fileId references in Firestore end up pointing at nothing once
  the old account/files are gone someday, that's an accepted, known consequence — not a
  bug to fix.)

## Exact steps

**Part A — needs to happen logged into the sister's Google account (do this on her PC,
her browser):**

1. `script.google.com` → New Project → rename it (e.g. "Portal Limiar — Backend") →
   Project Settings (gear icon) → copy the **Script ID**.
2. Create an empty folder in her Google Drive (e.g. "Portal Limiar — Arquivos") → copy
   its folder ID from the URL (after `/folders/`).
3. In the Apps Script project's Project Settings → Script Properties → add
   `ROOT_FOLDER_ID` = that folder ID.
4. Clone this repo there if not already: `git clone https://github.com/LimiarStudio/portal-limiar.git`.
   `npx clasp login` (authorizes as her). Edit `backend/.clasp.json`, replace `scriptId`
   with the one from step 1 (leave every other field as-is). `cd backend && npx clasp push`.
5. `npx clasp deploy` from `backend/` → copy the deployment's `/exec` URL.
6. Sanity check: open that `/exec` URL directly in a browser — should return
   `{"ok":true,"service":"Portal Limiar backend..."}`. If so, the new backend works and
   nothing live has been touched yet (this is fully reversible up to this point).

**Part B — the actual cutover (only step that touches the live site):**

7. In `js/api.js`, line ~31, replace the `API_URL` constant with the new `/exec` URL.
8. Commit, push to `main` (GitHub Pages auto-publishes off `main`, live within ~1 min).
9. Verify for real: upload a photo or generate an RDO PDF on the live site, confirm it
   lands in the sister's new Drive folder.

After that, the old Apps Script project/Drive folder under André's account can just be
ignored or deleted whenever — nothing depends on them once step 8 is pushed.

## Relevant files

- `backend/.clasp.json` — `scriptId` to update (step 4).
- `js/api.js` (~line 31) — `API_URL` constant to update (step 7).
- `backend/src/appsscript.json` — webapp deploy config (`access`/`executeAs`), already
  correct, no change needed; it ships automatically with `clasp push`.
- `backend/src/Lib/Folders.js` — reads `ROOT_FOLDER_ID` via `PropertiesService`, nothing
  to change here either.

## Local testing setup (if verifying end-to-end)

- `node serve.js` at repo root serves the static site at `http://localhost:8934` (must
  be real `http://`, not `file://`, for Firebase Auth to behave correctly).
- Real admin login credentials are NOT in this file or the repo — ask the user for them
  directly if a test login is needed.
- Browser automation used in this project: `playwright-core` launched against the local
  Edge install (`chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })`),
  not a bundled Chromium — Playwright itself isn't a project dependency, just
  `playwright-core` driving the existing Edge browser.
- Always clean up any throwaway test projects created during verification
  (`Api.projects.remover(<id>)`) — this app has real production data in daily use.

## Status as of writing

Nothing in Part A has been done yet — waiting on the sister to run through those steps
on her PC (or for her Script ID / new deployment URL to be handed back so Part B can be
done from elsewhere). This file was written by Claude Code in the original session,
right after finishing an unrelated feature (optional receipt photos on financeiro
lançamentos, plus 0-orçamento categorias) — both already shipped to production and
unrelated to this migration.
