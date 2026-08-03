/* =================== FINANCEIRO ===================
   Um documento por projeto: {etapaNome: [{nome, prev, lanc:[{data,desc,valor}]}]}.
   Espelha financeiro[pid] de js/data.js — fica aninhado assim (em vez de
   "achatado" em tabelas separadas) de propósito: isso é um banco de documentos,
   não uma planilha, então documento aninhado é o formato natural aqui (o
   achatamento em linhas só faria sentido se o destino fosse o Google Sheets). */
const path = require('path');
const {readJson, writeJson} = require('../lib/jsonFile');

const fileFor = projectId => path.join(__dirname, '..', 'data', 'financeiro', String(projectId)+'.json');

function tudo(projectId){ return readJson(fileFor(projectId), {}); }
function porEtapa(projectId, etapa){ return tudo(projectId)[etapa] || []; }
function salvarTudo(projectId, doc){ writeJson(fileFor(projectId), doc); return doc; }

const realizado = categoria => (categoria.lanc||[]).reduce((a,l)=>a+l.valor, 0);

function totalPrevisto(projectId, etapa){ return porEtapa(projectId, etapa).reduce((a,c)=>a+c.prev, 0); }
function totalRealizado(projectId, etapa){ return porEtapa(projectId, etapa).reduce((a,c)=>a+realizado(c), 0); }

function adicionarCategoria(projectId, etapa, {nome, prev}){
  const doc = tudo(projectId);
  if(!doc[etapa]) doc[etapa] = [];
  const nova = {nome, prev, lanc:[]};
  doc[etapa].push(nova);
  salvarTudo(projectId, doc);
  return nova;
}
function atualizarOrcamento(projectId, etapa, categoriaNome, novoPrev){
  const doc = tudo(projectId);
  const cat = (doc[etapa]||[]).find(c=>c.nome===categoriaNome);
  if(!cat) throw new Error(`Categoria "${categoriaNome}" não encontrada em ${etapa}.`);
  cat.prev = novoPrev;
  salvarTudo(projectId, doc);
  return cat;
}
function lancarGasto(projectId, etapa, categoriaNome, {data, desc, valor}){
  const doc = tudo(projectId);
  const cat = (doc[etapa]||[]).find(c=>c.nome===categoriaNome);
  if(!cat) throw new Error(`Categoria "${categoriaNome}" não encontrada em ${etapa}.`);
  cat.lanc.push({data, desc, valor});
  salvarTudo(projectId, doc);
  return cat;
}
function removerLancamento(projectId, etapa, categoriaNome, indice){
  const doc = tudo(projectId);
  const cat = (doc[etapa]||[]).find(c=>c.nome===categoriaNome);
  if(!cat) throw new Error(`Categoria "${categoriaNome}" não encontrada em ${etapa}.`);
  cat.lanc.splice(indice, 1);
  salvarTudo(projectId, doc);
  return cat;
}
function removerCategoria(projectId, etapa, categoriaNome){
  const doc = tudo(projectId);
  doc[etapa] = (doc[etapa]||[]).filter(c=>c.nome!==categoriaNome);
  salvarTudo(projectId, doc);
}

module.exports = {
  tudo, porEtapa, salvarTudo, realizado,
  totalPrevisto, totalRealizado,
  adicionarCategoria, atualizarOrcamento, lancarGasto, removerLancamento, removerCategoria,
};
