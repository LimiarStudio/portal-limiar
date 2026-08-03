/* =================== SEED ===================
   Popula db/data/ com os mesmos dados de demonstração que hoje vivem em
   js/data.js (mesmos projetos, cronograma, financeiro e relatórios), só que
   já no formato do banco nesta pasta (datas em ISO, mão de obra/equipamentos
   como objetos em vez de tuplas, etc.) — serve tanto pra ter algo pra testar
   os repositórios quanto, mais pra frente, como referência de conversão na
   hora de ligar o site a uma API de verdade.

   Rodar com: node db/seed.js
   Por padrão só preenche o que ainda não existir. Rodar com --reset apaga
   tudo em db/data/ e db/images/ primeiro e recria do zero. */
const fs = require('fs');
const path = require('path');
const db = require('./index');
const {IMAGES_ROOT} = require('./lib/images');

const DATA_ROOT = path.join(__dirname, 'data');
const toIso = brDate => { const [d,m,a] = brDate.split('/'); return `${a}-${m}-${d}`; };

function reset(){
  fs.rmSync(DATA_ROOT, {recursive:true, force:true});
  fs.rmSync(IMAGES_ROOT, {recursive:true, force:true});
}

function seedCatalogDefaults(){
  const etapasFile = path.join(DATA_ROOT, 'catalogDefaults', 'etapas.json');
  const categoriasFile = path.join(DATA_ROOT, 'catalogDefaults', 'categorias.json');
  const funcoesFile = path.join(DATA_ROOT, 'catalogDefaults', 'funcoes.json');
  const equipamentosFile = path.join(DATA_ROOT, 'catalogDefaults', 'equipamentos.json');
  if(fs.existsSync(etapasFile)) return;

  const {writeJson} = require('./lib/jsonFile');

  const etapas = [
    "Preparação do terreno","Fundação","Estrutura","Alvenaria","Cobertura",
    "Instalações Hidrossanitárias","Instalações Elétricas","Instalações Especiais",
    "Esquadrias","Impermeabilização","Pintura","Mármores e Granitos",
    "Revestimentos/Acabamentos","Área Externa","Marcenaria/Mobiliários","Decoração",
    "Paisagismo","Limpeza Final","Finalização/Entrega",
  ];
  // "todasEtapas: true" no lugar da igualdade de referência que o js/data.js usa
  // (c.etapas===ETAPAS_PADRAO_FACTORY) pra marcar "Ajudante"/"Mestre de Obras"
  const categorias = [
    {nome:"Pedreiro", etapas:["Preparação do terreno","Fundação","Estrutura","Alvenaria","Revestimentos/Acabamentos","Área Externa"]},
    {nome:"Ajudante", todasEtapas:true},
    {nome:"Armador", etapas:["Fundação","Estrutura"]},
    {nome:"Mestre de Obras", todasEtapas:true},
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
  const funcoes = ["Encarregado","Pedreiro","Servente","Carpinteiro","Armador","Eletricista","Encanador","Pintor","Operador de máquina","Mestre de obras"];
  const equipamentos = ["Betoneira","Retroescavadeira","Andaime","Compactador de solo","Guincho","Serra circular","Vibrador de concreto","Caminhão basculante","Gerador"];

  writeJson(etapasFile, etapas);
  writeJson(categoriasFile, categorias);
  writeJson(funcoesFile, funcoes);
  writeJson(equipamentosFile, equipamentos);
}

function seedUsers(){
  if(db.users.listar().length) return;
  db.users.criar({nome:'Joyce Santos', email:'joyce@limiar.com.br', papel:'gestor'});
  db.users.criar({nome:'João Costa', email:'joao.costa@email.com', papel:'cliente'});
}

function seedProjects(){
  if(db.projects.listar().length) return;
  db.projects.criar({
    nome:"Residência Alphaville", cliente:"João & Marina Costa",
    endereco:"Al. das Palmeiras, 220 — Alphaville, Barueri/SP", resp:"Joyce Santos",
    inicio:toIso("10/03/2026"), termino:toIso("20/12/2026"), avanco:42, icon:"🏠", tipo:"completo",
  });
  db.projects.criar({
    nome:"Galpão Logístico BR-101", cliente:"TransLog Distribuição",
    endereco:"Rod. BR-101, km 34 — Serra/ES", resp:"Joyce Santos",
    inicio:toIso("05/01/2026"), termino:toIso("30/09/2026"), avanco:68, icon:"🏭", tipo:"completo",
  });
  db.projects.criar({
    nome:"Reforma Clínica Vitta", cliente:"Clínica Vitta",
    endereco:"R. XV de Novembro, 900 — Centro, Curitiba/PR", resp:"Joyce Santos",
    inicio:toIso("01/08/2026"), termino:toIso("15/11/2026"), avanco:5, icon:"🏥", tipo:"completo",
  });
}

function seedCronograma(){
  if(db.cronograma.listar(1).length) return;
  db.cronograma.salvar(1, [
    {id:'t1', nome:"Preparação do terreno", ini:toIso("10/03/2026"), fim:toIso("25/03/2026"), av:100, dur:6},
    {id:'t2', nome:"Fundação", ini:toIso("26/03/2026"), fim:toIso("30/04/2026"), av:100, dur:14},
    {id:'t3', nome:"Estrutura", ini:toIso("01/05/2026"), fim:toIso("15/07/2026"), av:60, dur:30},
    {id:'t4', nome:"Alvenaria", ini:toIso("16/07/2026"), fim:toIso("10/09/2026"), av:20, dur:24},
    {id:'t6', nome:"Instalações Hidrossanitárias", ini:toIso("20/09/2026"), fim:toIso("08/10/2026"), av:0, dur:18},
    {id:'t7', nome:"Instalações Elétricas", ini:toIso("25/09/2026"), fim:toIso("10/10/2026"), av:0, dur:15},
  ]);
}

function seedFinanceiro(){
  if(Object.keys(db.financeiro.tudo(1)).length) return;
  const lanc = (data, desc, valor) => ({data:toIso(data), desc, valor});
  db.financeiro.salvarTudo(1, {
    "Preparação do terreno":[
      {nome:"Aluguel de Equipamentos", prev:15000, lanc:[lanc("08/03/2026","Tapumes e container",14200)]},
      {nome:"Ajudante", prev:8000, lanc:[]},
    ],
    "Fundação":[
      {nome:"Concreto", prev:130000, lanc:[lanc("12/04/2026","Concreto usinado - NF 4021",120000)]},
      {nome:"Aço", prev:55000, lanc:[lanc("20/04/2026","Ferragem CA-50",52000)]},
      {nome:"Aluguel de Equipamentos", prev:20000, lanc:[]},
    ],
    "Estrutura":[
      {nome:"Aço", prev:260000, lanc:[lanc("15/06/2026","Aço estrutural",250000)]},
      {nome:"Concreto", prev:170000, lanc:[lanc("10/07/2026","Concreto lajes",160000)]},
      {nome:"Madeira", prev:90000, lanc:[]},
    ],
    "Alvenaria":[
      {nome:"Tijolo", prev:180000, lanc:[lanc("18/07/2026","Blocos e argamassa",60000)]},
      {nome:"Pedreiro", prev:60000, lanc:[]},
    ],
    "Cobertura":[
      {nome:"Telhas", prev:0, lanc:[]},
      {nome:"Estrutura Metálica", prev:0, lanc:[]},
    ],
    "Instalações Hidrossanitárias":[
      {nome:"Tubulação Hidráulica + Conexões", prev:160000, lanc:[lanc("22/07/2026","Tubulação hidráulica",15000)]},
    ],
    "Instalações Elétricas":[
      {nome:"Cabos", prev:150000, lanc:[]},
      {nome:"Complementos Elétrica", prev:20000, lanc:[lanc("05/10/2026","Disjuntores e quadro extra - imprevisto",22000)]},
    ],
    "Instalações Especiais":[{nome:"Infraestrutura Ar-condicionado", prev:0, lanc:[]}],
    "Esquadrias":[
      {nome:"Esquadria Alumínio", prev:0, lanc:[]},
      {nome:"Esquadria Madeira", prev:0, lanc:[]},
    ],
    "Impermeabilização":[{nome:"Impermeabilizantes", prev:0, lanc:[]}],
    "Pintura":[{nome:"Tintas / Massas", prev:80000, lanc:[]}],
    "Mármores e Granitos":[{nome:"Bancadas", prev:0, lanc:[]}],
    "Revestimentos/Acabamentos":[
      {nome:"Piso / Revestimento", prev:150000, lanc:[]},
      {nome:"Louças e Metais", prev:50000, lanc:[]},
    ],
    "Área Externa":[
      {nome:"Pedreiro", prev:0, lanc:[]},
      {nome:"Cimento", prev:0, lanc:[]},
    ],
    "Marcenaria/Mobiliários":[{nome:"Móveis Planejados", prev:0, lanc:[]}],
    "Decoração":[{nome:"Cortinas / Tapetes", prev:0, lanc:[]}],
    "Paisagismo":[{nome:"Paisagista / Jardineiro", prev:0, lanc:[]}],
    "Limpeza Final":[{nome:"Ajudante", prev:0, lanc:[]}],
    "Finalização/Entrega":[{nome:"Equipamentos e Eletrodomésticos", prev:0, lanc:[]}],
  });
}

function seedRdos(){
  if(db.rdos.listar(1).length) return;
  db.rdos.salvar(1, {
    n:47, semanaInicio:toIso("21/07/2026"), semanaFim:toIso("25/07/2026"), resp:"Joyce Santos",
    mo:[{funcao:"Pedreiro",qtd:4},{funcao:"Servente",qtd:6},{funcao:"Armador",qtd:3},{funcao:"Encarregado",qtd:1}],
    eq:[{equipamento:"Betoneira",qtd:1},{equipamento:"Andaime",qtd:8},{equipamento:"Vibrador de concreto",qtd:1}],
    atividades:[
      {texto:"Concretagem da laje do 2º pavimento", etapa:"Estrutura", avanco:5},
      {texto:"Montagem de fôrmas para a próxima etapa", etapa:"Estrutura", avanco:4},
    ],
    ocorrencias:"Chegada de material às 13h de quarta-feira atrasou 30min. Sem impacto no cronograma.",
    fotos:[
      {legenda:"Concretagem em andamento", emoji:"🏗️"},
      {legenda:"Armação da laje", emoji:"📐"},
      {legenda:"Vista geral do canteiro", emoji:"🏠"},
    ],
  });
  db.rdos.salvar(1, {
    n:46, semanaInicio:toIso("14/07/2026"), semanaFim:toIso("18/07/2026"), resp:"Joyce Santos",
    mo:[{funcao:"Servente",qtd:4},{funcao:"Encarregado",qtd:1},{funcao:"Pedreiro",qtd:2}],
    eq:[{equipamento:"Andaime",qtd:8}],
    atividades:[
      {texto:"Organização do canteiro após chuva no início da semana", etapa:null, avanco:0},
      {texto:"Início da alvenaria do térreo", etapa:"Alvenaria", avanco:8},
    ],
    ocorrencias:"Serviços paralisados na segunda-feira devido à chuva. Retomados normalmente na terça.",
    fotos:[
      {legenda:"Canteiro após a chuva", emoji:"🌧️"},
      {legenda:"Alvenaria iniciada", emoji:"🧱"},
    ],
  });
}

function main(){
  if(process.argv.includes('--reset')){
    reset();
    console.log('db/data e db/images apagados — recriando do zero.');
  }
  seedCatalogDefaults();
  seedUsers();
  seedProjects();
  seedCronograma();
  seedFinanceiro();
  seedRdos();
  console.log('Seed concluído.');
  console.log('  usuários:  ', db.users.listar().length);
  console.log('  projetos:  ', db.projects.listar().length);
  console.log('  cronograma:', db.cronograma.listar(1).length, 'etapas (projeto 1)');
  console.log('  relatórios:', db.rdos.listar(1).length, '(projeto 1)');
}

if(require.main===module) main();
module.exports = {main, reset, toIso};
