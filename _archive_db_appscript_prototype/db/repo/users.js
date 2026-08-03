/* =================== USUÁRIOS ===================
   "papel" aqui usa o mesmo vocabulário já usado no site (ROLE 'gestor'/'cliente'
   em session.js): 'gestor' = acesso total, inclusive às páginas de admin de um
   projeto; 'cliente' = acesso definido módulo a módulo, projeto a projeto (ver
   db/repo/permissions.js). Não é a mesma coisa que autenticação: este protótipo
   ainda não tem login de verdade, então não guardamos senha nem sessão aqui. */
const path = require('path');
const {collection} = require('../lib/collection');

const users = collection(path.join(__dirname, '..', 'data', 'users'));

function listar(){ return users.list(); }
function buscar(id){ return users.get(id); }
function buscarPorEmail(email){
  const alvo = email.trim().toLowerCase();
  return users.list().find(u=>u.email.toLowerCase()===alvo) || null;
}
function criar({nome, email, papel}){
  if(!nome || !email) throw new Error('Informe nome e e-mail.');
  if(papel!=='gestor' && papel!=='cliente') throw new Error('papel deve ser "gestor" ou "cliente".');
  if(buscarPorEmail(email)) throw new Error(`Já existe um usuário com o e-mail ${email}.`);
  return users.create({nome, email, papel, criadoEm: new Date().toISOString()});
}
function atualizar(id, patch){ return users.update(id, patch); }
function remover(id){ users.remove(id); }

module.exports = {listar, buscar, buscarPorEmail, criar, atualizar, remover};
