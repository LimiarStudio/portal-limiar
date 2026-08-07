/* =================== PASTAS DO DRIVE ===================
   O Drive não tem "caminhos" de verdade — só pastas com pais e filhos, e
   nomes não são únicos. Este módulo resolve (ou cria, se ainda não existir) a
   pasta certa pra cada coleção/projeto, e guarda o ID resolvido em
   PropertiesService pra não escanear o Drive de novo a cada chamada.

   Layout dentro de ROOT_FOLDER_ID (Script Property, configurada uma vez —
   nunca adivinhada por nome dentro do "Meu Drive" inteiro, o que seria
   ambíguo e frágil) — aponta pro MESMO Drive real usado pelo backend
   original, então os fileIds de fotos/PDFs já migrados continuam resolvendo:
     rdoPdfs/<projectId>/relatorio-<n>.pdf, images/<projectId>/...

   Fase 5: getArchiveFolder() foi removida — o fluxo de arquivar projeto
   agora é orquestrado inteiramente pelo cliente direto no Firestore (ver
   plano, Fase 10); imagens/PDFs simplesmente continuam onde já estão no
   Drive pra sempre, não tem mais uma pasta "archive/" separada. */
var LibFolders = {
  getRootFolder(){
    const id = PropertiesService.getScriptProperties().getProperty('ROOT_FOLDER_ID');
    if(!id) throw new Error('Script Property "ROOT_FOLDER_ID" não configurada.');
    try{ return DriveApp.getFolderById(id); }
    catch(e){ throw new Error('ROOT_FOLDER_ID aponta pra uma pasta inacessível ou apagada.'); }
  },
  getOrCreateChild(parentFolder, name){
    const it = parentFolder.getFoldersByName(name);
    if(it.hasNext()){
      const first = it.next();
      if(it.hasNext()) console.warn('Mais de uma pasta "'+name+'" dentro de "'+parentFolder.getName()+'" — usando a primeira.');
      return first;
    }
    return parentFolder.createFolder(name);
  },
  getDataSubfolder(name){
    return resolveCached_('folder:data:'+name, function(){
      return LibFolders.getOrCreateChild(LibFolders.getRootFolder(), name);
    });
  },
  getProjectSubfolder(topName, projectId){
    return resolveCached_('folder:proj:'+topName+':'+projectId, function(){
      return LibFolders.getOrCreateChild(LibFolders.getDataSubfolder(topName), String(projectId));
    });
  },
  getRdoPhotosSubfolder(projectId, n){
    return resolveCached_('folder:rdoPhotos:'+projectId+':'+n, function(){
      const imagesProjeto = LibFolders.getProjectSubfolder('images', projectId);
      const rdosFolder = LibFolders.getOrCreateChild(imagesProjeto, 'rdos');
      return LibFolders.getOrCreateChild(rdosFolder, String(n));
    });
  },
  invalidate(cacheKey){
    PropertiesService.getScriptProperties().deleteProperty(cacheKey);
  },
  clearCache(){
    const props = PropertiesService.getScriptProperties();
    const all = props.getProperties();
    Object.keys(all).forEach(function(k){ if(k.indexOf('folder:')===0) props.deleteProperty(k); });
  },
};

// resolve uma pasta usando o cache em Script Properties; se o ID guardado não
// existir mais (pasta apagada/movida fora do sistema), reresolve e recacheia
function resolveCached_(cacheKey, resolver){
  const props = PropertiesService.getScriptProperties();
  const cachedId = props.getProperty(cacheKey);
  if(cachedId){
    try{ return DriveApp.getFolderById(cachedId); }
    catch(e){ props.deleteProperty(cacheKey); }
  }
  const folder = resolver();
  props.setProperty(cacheKey, folder.getId());
  return folder;
}
