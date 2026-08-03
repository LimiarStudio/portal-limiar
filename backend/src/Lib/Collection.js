/* =================== COLLECTION (documento por arquivo) ===================
   Uma "collection" é uma pasta do Drive onde cada documento é o seu próprio
   arquivo <id>.json. Substitui o db/lib/collection.js do protótipo em Node —
   mesma ideia, mas toda função recebe o NOME da pasta de dados (não uma pasta
   já aberta), resolvida a cada chamada via LibFolders.getDataSubfolder, já
   que aqui não existe um "require" que rode uma vez só na inicialização. */
var LibCollection = {
  list(folderName){
    const folder = LibFolders.getDataSubfolder(folderName);
    return LibDriveStore.listJsonFiles(folder)
      .map(f=>{ try{ return JSON.parse(f.getBlob().getDataAsString()); }catch(e){ return null; } })
      .filter(Boolean);
  },
  get(folderName, id){
    return LibDriveStore.readJson(LibFolders.getDataSubfolder(folderName), id+'.json', null);
  },
  // sem "id" explícito, gera o próximo id numérico livre (maior id atual + 1)
  create(folderName, doc, id){
    const finalId = id!==undefined ? id : LibCollection.nextNumericId(folderName);
    const withId = Object.assign({}, doc, {id: finalId});
    LibDriveStore.writeJson(LibFolders.getDataSubfolder(folderName), finalId+'.json', withId);
    return withId;
  },
  update(folderName, id, patch){
    const atual = LibCollection.get(folderName, id);
    if(!atual) throw new Error('Documento "'+id+'" não existe em '+folderName);
    const atualizado = Object.assign({}, atual, patch, {id: atual.id});
    LibDriveStore.writeJson(LibFolders.getDataSubfolder(folderName), id+'.json', atualizado);
    return atualizado;
  },
  remove(folderName, id){
    LibDriveStore.deleteFile(LibFolders.getDataSubfolder(folderName), id+'.json');
  },
  // lê só os NOMES dos arquivos (não o conteúdo inteiro) pra achar o maior id —
  // evita N leituras completas via rede a cada criação, diferente da versão em
  // Node (onde list() local em disco já era barato o suficiente)
  nextNumericId(folderName){
    const folder = LibFolders.getDataSubfolder(folderName);
    const ids = LibDriveStore.listJsonFiles(folder)
      .map(f=>parseInt(f.getName().slice(0, -5), 10))
      .filter(n=>!isNaN(n));
    return ids.length ? Math.max.apply(null, ids)+1 : 1;
  },
};
