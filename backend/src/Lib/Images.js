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

    // reenvio (ex.: trocar a capa) substitui o(s) arquivo(s) anterior(es) —
    // por prefixo (não só nome exato), pra não deixar órfão quando a extensão
    // muda (ex.: capa.png -> capa.jpg)
    const prefixo = kind==='capa' ? 'capa.' : filename;
    const antigos = folder.getFiles();
    while(antigos.hasNext()){
      const f = antigos.next();
      if(f.getName().indexOf(prefixo)===0) f.setTrashed(true);
    }

    const blob = Utilities.newBlob(bytes, match[1], filename);
    const file = folder.createFile(blob);
    // arquivo do Drive é privado por padrão (dono = conta que fez o deploy,
    // ver executeAs em appsscript.json) — sem isso, um <img src> no navegador
    // de um visitante anônimo bate num muro de login do Google
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    // "uc?id=" é bloqueado pelo ORB do Chrome quando usado como <img src> de
    // outra origem (funciona só em navegação direta) — "lh3.googleusercontent.com/d/"
    // é o formato que o próprio Google usa pra miniaturas embutidas e não tem esse problema
    return {fileId: file.getId(), name: filename, url: 'https://lh3.googleusercontent.com/d/'+file.getId()};
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
