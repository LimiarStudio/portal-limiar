/* =================== ARQUIVAMENTO: ORGANIZAÇÃO NO DRIVE ===================
   O Firestore não sabe nada sobre pastas do Drive — quem decide "isso é de
   um projeto arquivado" é só a estrutura de pastas em si. Sem isso, a pasta
   de fotos/PDFs de um projeto arquivado ficava misturada com as dos projetos
   ativos dentro de images/ e rdoPdfs/, sem nenhuma pista visual de que aquele
   projeto já foi encerrado — só um número de pasta, sem nome nem contexto.

   mover() junta os dois (images/<id>/ e rdoPdfs/<id>/) dentro de uma pasta
   só, archive/<id> - <nome>/, do mesmo jeito que o sistema anterior (pré-
   Firebase) organizava — só que adaptado pra estrutura atual, que tem
   images/ e rdoPdfs/ como árvores separadas em vez de uma pasta por projeto
   só. Projeto sem fotos e sem PDF nenhum (raro, mas possível) não tem pasta
   nenhuma pra mover — não é erro, só não há nada a fazer. */
var RepoArquivo = {
  mover(projectId, nomeProjeto){
    const destino = LibFolders.getOrCreateChild(LibFolders.getDataSubfolder('archive'), projectId+' - '+nomeProjeto);
    moverSeExistir_('images', projectId, destino, 'images');
    moverSeExistir_('rdoPdfs', projectId, destino, 'rdoPdfs');
    return {ok:true};
  },
};

function moverSeExistir_(topName, projectId, pastaDestinoDoProjeto, novoNome){
  const origemPai = LibFolders.getDataSubfolder(topName);
  const it = origemPai.getFoldersByName(String(projectId));
  if(!it.hasNext()) return; // nada pra mover — projeto nunca teve fotos/PDF nesta categoria
  const pastaProjeto = it.next();
  pastaProjeto.setName(novoNome);
  moverPasta_(pastaProjeto, pastaDestinoDoProjeto);
  LibFolders.invalidate('folder:proj:'+topName+':'+projectId);
}

// "mover" no Drive é sempre adicionar o novo pai e remover os antigos — não
// existe um "moveTo" de verdade na API base, um arquivo/pasta pode ter mais
// de um pai ao mesmo tempo, então trocar de pai é literalmente isso
function moverPasta_(pasta, novoPai){
  novoPai.addFolder(pasta);
  const pais = pasta.getParents();
  while(pais.hasNext()){
    const pai = pais.next();
    if(pai.getId()!==novoPai.getId()) pai.removeFolder(pasta);
  }
}
