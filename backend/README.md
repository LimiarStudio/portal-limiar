# Portal Limiar — Apps Script Backend (enxuto)

Google Apps Script Web App, usado só para as duas coisas que exigem uma credencial de servidor pro Google Drive: subir/apagar imagem e gerar o PDF de um relatório. Todo o resto do site (projetos, usuários, permissões, catálogo, cronograma, financeiro, relatórios) fala direto com o Firestore, sem passar por aqui — ver a migração pra Firebase (Fases 1–12) no histórico do git para o desenho completo e o porquê.

Autenticação: quem loga é o Firebase Auth, no cliente. Este backend só confirma que o `idToken` recebido é genuíno (`Lib/FirebaseAuth.js`, via `identitytoolkit.googleapis.com/v1/accounts:lookup`) antes de tocar o Drive — não existe mais sessão/token próprios.

## One-time setup (só você — login/consentimento interativo do Google)

1. Instale o clasp (a partir de `backend/`):
   ```
   npm install -g @google/clasp
   ```
2. Login (abre um navegador pro OAuth do Google):
   ```
   clasp login
   ```
3. `backend/.clasp.json` (gitignored) já aponta pro projeto Apps Script real, com `ROOT_FOLDER_ID` configurada como Script Property (Project Settings → Script Properties) apontando pra pasta do Google Drive que guarda os dados (imagens, PDFs).
4. **Autorizar o escopo `script.external_request`** (necessário pro `UrlFetchApp` usado em `Lib/FirebaseAuth.js` — só precisa ser feito uma vez por projeto, `clasp push`/`clasp deploy` sozinhos não disparam essa tela de consentimento): abra o projeto no editor, selecione `autorizarUrlFetch_` no dropdown de funções e clique **Executar**. Aparece "Autorização necessária" → Revisar permissões → escolher a conta → Avançado → "Acessar Portal Limiar backend (não seguro)" → Permitir.

## Fluxo do dia a dia

Edite os arquivos em `src/`, depois:
```
clasp push
clasp deploy -i <deploymentId>
```
**Os dois comandos são necessários** — o deployment usado pela URL `/exec` ao vivo é *versionado*, não HEAD; `clasp push` só atualiza o conteúdo que aparece no editor, `clasp deploy -i` é o que de fato publica uma nova versão pra URL em produção. Pra descobrir o `deploymentId` atual: `clasp deployments`.

## Contrato da API

Tudo passa por `doPost` como um corpo JSON. Toda ação precisa de um `idToken` do Firebase Auth válido (nenhuma é pública):
```json
{"collection": "images", "op": "saveDataUrl", "args": ["data:image/...", "12", "capa"], "idToken": "<idToken do Firebase Auth>"}
{"collection": "rdos", "op": "gerarPdf", "args": ["Nome do Projeto", {"n":1, "projectId":"12", ...}], "idToken": "..."}
```
Resposta é sempre HTTP 200 (Web Apps do Apps Script não mandam outros status) com o resultado de verdade dentro do corpo:
```json
{"ok": true, "data": [...]}
{"ok": false, "error": "mensagem"}
```
`doGet` é um healthcheck puro (`{ok:true, service:...}`) — sem acesso a dado nenhum.

Só existem 3 operações, espelhando `Db.js`:
- `images.saveDataUrl(dataUrl, projectId, kind, extra?)` — `kind` é `"capa"` ou `"rdo-foto"` (com `extra:{n,index}`)
- `images.remove(fileId)`
- `rdos.gerarPdf(projectNome, relatorio)` — `relatorio` já no formato de banco (o cliente já leu isso do Firestore), gera/substitui o PDF em `rdoPdfs/<projectId>/relatorio-<n>.pdf`
