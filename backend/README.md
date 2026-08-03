# Portal Limiar — Apps Script Backend

Google Apps Script Web App + Google Drive storage for Portal Limiar. Code lives in `src/` and is pushed to the actual Apps Script project via [clasp](https://github.com/google/clasp). No frontend changes are part of this — the live site still runs on `js/data.js`'s in-memory model until a separate integration pass wires it up to this API.

## One-time setup (only you can do these — interactive Google login/consent)

1. Install clasp (from `backend/`):
   ```
   npm install -g @google/clasp
   ```
2. Log in (opens a browser for Google OAuth):
   ```
   clasp login
   ```
3. Enable the Apps Script API toggle at https://script.google.com/home/usersettings (one-time, per Google account).
4. Create the Apps Script project, linked to this folder:
   ```
   clasp create --title "Portal Limiar Backend" --type webapp --rootDir src
   ```
   This creates `backend/.clasp.json` (gitignored — not a secret, just machine-specific).
5. In Google Drive, create a folder to hold all of the app's data (any name, e.g. "Portal Limiar — Dados"). Open it and copy its ID from the URL (`https://drive.google.com/drive/folders/<THIS_PART>`).
6. Push the code:
   ```
   clasp push
   ```
7. Open the project in the Apps Script editor (`clasp open` or via script.google.com), go to **Project Settings → Script Properties**, and add:
   - Key: `ROOT_FOLDER_ID`
   - Value: the folder ID from step 5
8. In the editor, select `Seed` in the function dropdown, then `rodar`, and click **Run**. This is also when Google will prompt you to grant the script access to Drive/Docs — approve it. This populates demo data (2 users, 3 projects, cronograma/financeiro/RDOs for project 1) so the API has something to test against.
9. **Deploy → New deployment → Web app.** Access and execution settings are already set via `appsscript.json` (`ANYONE_ANONYMOUS` / `USER_DEPLOYING`) — just confirm and deploy. Copy the resulting `.../exec` URL; that's the API endpoint.

## Everyday workflow after setup

Edit files under `src/`, then:
```
clasp push
```
No redeploy needed for most changes — a Web App's `/exec` URL always runs the latest pushed code for `HEAD` deployments, but if you cut a *versioned* deployment via **Deploy → Manage deployments**, you'll need to create a new version there to pick up changes.

## API contract

Everything goes through `doPost` as a JSON body:
```json
{"collection": "projects", "op": "listar", "args": []}
```
Response is always HTTP 200 (Apps Script Web Apps can't send other status codes) with the real result inside the body:
```json
{"ok": true, "data": [...]}
{"ok": false, "error": "message"}
```

`doGet` with no query params is a health check. `doGet?action=projects.listar&args=[]` works too, but only for the read-only actions listed in `Code.js`'s `LEITURAS_PERMITIDAS_GET` — everything else must go through POST.

See the plan at the repo root (or ask) for the full list of `collection`/`op` combinations — they mirror `Db.js`'s aggregator: `users`, `projects`, `permissions`, `catalog`, `cronograma`, `financeiro`, `rdos`, `images`, `archive`, `seed`.
