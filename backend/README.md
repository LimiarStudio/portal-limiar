# Portal Limiar — Apps Script Backend (enxuto)

Google Apps Script Web App, usado só para as poucas coisas que exigem uma credencial de servidor: subir/apagar imagem e gerar o PDF de um relatório (Google Drive), organizar arquivos ao arquivar um projeto (Drive também), e apagar de vez a conta de login de alguém (Firebase Auth, só o administrador). Todo o resto do site (projetos, usuários, permissões, catálogo, cronograma, financeiro, relatórios) fala direto com o Firestore, sem passar por aqui — ver a migração pra Firebase (Fases 1–12) no histórico do git para o desenho completo e o porquê.

Autenticação: quem loga é o Firebase Auth, no cliente. Este backend só confirma que o `idToken` recebido é genuíno (`Lib/FirebaseAuth.js`, via `identitytoolkit.googleapis.com/v1/accounts:lookup`) antes de tocar o Drive — não existe mais sessão/token próprios.

## One-time setup (só você — login/consentimento interativo do Google)

1. Instale o clasp (a partir de `backend/`):
   ```
   npm install -g @google/clasp
   ```
2. Login (abre um navegador pro OAuth do Google — precisa ser a conta que já tem acesso de edição ao projeto Apps Script real, não qualquer conta):
   ```
   clasp login
   ```
3. `backend/.clasp.json` (gitignored) já aponta pro projeto Apps Script real, com `ROOT_FOLDER_ID` configurada como Script Property (Project Settings → Script Properties) apontando pra pasta do Google Drive que guarda os dados (imagens, PDFs).
4. **Autorizar os escopos do `oauthScopes`** (`appsscript.json` — `script.external_request`, `drive`, `documents`, `identitytoolkit`; só precisa ser feito uma vez por projeto, e de novo sempre que `oauthScopes` mudar, já que `clasp push`/`clasp deploy` sozinhos não disparam essa tela de consentimento): abra o projeto no editor, selecione `autorizarUrlFetch_` no dropdown de funções e clique **Executar**. Aparece "Autorização necessária" → Revisar permissões → escolher a conta → Avançado → "Acessar Portal Limiar backend (não seguro)" → Permitir.
5. **Configurar a Script Property `ADMIN_UID`** (necessária só pra `users.remover`, ver abaixo): o uid do Firebase Auth do administrador — Firebase Console → Authentication → Users → copiar o "User UID" da linha do administrador — em Project Settings → Script Properties.
6. **Conceder o papel de IAM "Firebase Authentication Admin"** à conta que executa o deploy (a mesma do passo 2, quem quer que esteja marcada em "Executar como" no deployment — ver aviso mais abaixo), no projeto do Google Cloud `portal-limiar-api` (necessário só pra `users.remover` conseguir chamar a Identity Toolkit API): [console.cloud.google.com](https://console.cloud.google.com) → selecione o projeto `portal-limiar-api` → IAM e administrador → IAM → Conceder acesso → cole o e-mail da conta → papel "Firebase Authentication Admin" → Salvar. Não precisa de faturamento/Blaze — é só uma permissão de IAM.
7. **O projeto Apps Script precisa estar vinculado ao projeto padrão do Google Cloud `portal-limiar-api`** (não ao projeto GCP auto-criado que o Apps Script usa por padrão) — Project Settings (⚙) → "Google Cloud Platform (GCP) Project" → Change project → número do projeto (`gcloud projects describe portal-limiar-api` ou Cloud Console → Configurações do projeto). Sem isso, `identitytoolkit`/`drive`/`documents` não têm como ser habilitadas num projeto que ninguém administra de verdade (o auto-criado). Trocar o projeto pode exigir configurar a **tela de consentimento OAuth** primeiro (APIs & Services → OAuth consent screen → External → preencher nome/e-mails → Save; adicionar a conta que vai autorizar como **Test user**, já que fica em modo Testing).
8. **Habilitar, no projeto `portal-limiar-api`, cada API que os serviços nativos do Apps Script usam** — um projeto GCP padrão (diferente do auto-criado) não vem com nada pré-habilitado: [Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com), [Docs API](https://console.cloud.google.com/apis/library/docs.googleapis.com), [Identity Toolkit API](https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com) (todas com `?project=<número>` na URL). Sem isso, toda operação que usa `DriveApp`/`DocumentApp`/a chamada de `users.remover` falha com "Permissão negada ao ativar APIs" ou similar — inclusive `images.saveDataUrl`/`rdos.gerarPdf`, que não têm nada a ver com o recurso novo.

> ⚠️ **`executeAs: USER_DEPLOYING`** (`appsscript.json`) significa que o Web App roda com a identidade de **quem criou a versão do deployment por último** — não de quem só editou/`clasp push`ou o código. Isso inclui todo `DriveApp`/`DocumentApp` (upload de imagem, PDF, `archive.mover` usam o Drive de quem deployou) e precisa que ESSA conta já tenha passado pelo passo 4 (autorização) pelo menos uma vez. Deploys devem sempre ser feitos pela conta que já é dona/administradora do Drive de produção (hoje, a da irmã do André) — nunca por uma conta que só tem acesso de editor ao script (rodar `clasp deploy` de outra conta muda silenciosamente qual Drive/identidade toda operação usa dali em diante, e quebra tudo se essa conta nunca autorizou os escopos).

## Fluxo do dia a dia

Edite os arquivos em `src/`, depois:
```
clasp push
clasp deploy -i <deploymentId>
```
**Os dois comandos são necessários** — o deployment usado pela URL `/exec` ao vivo é *versionado*, não HEAD; `clasp push` só atualiza o conteúdo que aparece no editor, `clasp deploy -i` é o que de fato publica uma nova versão pra URL em produção. Pra descobrir o `deploymentId` atual: `clasp deployments`.

`clasp push` pode ser feito por qualquer editor do projeto, de qualquer conta — só atualiza o conteúdo, não afeta quem executa nada. **`clasp deploy -i` (ou "Nova versão" no editor) só deve ser feito pela conta dona do Drive de produção** (ver aviso na seção de setup) — se outra conta editora rodar, o próximo passo (deploy de verdade, feito pela conta certa) desfaz isso.

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

Operações, espelhando `Db.js`:
- `images.saveDataUrl(dataUrl, projectId, kind, extra?)` — `kind` é `"capa"`, `"rdo-foto"` (com `extra:{n,index}`) ou `"lancamento-foto"` (comprovante de um gasto do financeiro)
- `images.remove(fileId)`
- `rdos.gerarPdf(projectNome, relatorio)` — `relatorio` já no formato de banco (o cliente já leu isso do Firestore), gera/substitui o PDF em `rdoPdfs/<projectId>/relatorio-<n>.pdf`
- `archive.mover(projectId, nomeProjeto)` — junta `images/<id>/` e `rdoPdfs/<id>/` dentro de `archive/<id> - <nome>/`, parte do fluxo de arquivar projeto
- `users.remover(uid)` — apaga de vez a conta do Firebase Auth de `uid`. **Só o administrador pode chamar** (verificado contra a Script Property `ADMIN_UID`, comparando com o uid de quem chamou — que `doPost` já verificou e passa como último argumento pra QUALQUER op, automaticamente; não faz parte do `args` que o cliente manda). Qualquer outro chamador (mesmo autenticado) recebe erro.
