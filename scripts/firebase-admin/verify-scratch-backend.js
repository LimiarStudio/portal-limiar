/* Testa o backend Apps Script "enxuto" (Fase 5, projeto scratch) contra um
   idToken real do Firebase Auth — confirma que os 3 únicos ops que sobraram
   (images.saveDataUrl, images.remove, rdos.gerarPdf) funcionam fim-a-fim, e
   que um token inválido/ausente é rejeitado. Roda contra o projeto scratch
   (nunca o real), que aponta pro mesmo Drive real via ROOT_FOLDER_ID, mas só
   cria/apaga arquivos de teste próprios.

   Rodar: SCRATCH_URL=https://script.google.com/macros/s/.../exec node verify-scratch-backend.js
   (ou edite o fallback abaixo enquanto o deployment scratch não tem URL fixa) */
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');

const keyFile = fs.readdirSync(path.join(__dirname, '..', '..', 'key')).find(f => f.endsWith('.json'));
const serviceAccount = require(path.join(__dirname, '..', '..', 'key', keyFile));
const FIREBASE_API_KEY = 'AIzaSyBcnud0ZuzNt066KQa9OUtlc1a7KozjTOc'; // apiKey público, não é segredo
const SCRATCH_URL = process.env.SCRATCH_URL || 'https://script.google.com/macros/s/AKfycbzOTXNNfoFSHBl63ZC_6MhKf8p-LgIkDJfZ4y2h6DObA1GsLjmH3LNmbITqcKmQtLaBzA/exec';
const PIXEL_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();

let results = [];
function check(nome, ok, detalhe){ results.push({nome, ok}); console.log((ok?'OK  ':'FAIL')+' - '+nome+(detalhe?' ('+detalhe+')':'')); }

async function call(idToken, collection, op, args){
  const res = await fetch(SCRATCH_URL, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=utf-8'}, // evita preflight CORS, mesmo truque do front-end
    body: JSON.stringify({collection, op, args, idToken}),
    redirect: 'follow',
  });
  const text = await res.text();
  try{ return JSON.parse(text); }
  catch(e){ throw new Error('resposta não-JSON (provável tela de erro do Apps Script): '+text.slice(0,300)); }
}

async function main(){
  console.log('SCRATCH_URL:', SCRATCH_URL);
  const email = 'teste-scratch-backend@example.com', senha = 'senhaTeste123';
  let user;
  try{ user = await auth.getUserByEmail(email); }catch(e){ user = await auth.createUser({email, password: senha}); }

  const customToken = await auth.createCustomToken(user.uid);
  const exchangeRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({token: customToken, returnSecureToken: true}),
  });
  const idToken = (await exchangeRes.json()).idToken;
  if(!idToken) throw new Error('não consegui trocar custom token por idToken');

  // 1) token inválido é rejeitado
  let r = await call('token-garbage-invalido', 'images', 'saveDataUrl', [PIXEL_PNG, 'scratch-teste', 'capa', {}]);
  check('token inválido é rejeitado', r.ok === false && /autenticado/i.test(r.error||''), r.error);

  // 2) token ausente é rejeitado
  r = await call(undefined, 'images', 'saveDataUrl', [PIXEL_PNG, 'scratch-teste', 'capa', {}]);
  check('token ausente é rejeitado', r.ok === false, r.error);

  // 3) token válido consegue subir imagem
  r = await call(idToken, 'images', 'saveDataUrl', [PIXEL_PNG, 'scratch-teste', 'capa', {}]);
  check('upload de imagem com token válido', r.ok === true && !!(r.data && r.data.fileId), JSON.stringify(r));
  const fileId = r.ok && r.data && r.data.fileId;

  // 4) URL da imagem enviada carrega de verdade (mesmo formato lh3 usado no site)
  if(fileId){
    const imgRes = await fetch(`https://lh3.googleusercontent.com/d/${fileId}`);
    check('URL da imagem enviada carrega (200)', imgRes.status === 200, 'status '+imgRes.status);
  }

  // 5) gerarPdf com uma foto de verdade (fileId) + uma foto legado (emoji, sem fileId) + rich text
  const relatorio = {
    n: 9999, projectId: 'scratch-teste', semanaInicio: '2026-01-01', semanaFim: '2026-01-07', resp: 'Teste Fase 5',
    mo: [{funcao:'Pedreiro', qtd:2}], eq: [{equipamento:'Betoneira', qtd:1}],
    atividades: [{texto:'**Concretagem** da laje\n- item um\n- item dois', etapa:'Fundação', avanco:10}],
    ocorrencias: 'Nenhuma ocorrência relevante.',
    fotos: [{fileId, legenda:'Foto de teste (fileId real)'}, {emoji:'🧱', legenda:'Foto legado (sem arquivo)'}],
  };
  r = await call(idToken, 'rdos', 'gerarPdf', ['Projeto Teste Fase 5', relatorio]);
  check('gerarPdf com token válido produz um PDF', r.ok === true && !!(r.data && r.data.fileId), JSON.stringify(r));
  const pdfUrl = r.ok && r.data && r.data.url;
  const pdfName = r.ok && r.data && r.data.name;
  if(pdfUrl){
    const pdfRes = await fetch(pdfUrl, {redirect:'follow'});
    check('PDF gerado é acessível (200)', pdfRes.status === 200, 'status '+pdfRes.status);
  }

  // 6) regenerar o mesmo relatório substitui o PDF anterior (mesmo nome), não duplica
  const r2 = await call(idToken, 'rdos', 'gerarPdf', ['Projeto Teste Fase 5', relatorio]);
  check('regenerar PDF substitui (mesmo nome de arquivo)', r2.ok === true && r2.data && r2.data.name === pdfName, JSON.stringify(r2));

  // 7) relatório sem "n" é rejeitado com erro claro (não uma exceção crua)
  r = await call(idToken, 'rdos', 'gerarPdf', ['Projeto Teste', {projectId:'scratch-teste'}]);
  check('gerarPdf sem "n" dá erro claro', r.ok === false && /"n"/.test(r.error||''), r.error);

  // 8) images.remove aceita o arquivo enviado
  if(fileId){
    r = await call(idToken, 'images', 'remove', [fileId]);
    check('images.remove aceita token válido', r.ok === true, JSON.stringify(r));
  }

  // cleanup: usuário de teste apagado; arquivos de Drive só vão pra lixeira
  // (setTrashed, nunca exclusão definitiva) — sobrevivem lá se algo falhar
  await auth.deleteUser(user.uid);

  const falhas = results.filter(x => !x.ok);
  console.log(`\n${results.length - falhas.length}/${results.length} passaram.`);
  if(falhas.length) process.exit(1);
}

main().catch(e => { console.error('ERRO:', e); process.exit(1); });
