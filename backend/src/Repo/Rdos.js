/* =================== RELATÓRIOS SEMANAIS (RDO) ===================
   Um arquivo por relatório, numa subpasta por projeto — diferente do
   financeiro/cronograma (um documento por projeto), porque cada RDO é
   lançado e editado como uma unidade própria. Fotos guardam "fileId" (arquivo
   de verdade no Drive, ver Lib/Images.js) OU "emoji"/"legenda" (só pros
   relatórios de exemplo antigos sem imagem de verdade) — o mesmo par que
   normalizeFoto()/fotoTileBody() já tratam em js/helpers.js. Uploads de foto
   acontecem à parte, via LibImages.saveDataUrl, ANTES de salvar() — o
   relatório só guarda a referência (fileId) devolvida por esse upload. */
var RepoRdos = {
  listar(projectId){
    const folder = LibFolders.getProjectSubfolder('rdos', projectId);
    return LibDriveStore.listJsonFiles(folder)
      .map(function(f){ try{ return JSON.parse(f.getBlob().getDataAsString()); }catch(e){ return null; } })
      .filter(Boolean)
      .sort(function(a,b){ return b.n-a.n; }); // mais recente primeiro
  },
  buscar(projectId, n){
    return LibDriveStore.readJson(LibFolders.getProjectSubfolder('rdos', projectId), n+'.json', null);
  },
  proximoNumero(projectId){
    const numeros = RepoRdos.listar(projectId).map(function(r){ return r.n; });
    return numeros.length ? Math.max.apply(null, numeros)+1 : 1;
  },
  // cobre tanto criar (n novo) quanto editar (n existente)
  salvar(projectId, relatorio){
    if(!relatorio.n) throw new Error('Relatório precisa de um número (n) — use proximoNumero() para um novo.');
    const doc = Object.assign({}, relatorio, {projectId:projectId});
    LibDriveStore.writeJson(LibFolders.getProjectSubfolder('rdos', projectId), doc.n+'.json', doc);
    return doc;
  },
  remover(projectId, n){
    LibDriveStore.deleteFile(LibFolders.getProjectSubfolder('rdos', projectId), n+'.json');
  },
};
