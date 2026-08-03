/* =================== CATÁLOGO DE ETAPAS E CATEGORIAS ===================
   Espelha etapasPadrao(pid)/categoriasPadrao(pid) de js/data.js: um catálogo de
   fábrica fixo (mesmo para todo projeto novo) + uma sobreposição por projeto
   (etapas/categorias adicionadas ou removidas só ali, e relações etapa↔categoria
   reatribuídas em Configurações). "todasEtapas: true" numa categoria de fábrica
   (caso de "Ajudante"/"Mestre de Obras") substitui o truque de igualdade de
   referência de array que o código do site usa hoje — JSON não tem esse conceito,
   então aqui isso vira uma flag explícita. */
const path = require('path');
const {readJson, writeJson} = require('../lib/jsonFile');

const ETAPAS_FACTORY_FILE = path.join(__dirname, '..', 'data', 'catalogDefaults', 'etapas.json');
const CATEGORIAS_FACTORY_FILE = path.join(__dirname, '..', 'data', 'catalogDefaults', 'categorias.json');
const overridesFile = projectId => path.join(__dirname, '..', 'data', 'projectCatalog', String(projectId)+'.json');

function etapasFactory(){ return readJson(ETAPAS_FACTORY_FILE, []); }
function categoriasFactory(){ return readJson(CATEGORIAS_FACTORY_FILE, []); }

function overridesVazios(projectId){
  return {projectId, removedEtapas:[], customEtapas:[], removedCategorias:[], customCategorias:[], categoriaEtapaOverrides:{}};
}
function overrides(projectId){
  return readJson(overridesFile(projectId), overridesVazios(projectId));
}
function salvarOverrides(projectId, doc){
  writeJson(overridesFile(projectId), doc);
  return doc;
}

function etapasDoProjeto(projectId){
  const o = overrides(projectId);
  return etapasFactory().filter(e=>!o.removedEtapas.includes(e)).concat(o.customEtapas);
}
function categoriasDoProjeto(projectId){
  const etapas = etapasDoProjeto(projectId);
  const o = overrides(projectId);
  const lista = categoriasFactory()
    .filter(c=>!o.removedCategorias.includes(c.nome))
    .map(c=>({nome:c.nome, etapas: c.todasEtapas ? etapas.slice() : c.etapas.slice()}))
    .concat(o.customCategorias.map(c=>({nome:c.nome, etapas:c.etapas.slice()})));
  lista.forEach(c=>{ if(o.categoriaEtapaOverrides[c.nome]) c.etapas = o.categoriaEtapaOverrides[c.nome].slice(); });
  return lista;
}

function adicionarEtapa(projectId, nome){
  const o = overrides(projectId);
  o.removedEtapas = o.removedEtapas.filter(e=>e!==nome);
  // só entra em customEtapas se não for uma etapa de fábrica — "adicionar" uma que
  // só estava removida é apenas desfazer a remoção acima, não duplicar a entrada
  if(!etapasFactory().includes(nome) && !o.customEtapas.includes(nome)) o.customEtapas.push(nome);
  return salvarOverrides(projectId, o);
}
function removerEtapa(projectId, nome){
  const o = overrides(projectId);
  if(etapasFactory().includes(nome) && !o.removedEtapas.includes(nome)) o.removedEtapas.push(nome);
  o.customEtapas = o.customEtapas.filter(e=>e!==nome);
  return salvarOverrides(projectId, o);
}
function adicionarCategoria(projectId, {nome, etapas}){
  const o = overrides(projectId);
  o.removedCategorias = o.removedCategorias.filter(c=>c!==nome);
  // mesma lógica de adicionarEtapa: uma categoria de fábrica só reaparece (linha
  // acima) — vira customCategoria de verdade só se o nome não existir na fábrica
  if(!categoriasFactory().some(c=>c.nome===nome)){
    o.customCategorias = o.customCategorias.filter(c=>c.nome!==nome).concat([{nome, etapas}]);
  }
  return salvarOverrides(projectId, o);
}
function removerCategoria(projectId, nome){
  const o = overrides(projectId);
  if(categoriasFactory().some(c=>c.nome===nome) && !o.removedCategorias.includes(nome)) o.removedCategorias.push(nome);
  o.customCategorias = o.customCategorias.filter(c=>c.nome!==nome);
  return salvarOverrides(projectId, o);
}
function definirEtapasDaCategoria(projectId, categoriaNome, etapas){
  const o = overrides(projectId);
  o.categoriaEtapaOverrides[categoriaNome] = etapas;
  return salvarOverrides(projectId, o);
}

module.exports = {
  etapasFactory, categoriasFactory, overrides, salvarOverrides,
  etapasDoProjeto, categoriasDoProjeto,
  adicionarEtapa, removerEtapa, adicionarCategoria, removerCategoria, definirEtapasDaCategoria,
};
