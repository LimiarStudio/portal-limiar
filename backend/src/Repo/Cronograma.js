/* =================== CRONOGRAMA ===================
   Um documento por projeto: a lista de etapas do cronograma, cada uma com
   início/término (ISO) e avanço (%). Espelha cronogramas[pid] de js/data.js —
   igual lá, a lista começa vazia: só etapas com uso real entram aqui, as
   demais ficam só no catálogo (Repo/Catalog.js) até serem adicionadas. */
var RepoCronograma = {
  listar(projectId){ return LibDriveStore.readJson(LibFolders.getDataSubfolder('cronogramas'), projectId+'.json', []); },
  salvar(projectId, etapas){
    LibDriveStore.writeJson(LibFolders.getDataSubfolder('cronogramas'), projectId+'.json', etapas);
    return etapas;
  },
  adicionar(projectId, dados){
    const nome=dados.nome, ini=dados.ini, fim=dados.fim, av=dados.av, dur=dados.dur;
    const lista = RepoCronograma.listar(projectId);
    const numeros = lista.map(function(e){ return +String(e.id).replace(/\D/g,''); }).filter(function(n){ return !isNaN(n); });
    const id = 't'+(numeros.length ? Math.max.apply(null, numeros)+1 : 1);
    const nova = {id:id, nome:nome, ini:ini, fim:fim, av: av===undefined?0:av, dur:dur};
    lista.push(nova);
    lista.sort(function(a,b){ return a.ini<b.ini?-1:1; });
    RepoCronograma.salvar(projectId, lista);
    return nova;
  },
  atualizar(projectId, etapaId, patch){
    const lista = RepoCronograma.listar(projectId);
    const item = lista.find(function(e){ return e.id===etapaId; });
    if(!item) throw new Error('Etapa não encontrada: '+etapaId);
    Object.assign(item, patch);
    lista.sort(function(a,b){ return a.ini<b.ini?-1:1; });
    RepoCronograma.salvar(projectId, lista);
    return item;
  },
  remover(projectId, etapaId){
    RepoCronograma.salvar(projectId, RepoCronograma.listar(projectId).filter(function(e){ return e.id!==etapaId; }));
  },
};
