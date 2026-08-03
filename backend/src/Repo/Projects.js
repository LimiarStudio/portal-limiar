/* =================== PROJETOS ===================
   Campos alinhados com o que o site realmente usa (js/data.js, render.js,
   projetos-page.js) — confirmado por busca no código: "orcado"/"gasto" não
   são lidos em lugar nenhum, então não entram aqui — orçado/gasto de verdade
   vêm sempre do módulo Financeiro. Datas ficam em ISO ("AAAA-MM-DD"), não no
   formato BR exibido na tela — a conversão fica por conta de quem consome
   este banco (a próxima fase, de ligar o site a esta API). */
var RepoProjects = {
  listar(){ return LibCollection.list('projects'); },
  buscar(id){ return LibCollection.get('projects', id); },
  criar(dados){
    const nome=dados.nome, cliente=dados.cliente, endereco=dados.endereco, resp=dados.resp,
          inicio=dados.inicio, termino=dados.termino, avanco=dados.avanco,
          icon=dados.icon, imagem=dados.imagem, tipo=dados.tipo;
    if(!nome || !cliente || !endereco || !resp) throw new Error('Informe nome, cliente, responsável e endereço.');
    if(!inicio || !termino) throw new Error('Informe as datas de início e término.');
    if(tipo!=='completo' && tipo!=='relatorios') throw new Error('tipo deve ser "completo" ou "relatorios".');
    return LibCollection.create('projects', {
      nome:nome, cliente:cliente, endereco:endereco, resp:resp, inicio:inicio, termino:termino,
      avanco: avanco===undefined ? 0 : avanco,
      icon: icon || '🏗️',
      imagem: imagem || null,
      tipo:tipo,
      criadoEm: new Date().toISOString(),
    });
  },
  atualizar(id, patch){ return LibCollection.update('projects', id, patch); },
  // primitivo de baixo nível — sem dados associados (cronograma/financeiro/rdos),
  // útil só pra apagar um projeto criado por engano. O único jeito sancionado
  // de encerrar um projeto COM dados é Repo/Archive.js#arquivarProjeto, que
  // garante que os relatórios virem PDF antes de qualquer coisa ser perdida.
  remover(id){ LibCollection.remove('projects', id); },
};
