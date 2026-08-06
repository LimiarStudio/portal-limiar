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
  // apaga o projeto E os dados associados (cronograma/financeiro/rdos/etc) —
  // sem PDF nenhum, ao contrário de Repo/Archive.js#arquivarProjeto, que é o
  // jeito sancionado de encerrar um projeto com histórico que vale preservar.
  // Precisa mesmo limpar tudo aqui: como o próximo projeto criado reaproveita
  // o menor id numérico livre (LibCollection#nextNumericId), um id removido
  // sem essa limpeza fica "armadilhado" — o próximo projeto que nascer com
  // esse mesmo id herda relatórios/cronograma de outro projeto que nunca foi
  // dele. Foi exatamente esse bug que apareceu como "criei um projeto e já
  // tinha um relatório" — chamadas diretas à API (nunca a interface, que só
  // oferece arquivar) que usavam a versão antiga desta função deixaram esse
  // lixo pra trás.
  remover(id){ LibCollection.remove('projects', id); apagarDadosDoProjeto_(id); },
};

function apagarDadosDoProjeto_(projectId){
  const id = String(projectId);
  ['cronogramas','financeiro','projectPermissions','projectCatalog'].forEach(function(nome){
    LibDriveStore.deleteFile(LibFolders.getDataSubfolder(nome), id+'.json');
  });
  ['rdos','rdoPdfs','images'].forEach(function(nome){
    const pai = LibFolders.getDataSubfolder(nome);
    const subs = pai.getFoldersByName(id);
    while(subs.hasNext()) subs.next().setTrashed(true);
    LibFolders.invalidate('folder:proj:'+nome+':'+id);
  });
}
