/* =================== DRIVE STORE (nível mais baixo) ===================
   Leitura/escrita de arquivos JSON individuais dentro de uma pasta do Drive.
   Nada aqui sabe o que é um "usuário" ou um "projeto" — isso fica por conta
   de Lib/Collection.js e dos módulos em Repo/. Substitui o db/lib/jsonFile.js
   do protótipo em Node (que usava fs) — aqui os "arquivos" são objetos File
   do Drive, não caminhos de string, já que o Drive não tem um sistema de
   caminhos de verdade. */
var LibDriveStore = {
  readJson(folder, filename, fallback){
    if(fallback===undefined) fallback = null;
    const file = findFile_(folder, filename);
    if(!file) return fallback;
    try{ return JSON.parse(file.getBlob().getDataAsString()); }
    catch(e){ return fallback; }
  },
  writeJson(folder, filename, data){
    const content = JSON.stringify(data, null, 2);
    const file = findFile_(folder, filename);
    if(file) file.setContent(content);
    else folder.createFile(filename, content, 'application/json');
    return data;
  },
  deleteFile(folder, filename){
    const file = findFile_(folder, filename);
    if(file) file.setTrashed(true);
  },
  listJsonFiles(folder){
    const out = [];
    const it = folder.getFiles();
    while(it.hasNext()){
      const f = it.next();
      if(f.getName().slice(-5)==='.json') out.push(f);
    }
    return out;
  },
};

// procura um arquivo pelo nome dentro de uma pasta — nomes não são únicos no
// Drive, então em caso de mais de um resultado usa o primeiro e avisa no log
function findFile_(folder, filename){
  const it = folder.getFilesByName(filename);
  if(!it.hasNext()) return null;
  const first = it.next();
  if(it.hasNext()) console.warn('Mais de um arquivo "'+filename+'" na pasta "'+folder.getName()+'" — usando o primeiro.');
  return first;
}
