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
8. In the editor, select `Seed` in the function dropdown, then `rodar`, and click **Run**. This is also when Google will prompt you to grant the script access to Drive/Docs — approve it. This populates demo data (1 user, 3 projects, cronograma/financeiro/RDOs for project 1) and creates `admin.json` — but with no password yet.
9. Set the admin's password: add a Script Property `ADMIN_SENHA` (same place as `ROOT_FOLDER_ID`) with the password you want, then select `definirSenhaAdmin` in the function dropdown and **Run**. It hashes the password into `admin.json` and deletes the Script Property afterward — the plaintext never lingers. **To change the admin's password later, redo just this step** (set `ADMIN_SENHA` to the new value, run `definirSenhaAdmin` again) — it only needs `admin.json` to already exist, so this never requires reseeding or touching any other data.
10. **Deploy → New deployment → Web app.** Access and execution settings are already set via `appsscript.json` (`ANYONE_ANONYMOUS` / `USER_DEPLOYING`) — just confirm and deploy. Copy the resulting `.../exec` URL; that's the API endpoint.

## Everyday workflow after setup

Edit files under `src/`, then:
```
clasp push
```
No redeploy needed for most changes — a Web App's `/exec` URL always runs the latest pushed code for `HEAD` deployments, but if you cut a *versioned* deployment via **Deploy → Manage deployments**, you'll need to create a new version there to pick up changes.

## API contract

Everything goes through `doPost` as a JSON body. Every action except `auth.login` needs a valid session `token`:
```json
{"collection": "auth", "op": "login", "args": ["joyce@limiar.com.br", "..."]}
{"collection": "projects", "op": "listar", "args": [], "token": "<token from login>"}
```
Response is always HTTP 200 (Apps Script Web Apps can't send other status codes) with the real result inside the body:
```json
{"ok": true, "data": [...]}
{"ok": false, "error": "message"}
```
A further allowlist (`Code.js`'s `ACOES_ADMIN`) requires the session to specifically be the admin's — user management, permissions, project/catalog/cronograma/financeiro mutations, archiving, and reseeding. Everything else just needs any valid login.

`doGet` is a pure health check (`{ok:true, service:...}`) — no data access, since a token should never travel in a GET query string.

See the plan at the repo root (or ask) for the full list of `collection`/`op` combinations — they mirror `Db.js`'s aggregator: `auth`, `users`, `projects`, `permissions`, `catalog`, `cronograma`, `financeiro`, `rdos`, `images`, `archive`, `seed`.
