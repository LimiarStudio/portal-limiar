/* =================== IMAGENS ===================
   Imagens não ficam dentro dos documentos JSON — ficam como arquivo de verdade
   em db/images/, e o documento (foto de um RDO, capa de um projeto) guarda só
   o caminho relativo. saveDataUrl() existe porque o front-end de hoje lê o
   arquivo escolhido pelo usuário com FileReader.readAsDataURL() e produz uma
   string "data:image/png;base64,...." — é esse formato que chega aqui quando
   o site for ligado nesse banco. */
const fs = require('fs');
const path = require('path');
const {ensureDirFor} = require('./jsonFile');

const IMAGES_ROOT = path.join(__dirname, '..', 'images');

// grava uma data URL como arquivo em db/images/<relPath> e devolve o caminho
// relativo (a partir da raiz do projeto) que deve ser guardado no documento
function saveDataUrl(dataUrl, relPath){
  const match = /^data:([\w/+.-]+);base64,([\s\S]+)$/.exec(dataUrl);
  if(!match) throw new Error('Data URL inválida — esperado algo como "data:image/png;base64,...."');
  const destAbs = path.join(IMAGES_ROOT, relPath);
  ensureDirFor(destAbs);
  fs.writeFileSync(destAbs, Buffer.from(match[2], 'base64'));
  return 'db/images/'+relPath.split(path.sep).join('/');
}

// aceita tanto um caminho relativo "cru" (ex.: "1/rdos/47/foto1.jpg") quanto
// o caminho completo já salvo no documento (ex.: "db/images/1/rdos/47/foto1.jpg")
function remove(relOrFullPath){
  const relPath = relOrFullPath.startsWith('db/images/')
    ? relOrFullPath.slice('db/images/'.length)
    : relOrFullPath;
  try{ fs.unlinkSync(path.join(IMAGES_ROOT, relPath)); }
  catch(e){ if(e.code!=='ENOENT') throw e; }
}

module.exports = {IMAGES_ROOT, saveDataUrl, remove};
