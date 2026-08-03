/* =================== COLLECTION (documento por arquivo) ===================
   Uma "collection" é uma pasta onde cada documento é o seu próprio arquivo
   <id>.json — o jeito mais literal de "banco de dados orientado a documentos"
   dá pra fazer só com o sistema de arquivos: cada leitura/escrita mexe num
   documento por vez, sem precisar reler/regravar uma coleção inteira (como
   aconteceria se cada collection fosse um array dentro de um único arquivo). */
const path = require('path');
const {readJson, writeJson, deleteFile, listJsonFiles} = require('./jsonFile');

function nextNumericId(docs){
  const ids = docs.map(d=>d.id).filter(id=>typeof id==='number');
  return ids.length ? Math.max(...ids)+1 : 1;
}

function collection(dirPath){
  const fileFor = id => path.join(dirPath, String(id)+'.json');

  return {
    list(){
      return listJsonFiles(dirPath)
        .map(f=>readJson(path.join(dirPath, f)))
        .filter(Boolean);
    },
    get(id){
      return readJson(fileFor(id), null);
    },
    // sem "id" explícito, gera o próximo id numérico livre (maior id atual + 1)
    create(doc, id){
      const finalId = id!==undefined ? id : nextNumericId(this.list());
      const withId = {...doc, id: finalId};
      writeJson(fileFor(finalId), withId);
      return withId;
    },
    update(id, patch){
      const atual = this.get(id);
      if(!atual) throw new Error(`Documento "${id}" não existe em ${dirPath}`);
      const atualizado = {...atual, ...patch, id: atual.id};
      writeJson(fileFor(id), atualizado);
      return atualizado;
    },
    remove(id){
      deleteFile(fileFor(id));
    },
  };
}

module.exports = {collection, nextNumericId};
