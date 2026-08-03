/* =================== RELATÓRIOS SEMANAIS (RDO) ===================
   Um arquivo por relatório, agrupados numa pasta por projeto — diferente do
   financeiro/cronograma (um documento por projeto), porque cada RDO é lançado
   e editado como uma unidade própria, então não precisa reler/regravar os
   outros relatórios do projeto a cada alteração. Fotos guardam "caminho"
   (arquivo de verdade em db/images/, ver db/lib/images.js) OU "emoji" (só pros
   relatórios de exemplo antigos que nunca tiveram uma imagem enviada de
   verdade) — o mesmo par que normalizeFoto()/fotoTileBody() já tratam em
   js/helpers.js. */
const fs = require('fs');
const path = require('path');
const {readJson, writeJson, deleteFile} = require('../lib/jsonFile');

const dirFor = projectId => path.join(__dirname, '..', 'data', 'rdos', String(projectId));
const fileFor = (projectId, n) => path.join(dirFor(projectId), n+'.json');

function listar(projectId){
  let arquivos;
  try{ arquivos = fs.readdirSync(dirFor(projectId)); }
  catch(e){ if(e.code==='ENOENT') return []; throw e; }
  return arquivos.filter(f=>f.endsWith('.json'))
    .map(f=>readJson(path.join(dirFor(projectId), f)))
    .filter(Boolean)
    .sort((a,b)=>b.n-a.n); // mais recente primeiro, igual ao rdos[pid].unshift() do site
}
function buscar(projectId, n){ return readJson(fileFor(projectId, n), null); }
function proximoNumero(projectId){
  const numeros = listar(projectId).map(r=>r.n);
  return numeros.length ? Math.max(...numeros)+1 : 1;
}
// salvar cobre tanto criar (n novo) quanto editar (n existente) — igual ao
// saveRDO() do site, que faz push/unshift ou Object.assign dependendo do caso
function salvar(projectId, relatorio){
  if(!relatorio.n) throw new Error('Relatório precisa de um número (n) — use proximoNumero() para um novo.');
  const doc = {...relatorio, projectId};
  writeJson(fileFor(projectId, doc.n), doc);
  return doc;
}
function remover(projectId, n){ deleteFile(fileFor(projectId, n)); }

module.exports = {listar, buscar, proximoNumero, salvar, remover};
