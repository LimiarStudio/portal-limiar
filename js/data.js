/* =================== MOCK DATA =================== */
const FUNCOES = ["Encarregado","Pedreiro","Servente","Carpinteiro","Armador","Eletricista","Encanador","Pintor","Operador de máquina","Mestre de obras"];
const EQUIPS = ["Betoneira","Retroescavadeira","Andaime","Compactador de solo","Guincho","Serra circular","Vibrador de concreto","Caminhão basculante","Gerador"];

// Catálogo de etapas/categorias É LOCAL A CADA PROJETO: cada um começa igual ao catálogo
// de fábrica, mas adições/remoções feitas em Configurações só valem para o projeto aberto
// naquela hora — outros projetos não são afetados. Vem do backend (Api.catalog), buscado
// sob demanda em catalogCache (ver garantirCatalogCache em helpers.js) — essas duas funções
// só leem o que já foi buscado, por isso continuam síncronas e todos os ~15 lugares que já
// as chamam (cronograma.js, financeiro.js, config-page.js...) não precisam mudar nada.
const etapasPadrao = pid => (catalogCache[pid] && catalogCache[pid].etapas) || [];
const categoriasPadrao = pid => (catalogCache[pid] && catalogCache[pid].categorias) || [];

// "tipo" define quais módulos o projeto usa: "completo" (Visão Geral, Relatórios,
// Financeiro e Cronograma) ou "relatorios" (só Relatórios Semanais) — ver modulosDoProjeto()
// em helpers.js e o seletor em novo-projeto.html
//
// projetos/cronogramas/rdos/financeiro começam vazios de propósito — todos vêm do backend
// agora (Api.projects/cronograma/rdos/financeiro), buscados no init de cada página e
// mutados nestes mesmos objetos (nunca reatribuídos) pra que as funções derivadas abaixo
// (realizado, etapaPrevisto, gastoPorMes...) e o resto do site continuem enxergando os
// dados sem precisar saber que existe uma rede no meio.
const projetos = [];
const cronogramas = {};
const rdos = {};
const financeiro = {};

// realizado = soma dos lançamentos de uma categoria
const realizado = it => (it.lanc||[]).reduce((a,b)=>a+b.valor,0);
// só garante que o array exista — as etapas NÃO são pré-preenchidas: um projeto em
// branco começa sem nenhuma, e cada uma é adicionada sob demanda em "+ Nova etapa"
// (só as que realmente têm uso no projeto aparecem no Cronograma/Financeiro)
const ensureCronograma = pid => {
  if(!cronogramas[pid]) cronogramas[pid] = [];
  return cronogramas[pid];
};
// idem para a lista de categorias de uma etapa — só garante que o array exista.
// As categorias em si NÃO são pré-preenchidas: ficam disponíveis no catálogo padrão
// (categoriasPadrao) para serem adicionadas sob demanda em "+ Nova categoria".
const ensureFinEtapa = (pid,etapa) => {
  if(!financeiro[pid]) financeiro[pid] = {};
  if(!financeiro[pid][etapa]) financeiro[pid][etapa] = [];
  return financeiro[pid][etapa];
};
// etapas financeiras fixas do projeto = nomes das etapas do cronograma
const etapasFinanceiras = pid => ensureCronograma(pid).map(e=>e.nome);
const categorias = (pid,etapa) => ensureFinEtapa(pid,etapa);
const etapaPrevisto = (pid,etapa) => categorias(pid,etapa).reduce((a,c)=>a+c.prev,0);
const etapaRealizado = (pid,etapa) => categorias(pid,etapa).reduce((a,c)=>a+realizado(c),0);
const finTotalPrevisto = pid => etapasFinanceiras(pid).reduce((a,e)=>a+etapaPrevisto(pid,e),0);
const finTotalRealizado = pid => etapasFinanceiras(pid).reduce((a,e)=>a+etapaRealizado(pid,e),0);
// custo total por categoria, somando todas as etapas em que ela aparece
const categoriaTotals = pid => {
  const totals = {};
  etapasFinanceiras(pid).forEach(etapa=>{
    categorias(pid,etapa).forEach(c=>{
      if(!totals[c.nome]) totals[c.nome] = {nome:c.nome, prev:0, real:0};
      totals[c.nome].prev += c.prev;
      totals[c.nome].real += realizado(c);
    });
  });
  return Object.values(totals).sort((a,b)=>b.prev-a.prev);
};

// progresso geral do projeto = média do avanço de cada etapa do cronograma,
// ponderada pela duração (etapas mais longas pesam mais no todo) — 0 se o
// cronograma ainda não tem nenhuma etapa. Persistido em p.avanco (ver
// recalcularAvancoProjeto em helpers.js) toda vez que o cronograma muda, pra
// continuar disponível na listagem de projetos sem precisar buscar o
// cronograma de cada um só pra montar aquela tela.
const progressoGeral = pid => {
  const etapas = ensureCronograma(pid);
  const duracaoTotal = etapas.reduce((a,e)=>a+e.dur,0);
  if(!duracaoTotal) return 0;
  return Math.round(etapas.reduce((a,e)=>a+e.av*e.dur,0) / duracaoTotal);
};

// gasto realizado por etapa, para o donut da Visão Geral — só etapas do
// cronograma (mesma base do finTotalRealizado) e só as que já têm gasto
const gastoPorEtapa = pid => etapasFinanceiras(pid)
  .map(e=>({nome:e, valor:etapaRealizado(pid,e)}))
  .filter(x=>x.valor>0)
  .sort((a,b)=>b.valor-a.valor);

// todos os lançamentos do projeto, de todas as categorias de todas as etapas
// do cronograma (mesma base do finTotalRealizado, pra os totais baterem)
const lancamentosProjeto = pid => {
  const out = [];
  etapasFinanceiras(pid).forEach(etapa=>{
    categorias(pid,etapa).forEach(c=>(c.lanc||[]).forEach(l=>out.push(l)));
  });
  return out;
};
// gasto por mês (somando todas as etapas), diferenciando por ano — mantém só
// os últimos 8 meses com lançamento: como só entram meses que têm algum
// lançamento, a lista cresce até 8 e os meses mais antigos vão saindo do
// corte conforme novos lançamentos futuros entram em meses mais recentes
const gastoPorMes = pid => {
  const buckets = {};
  lancamentosProjeto(pid).forEach(l=>{
    const [,m,a] = l.data.split('/').map(Number);
    const chave = a*100+m;
    if(!buckets[chave]) buckets[chave] = {chave, mes:m, ano:a, valor:0};
    buckets[chave].valor += l.valor;
  });
  return Object.values(buckets).sort((a,b)=>a.chave-b.chave).slice(-8);
};
