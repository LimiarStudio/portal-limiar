# Portal Limiar

Construction project management site built for [Studio Limiar](https://limiarstudio.github.io/portal-limiar/) — weekly progress reports (RDOs), project schedule (cronograma), budget tracking (financeiro), and project photos, all per-project with role-based permissions.

**License:** proprietary, all rights reserved — see [LICENSE](LICENSE). This code is public for transparency, not for reuse.

## Live site

<https://limiarstudio.github.io/portal-limiar/>

## Architecture

Static site, no build step — plain HTML/CSS/JS, deployed straight from `main` via GitHub Pages.

- **Firestore + Firebase Auth** — the actual database and login. Every page and nearly every save talks to Firestore directly from the browser; `firestore.rules` is the real security boundary (per-project, per-module permissions).
- **Google Apps Script** (`backend/`) — a trimmed backend that exists only for the two things that inherently need a server-side Google Drive credential a browser can't hold: uploading images and generating RDO PDFs. It never touches Firestore. Every request carries a Firebase ID token, which the backend verifies before touching Drive.

This split exists because the site used to run entirely on Apps Script (Drive as a JSON database), which added several seconds of redirect latency to every request. Firestore's free tier removed that for everything except the two Drive-dependent operations.

## Repo structure

```
/                       site pages (html), css/, js/, img/
backend/                Apps Script backend — see backend/README.md
docs/                   admin guide (Portuguese, for the site's own admin)
scripts/firebase-admin/ one-off/CLI scripts using the Firebase Admin SDK
                        (initial setup, password reset/account removal,
                        security rules testing) — never run in the browser
firestore.rules         Firestore security rules
firestore.indexes.json  Firestore composite/collection-group indexes
firebase.json / .firebaserc  Firebase project config
```

## Running locally

```
node serve.js
```

then open `http://localhost:8934/login.html`. Must be served over `http://` — opening the HTML files directly (`file://`) breaks Firebase Auth's session handling.

## Documentation

All in Portuguese, matching the site's own language:

- [docs/guia-administracao.md](docs/guia-administracao.md) — admin guide, covers what isn't doable from the site itself (password resets, account removal, emergency data access).
- [docs/guia-funcionarios.md](docs/guia-funcionarios.md) — employee guide, covers every action available depending on granted per-project/per-module permissions.
- [docs/guia-clientes.md](docs/guia-clientes.md) — client guide, covers the (mostly read-only) view of a project's progress, reports, schedule, and budget.
- [backend/README.md](backend/README.md) — Apps Script backend setup and API contract.

## License

All rights reserved — see [LICENSE](LICENSE). No permission is granted to copy, modify, or redistribute this code.
