/* =================== PROJETOS ===================
   Campos alinhados com o que o site realmente usa hoje (js/data.js, render.js,
   projetos-page.js) — os campos "status"/"prazo"/"cat"/"orcado"/"gasto" que
   existiam no mock antigo nunca eram lidos em lugar nenhum do código, então
   não entraram aqui: orçado/gasto de verdade vêm sempre do módulo Financeiro.
   Datas ficam em ISO ("AAAA-MM-DD"), não no formato BR exibido na tela — a
   conversão de exibição é responsabilidade de quem consome este banco. */
const path = require('path');
const {collection} = require('../lib/collection');

const projects = collection(path.join(__dirname, '..', 'data', 'projects'));

function listar(){ return projects.list(); }
function buscar(id){ return projects.get(id); }

function criar({nome, cliente, endereco, resp, inicio, termino, avanco, icon, imagem, tipo}){
  if(!nome || !cliente || !endereco || !resp) throw new Error('Informe nome, cliente, responsável e endereço.');
  if(!inicio || !termino) throw new Error('Informe as datas de início e término.');
  if(tipo!=='completo' && tipo!=='relatorios') throw new Error('tipo deve ser "completo" ou "relatorios".');
  return projects.create({
    nome, cliente, endereco, resp, inicio, termino,
    avanco: avanco ?? 0,
    icon: icon || '🏗️',
    imagem: imagem || null,
    tipo,
    criadoEm: new Date().toISOString(),
  });
}
function atualizar(id, patch){ return projects.update(id, patch); }
function remover(id){ projects.remove(id); }

module.exports = {listar, buscar, criar, atualizar, remover};
