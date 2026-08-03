/* =================== MOCK DATA =================== */
const FUNCOES = ["Encarregado","Pedreiro","Servente","Carpinteiro","Armador","Eletricista","Encanador","Pintor","Operador de máquina","Mestre de obras"];
const EQUIPS = ["Betoneira","Retroescavadeira","Andaime","Compactador de solo","Guincho","Serra circular","Vibrador de concreto","Caminhão basculante","Gerador"];

// Mapa de etapas de obra: lista padrão e fixa de etapas do cronograma.
// O nome de cada etapa também é o agrupador fixo usado no Financeiro.
// "_FACTORY" = catálogo de fábrica, igual para todo projeto novo e nunca
// alterado em si — as customizações de cada projeto (adicionar/remover)
// ficam por conta de etapasPadrao(pid)/categoriasPadrao(pid), mais abaixo.
const ETAPAS_PADRAO_FACTORY = [
  "Preparação do terreno","Fundação","Estrutura","Alvenaria","Cobertura",
  "Instalações Hidrossanitárias","Instalações Elétricas","Instalações Especiais",
  "Esquadrias","Impermeabilização","Pintura","Mármores e Granitos",
  "Revestimentos/Acabamentos","Área Externa","Marcenaria/Mobiliários","Decoração",
  "Paisagismo","Limpeza Final","Finalização/Entrega",
];

// Mapa de categorias financeiras: catálogo padrão e fixo de categorias,
// cada uma associada às etapas do cronograma em que costuma ser usada.
const CATEGORIAS_PADRAO_FACTORY = [
  {nome:"Pedreiro", etapas:["Preparação do terreno","Fundação","Estrutura","Alvenaria","Revestimentos/Acabamentos","Área Externa"]},
  {nome:"Ajudante", etapas:ETAPAS_PADRAO_FACTORY},
  {nome:"Armador", etapas:["Fundação","Estrutura"]},
  {nome:"Mestre de Obras", etapas:ETAPAS_PADRAO_FACTORY},
  {nome:"Eletricista", etapas:["Instalações Elétricas","Revestimentos/Acabamentos","Finalização/Entrega"]},
  {nome:"Gesseiro", etapas:["Revestimentos/Acabamentos"]},
  {nome:"Pintor", etapas:["Pintura"]},
  {nome:"Drywall", etapas:["Revestimentos/Acabamentos"]},
  {nome:"Marceneiro", etapas:["Marcenaria/Mobiliários"]},
  {nome:"Aluguel de Equipamentos", etapas:["Preparação do terreno","Fundação","Estrutura","Área Externa"]},
  {nome:"Aço", etapas:["Fundação","Estrutura"]},
  {nome:"Madeira", etapas:["Fundação","Estrutura","Cobertura"]},
  {nome:"Concreto", etapas:["Fundação","Estrutura"]},
  {nome:"Estrutura Metálica", etapas:["Estrutura","Cobertura"]},
  {nome:"Tijolo", etapas:["Alvenaria"]},
  {nome:"Cimento", etapas:["Fundação","Estrutura","Alvenaria","Revestimentos/Acabamentos","Área Externa"]},
  {nome:"Areia", etapas:["Fundação","Estrutura","Alvenaria","Revestimentos/Acabamentos","Área Externa"]},
  {nome:"Brita", etapas:["Fundação","Estrutura","Área Externa"]},
  {nome:"Complementos Alvenaria", etapas:["Alvenaria"]},
  {nome:"Telhas", etapas:["Cobertura"]},
  {nome:"Complementos Telhado", etapas:["Cobertura"]},
  {nome:"Calheiro / Telhadista", etapas:["Cobertura"]},
  {nome:"Serralheiro", etapas:["Estrutura","Cobertura","Esquadrias","Área Externa"]},
  {nome:"Tubulação Hidráulica + Conexões", etapas:["Instalações Hidrossanitárias"]},
  {nome:"Louças e Metais", etapas:["Instalações Hidrossanitárias","Revestimentos/Acabamentos"]},
  {nome:"Complementos Hidráulica", etapas:["Instalações Hidrossanitárias"]},
  {nome:"Cabos", etapas:["Instalações Elétricas"]},
  {nome:"Acabamentos Elétrica", etapas:["Revestimentos/Acabamentos"]},
  {nome:"Complementos Elétrica", etapas:["Instalações Elétricas"]},
  {nome:"Infraestrutura Ar-condicionado", etapas:["Instalações Especiais"]},
  {nome:"Infraestrutura Gás", etapas:["Instalações Especiais"]},
  {nome:"Instalador de Energia Solar", etapas:["Instalações Especiais"]},
  {nome:"Impermeabilizantes", etapas:["Impermeabilização"]},
  {nome:"Piso / Revestimento", etapas:["Revestimentos/Acabamentos"]},
  {nome:"Complementos Revestimentos", etapas:["Revestimentos/Acabamentos"]},
  {nome:"Piso Laminado / Vinílico", etapas:["Revestimentos/Acabamentos"]},
  {nome:"Esquadria Alumínio", etapas:["Esquadrias"]},
  {nome:"Esquadria Madeira", etapas:["Esquadrias"]},
  {nome:"Esquadria Blindex", etapas:["Esquadrias"]},
  {nome:"Complementos Esquadrias", etapas:["Esquadrias"]},
  {nome:"Tintas / Massas", etapas:["Pintura"]},
  {nome:"Complementos Pintura", etapas:["Pintura"]},
  {nome:"Bancadas", etapas:["Mármores e Granitos"]},
  {nome:"Soleiras / Peitoris", etapas:["Mármores e Granitos"]},
  {nome:"Nichos", etapas:["Mármores e Granitos"]},
  {nome:"Iluminação", etapas:["Revestimentos/Acabamentos"]},
  {nome:"Equipamentos e Eletrodomésticos", etapas:["Finalização/Entrega"]},
  {nome:"Móveis Planejados", etapas:["Marcenaria/Mobiliários"]},
  {nome:"Mobiliário Solto", etapas:["Marcenaria/Mobiliários","Decoração"]},
  {nome:"Cortinas / Tapetes", etapas:["Decoração"]},
  {nome:"Itens Decorativos", etapas:["Decoração"]},
  {nome:"Materiais de Paisagismo (plantas, grama, pedras, vasos, etc.)", etapas:["Paisagismo"]},
  {nome:"Paisagista / Jardineiro", etapas:["Paisagismo"]},
];
// Catálogo de etapas/categorias É LOCAL A CADA PROJETO: cada um começa
// igual ao catálogo de fábrica, mas adições/remoções feitas em Configurações
// só valem para o projeto aberto naquela hora — outros projetos não são
// afetados. Guardado no localStorage com o id do projeto na chave, pra
// sobreviver à navegação entre páginas (este protótipo não tem backend).
const etapasPadrao = pid => {
  let lista = ETAPAS_PADRAO_FACTORY.slice();
  try{
    const removidas = JSON.parse(localStorage.getItem('obraview_removed_etapas_'+pid)||'[]');
    lista = lista.filter(e=>!removidas.includes(e));
    JSON.parse(localStorage.getItem('obraview_custom_etapas_'+pid)||'[]').forEach(e=>{
      if(!lista.includes(e)) lista.push(e);
    });
  }catch(e){}
  return lista;
};
const categoriasPadrao = pid => {
  const etapas = etapasPadrao(pid);
  // "Ajudante"/"Mestre de Obras" valem para todas as etapas do projeto —
  // usam a própria lista de etapas do projeto em vez de uma cópia fixa
  let lista = CATEGORIAS_PADRAO_FACTORY.map(c=>({
    nome: c.nome,
    etapas: c.etapas===ETAPAS_PADRAO_FACTORY ? etapas : c.etapas.slice(),
  }));
  try{
    const removidas = JSON.parse(localStorage.getItem('obraview_removed_categorias_'+pid)||'[]');
    lista = lista.filter(c=>!removidas.includes(c.nome));
    JSON.parse(localStorage.getItem('obraview_custom_categorias_'+pid)||'[]').forEach(c=>{
      if(!lista.some(x=>x.nome===c.nome)) lista.push(c);
    });
    // relações etapa↔categoria editadas em Configurações (tanto de fábrica quanto
    // cadastradas pelo usuário) sobrescrevem a lista de etapas de cada categoria
    const overrides = JSON.parse(localStorage.getItem('obraview_categoria_etapas_'+pid)||'{}');
    lista.forEach(c=>{ if(overrides[c.nome]) c.etapas=overrides[c.nome]; });
  }catch(e){}
  return lista;
};

// "tipo" define quais módulos o projeto usa: "completo" (Visão Geral, Relatórios,
// Financeiro e Cronograma) ou "relatorios" (só Relatórios Semanais) — ver modulosDoProjeto()
// em helpers.js e o seletor em novo-projeto.html
const projetos = [
  {id:1, nome:"Residência Alphaville", cliente:"João & Marina Costa", cat:"EG", endereco:"Al. das Palmeiras, 220 — Alphaville, Barueri/SP",
   status:"and", inicio:"10/03/2026", termino:"20/12/2026", avanco:42, prazo:"prazo", icon:"🏠", imagem:"", tipo:"completo",
   resp:"Joyce Santos", orcado:1850000, gasto:812000},
  {id:2, nome:"Galpão Logístico BR-101", cliente:"TransLog Distribuição", cat:"EG", endereco:"Rod. BR-101, km 34 — Serra/ES",
   status:"and", inicio:"05/01/2026", termino:"30/09/2026", avanco:68, prazo:"atras", icon:"🏭", imagem:"", tipo:"completo",
   resp:"Joyce Santos", orcado:4200000, gasto:3010000},
  {id:3, nome:"Reforma Clínica Vitta", cliente:"Clínica Vitta", cat:"ML", endereco:"R. XV de Novembro, 900 — Centro, Curitiba/PR",
   status:"plan", inicio:"01/08/2026", termino:"15/11/2026", avanco:5, prazo:"prazo", icon:"🏥", imagem:"", tipo:"completo",
   resp:"Joyce Santos", orcado:680000, gasto:22000},
];
// edições feitas em "Editar projeto" (nome, cliente, endereço, responsável, datas, imagem
// de capa) precisam sobreviver à navegação entre páginas — diferente do resto dos dados
// deste protótipo (RDOs, financeiro, cronograma), que é só em memória e reseta a cada
// carregamento, porque nome/cliente/imagem também aparecem em Meus Projetos, uma página
// separada. Por isso ficam no localStorage, no mesmo padrão do catálogo de etapas/categorias.
try{
  projetos.forEach(p=>{
    const overrides = JSON.parse(localStorage.getItem('obraview_projeto_'+p.id)||'null');
    if(overrides) Object.assign(p, overrides);
  });
}catch(e){}
// projetos criados pelo usuário em "+ Novo projeto" não fazem parte do catálogo de
// fábrica acima, então ficam à parte no localStorage e são concatenados aqui — do
// contrário desapareceriam a cada navegação, pelo mesmo motivo das edições acima
try{
  JSON.parse(localStorage.getItem('obraview_extra_projetos')||'[]').forEach(p=>projetos.push(p));
}catch(e){}
// projetos arquivados (ver "Zona de risco" em Editar Projeto) somem do sistema — no mundo
// real os relatórios virariam PDF numa pasta do projeto no Google Drive e a entrada seria
// apagada do banco; aqui simulamos isso removendo o projeto da lista carregada, então ele
// nunca mais aparece em nenhuma tela deste protótipo
try{
  const arquivados = new Set(JSON.parse(localStorage.getItem('obraview_arquivados')||'[]'));
  if(arquivados.size){
    for(let i=projetos.length-1;i>=0;i--){
      if(arquivados.has(projetos[i].id)) projetos.splice(i,1);
    }
  }
}catch(e){}

// Cronograma por projeto — o nome de cada etapa também é o agrupador fixo usado no Financeiro.
// Segue a ordem e os nomes do mapa de etapas padrão (ETAPAS_PADRAO_FACTORY).
// Só as etapas com uso real (progresso já iniciado ou gasto já lançado) entram aqui —
// as demais ficam de fora do cronograma inicial e podem ser adicionadas em "+ Nova etapa"
// pra demonstrar o fluxo. Os dados de financeiro (mais abaixo) continuam existindo para
// elas e reaparecem automaticamente se forem adicionadas de volta ao cronograma.
const cronogramas = {
  1:[
    {id:'t1', nome:"Preparação do terreno", ini:"10/03/2026", fim:"25/03/2026", av:100, dur:6},
    {id:'t2', nome:"Fundação", ini:"26/03/2026", fim:"30/04/2026", av:100, dur:14},
    {id:'t3', nome:"Estrutura", ini:"01/05/2026", fim:"15/07/2026", av:60, dur:30},
    {id:'t4', nome:"Alvenaria", ini:"16/07/2026", fim:"10/09/2026", av:20, dur:24},
    {id:'t6', nome:"Instalações Hidrossanitárias", ini:"20/09/2026", fim:"08/10/2026", av:0, dur:18},
    {id:'t7', nome:"Instalações Elétricas", ini:"25/09/2026", fim:"10/10/2026", av:0, dur:15},
  ]
};

// Relatórios semanais (RDO) por projeto — vários lançamentos de progresso por relatório
const rdos = {
  1:[
    {n:47, semana:"21/07/2026 a 25/07/2026", resp:"Joyce Santos",
     mo:[["Pedreiro",4],["Servente",6],["Armador",3],["Encarregado",1]],
     eq:[["Betoneira",1],["Andaime",8],["Vibrador de concreto",1]],
     ativ:[
       {t:"Concretagem da laje do 2º pavimento", etapa:"Estrutura", av:5},
       {t:"Montagem de fôrmas para a próxima etapa", etapa:"Estrutura", av:4},
     ],
     ocorr:"Chegada de material às 13h de quarta-feira atrasou 30min. Sem impacto no cronograma.",
     fotos:[["Concretagem em andamento","🏗️"],["Armação da laje","📐"],["Vista geral do canteiro","🏠"]]},
    {n:46, semana:"14/07/2026 a 18/07/2026", resp:"Joyce Santos",
     mo:[["Servente",4],["Encarregado",1],["Pedreiro",2]],
     eq:[["Andaime",8]],
     ativ:[
       {t:"Organização do canteiro após chuva no início da semana", etapa:null, av:0},
       {t:"Início da alvenaria do térreo", etapa:"Alvenaria", av:8},
     ],
     ocorr:"Serviços paralisados na segunda-feira devido à chuva. Retomados normalmente na terça.",
     fotos:[["Canteiro após a chuva","🌧️"],["Alvenaria iniciada","🧱"]]},
  ]
};

// Financeiro por projeto: etapa (herdada do cronograma) → categorias.
// O previsto vive na categoria; o total da etapa é sempre a soma das suas categorias.
// O realizado é sempre a soma dos lançamentos de cada categoria.
const financeiro = {
  1:{
    "Preparação do terreno":[
      {nome:"Aluguel de Equipamentos", prev:15000, lanc:[
        {data:"08/03/2026", desc:"Tapumes e container", valor:14200}]},
      {nome:"Ajudante", prev:8000, lanc:[]},
    ],
    "Fundação":[
      {nome:"Concreto", prev:130000, lanc:[
        {data:"12/04/2026", desc:"Concreto usinado - NF 4021", valor:120000}]},
      {nome:"Aço", prev:55000, lanc:[
        {data:"20/04/2026", desc:"Ferragem CA-50", valor:52000}]},
      {nome:"Aluguel de Equipamentos", prev:20000, lanc:[]},
    ],
    "Estrutura":[
      {nome:"Aço", prev:260000, lanc:[
        {data:"15/06/2026", desc:"Aço estrutural", valor:250000}]},
      {nome:"Concreto", prev:170000, lanc:[
        {data:"10/07/2026", desc:"Concreto lajes", valor:160000}]},
      {nome:"Madeira", prev:90000, lanc:[]},
    ],
    "Alvenaria":[
      {nome:"Tijolo", prev:180000, lanc:[
        {data:"18/07/2026", desc:"Blocos e argamassa", valor:60000}]},
      {nome:"Pedreiro", prev:60000, lanc:[]},
    ],
    "Cobertura":[
      {nome:"Telhas", prev:0, lanc:[]},
      {nome:"Estrutura Metálica", prev:0, lanc:[]},
    ],
    "Instalações Hidrossanitárias":[
      {nome:"Tubulação Hidráulica + Conexões", prev:160000, lanc:[
        {data:"22/07/2026", desc:"Tubulação hidráulica", valor:15000}]},
    ],
    "Instalações Elétricas":[
      {nome:"Cabos", prev:150000, lanc:[]},
      {nome:"Complementos Elétrica", prev:20000, lanc:[
        {data:"05/10/2026", desc:"Disjuntores e quadro extra - imprevisto", valor:22000}]},
    ],
    "Instalações Especiais":[
      {nome:"Infraestrutura Ar-condicionado", prev:0, lanc:[]},
    ],
    "Esquadrias":[
      {nome:"Esquadria Alumínio", prev:0, lanc:[]},
      {nome:"Esquadria Madeira", prev:0, lanc:[]},
    ],
    "Impermeabilização":[
      {nome:"Impermeabilizantes", prev:0, lanc:[]},
    ],
    "Pintura":[
      {nome:"Tintas / Massas", prev:80000, lanc:[]},
    ],
    "Mármores e Granitos":[
      {nome:"Bancadas", prev:0, lanc:[]},
    ],
    "Revestimentos/Acabamentos":[
      {nome:"Piso / Revestimento", prev:150000, lanc:[]},
      {nome:"Louças e Metais", prev:50000, lanc:[]},
    ],
    "Área Externa":[
      {nome:"Pedreiro", prev:0, lanc:[]},
      {nome:"Cimento", prev:0, lanc:[]},
    ],
    "Marcenaria/Mobiliários":[
      {nome:"Móveis Planejados", prev:0, lanc:[]},
    ],
    "Decoração":[
      {nome:"Cortinas / Tapetes", prev:0, lanc:[]},
    ],
    "Paisagismo":[
      {nome:"Paisagista / Jardineiro", prev:0, lanc:[]},
    ],
    "Limpeza Final":[
      {nome:"Ajudante", prev:0, lanc:[]},
    ],
    "Finalização/Entrega":[
      {nome:"Equipamentos e Eletrodomésticos", prev:0, lanc:[]},
    ],
  }
};

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
