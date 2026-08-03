/* =================== JSON FILE I/O (nível mais baixo) ===================
   Leitura/escrita de arquivos JSON individuais. Nada aqui sabe o que é um
   "usuário" ou um "projeto" — isso fica por conta de db/lib/collection.js
   e dos módulos em db/repo/. */
const fs = require('fs');
const path = require('path');

function ensureDirFor(filePath){
  fs.mkdirSync(path.dirname(filePath), {recursive:true});
}

function readJson(filePath, fallback=null){
  try{
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }catch(e){
    if(e.code==='ENOENT') return fallback;
    throw e;
  }
}

function writeJson(filePath, data){
  ensureDirFor(filePath);
  // escreve num arquivo temporário e só troca o nome no final — evita deixar
  // um arquivo pela metade se o processo for interrompido no meio da escrita
  const tmpPath = filePath+'.tmp-'+process.pid;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2)+'\n', 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function deleteFile(filePath){
  try{ fs.unlinkSync(filePath); }
  catch(e){ if(e.code!=='ENOENT') throw e; }
}

function listJsonFiles(dirPath){
  try{ return fs.readdirSync(dirPath).filter(f=>f.endsWith('.json')); }
  catch(e){ if(e.code==='ENOENT') return []; throw e; }
}

module.exports = {ensureDirFor, readJson, writeJson, deleteFile, listJsonFiles};
