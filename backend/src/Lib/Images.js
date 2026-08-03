/* =================== IMAGENS ===================
   Imagens não ficam dentro dos documentos JSON — ficam como arquivo de
   verdade no Drive, e o documento (foto de um RDO, capa de um projeto) guarda
   só o fileId. Substitui db/lib/images.js do protótipo em Node — lá o
   documento guardava um caminho relativo; aqui, como o Drive não tem
   caminhos, guarda o fileId do arquivo de verdade. saveDataUrl() existe
   porque o front-end lê o arquivo escolhido pelo usuário com
   FileReader.readAsDataURL() e produz uma string "data:image/png;base64,....". */
var LibImages = {
  // kind 'capa' -> images/<projectId>/capa.<ext> (sobrescreve a anterior, se houver)
  // kind 'rdo-foto', extra:{n,index} -> images/<projectId>/rdos/<n>/<timestamp>-<index>.<ext>
  saveDataUrl(dataUrl, projectId, kind, extra){
    const match = /^data:([\w/+.-]+);base64,([\s\S]+)$/.exec(dataUrl);
    if(!match) throw new Error('Data URL inválida — esperado algo como "data:image/png;base64,....".');
    const ext = extFromMime_(match[1]);
    const bytes = Utilities.base64Decode(match[2]);

    let folder, filename;
    if(kind==='capa'){
      folder = LibFolders.getProjectSubfolder('images', projectId);
      filename = 'capa.'+ext;
    }else if(kind==='rdo-foto'){
      extra = extra || {};
      folder = LibFolders.getRdoPhotosSubfolder(projectId, extra.n);
      filename = Date.now()+'-'+extra.index+'.'+ext;
    }else{
      throw new Error('kind deve ser "capa" ou "rdo-foto".');
    }

    // reenvio (ex.: trocar a capa) substitui o arquivo anterior de mesmo nome
    const existente = folder.getFilesByName(filename);
    while(existente.hasNext()) existente.next().setTrashed(true);

    const blob = Utilities.newBlob(bytes, match[1], filename);
    const file = folder.createFile(blob);
    return {fileId: file.getId(), name: filename, url: 'https://drive.google.com/uc?id='+file.getId()};
  },
  remove(fileId){
    try{ DriveApp.getFileById(fileId).setTrashed(true); }catch(e){}
  },
  getBlob(fileId){
    return DriveApp.getFileById(fileId).getBlob();
  },
};

function extFromMime_(mime){
  const m = /image\/(\w+)/.exec(mime);
  let ext = m ? m[1] : 'bin';
  if(ext==='jpeg') ext = 'jpg';
  return ext;
}
