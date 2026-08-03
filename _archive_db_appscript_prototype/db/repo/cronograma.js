/* =================== CRONOGRAMA ===================
   Um documento por projeto: a lista de etapas do cronograma, cada uma com
   início/término (ISO) e avanço (%). Espelha cronogramas[pid] de js/data.js —
   igual lá, a lista começa vazia: só etapas com uso real entram aqui, as
   demais ficam só no catálogo (db/repo/catalog.js) até serem adicionadas. */
const path = require('path');
const {readJson, writeJson} = require('../lib/jsonFile');

const fileFor = projectId => path.join(__dirname, '..', 'data', 'cronogramas', String(projectId)+'.json');
const dataChave = iso => iso; // "AAAA-MM-DD" já ordena certo como string

function listar(projectId){ return readJson(fileFor(projectId), []); }
function salvar(projectId, etapas){ writeJson(fileFor(projectId), etapas); return etapas; }

function adicionar(projectId, {nome, ini, fim, av, dur}){
  const lista = listar(projectId);
  const numeros = lista.map(e=>+String(e.id).replace(/\D/g,'')).filter(n=>!isNaN(n));
  const id = 't'+(numeros.length ? Math.max(...numeros)+1 : 1);
  const nova = {id, nome, ini, fim, av: av ?? 0, dur};
  lista.push(nova);
  lista.sort((a,b)=>dataChave(a.ini)<dataChave(b.ini)?-1:1);
  salvar(projectId, lista);
  return nova;
}
function atualizar(projectId, etapaId, patch){
  const lista = listar(projectId);
  const item = lista.find(e=>e.id===etapaId);
  if(!item) throw new Error('Etapa não encontrada: '+etapaId);
  Object.assign(item, patch);
  lista.sort((a,b)=>dataChave(a.ini)<dataChave(b.ini)?-1:1);
  salvar(projectId, lista);
  return item;
}
function remover(projectId, etapaId){
  salvar(projectId, listar(projectId).filter(e=>e.id!==etapaId));
}

module.exports = {listar, salvar, adicionar, atualizar, remover};
