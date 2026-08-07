/* =================== ADMIN: USUÁRIOS E PERMISSÕES (POR PROJETO) ===================
   usuarios.html define o projeto via ?projeto=N na URL. Cada usuário do sistema (ver Admin
   · Usuários) pode ter permissões granulares por módulo neste projeto: pode ver, pode editar
   (criar/alterar) e pode excluir, independentes entre si. Além dos módulos, dá pra autorizar
   alguém a "gerenciar usuários e permissões" deste projeto — passa a enxergar esta mesma
   página, mas nunca Configurações nem Editar projeto, e nunca pode alterar o administrador
   (acesso completo e fixo, sempre).

   Nota: salvar/remover permissões (permissions.definir/remover) é uma ação restrita ao
   administrador no backend (ver ACOES_ADMIN em backend/src/Code.js) — um usuário delegado a
   "gerenciar usuários" consegue abrir esta página e ver tudo, mas só o administrador de fato
   consegue salvar uma alteração; a tentativa de um delegado mostra o erro do servidor
   claramente, em vez de falhar em silêncio. */
let PROJETO_ID;
let usuariosSistema = [];
let permissoesDoc = null;
let administrador = null;

function resumoAcesso(perm, modulos){
  const visiveis=modulos.filter(([k])=>perm[k].view).map(([,l])=>l);
  const editam=modulos.filter(([k])=>perm[k].write).map(([,l])=>l);
  const excluem=modulos.filter(([k])=>perm[k].delete).map(([,l])=>l);
  const partes=[];
  partes.push(visiveis.length
    ? `<div>👁️ Visualizar: ${visiveis.join(', ')}</div>`
    : `<div class="mut">Sem acesso a nenhum módulo</div>`);
  if(editam.length) partes.push(`<div>✏️ Editar: ${editam.join(', ')}</div>`);
  if(excluem.length) partes.push(`<div>🗑️ Excluir: ${excluem.join(', ')}</div>`);
  if(perm.gerenciarUsuarios) partes.push(`<div>👤 Gerencia usuários deste projeto</div>`);
  return partes.join('');
}

// desmarcar "visualizar" também desmarca e desabilita editar/excluir daquela linha —
// não faz sentido editar ou excluir um módulo que não se pode nem ver. Marcar de novo
// reabilita (sem marcar sozinho, pra não conceder edição sem o usuário pedir)
function onPermViewChange(viewCheckbox){
  const tr=viewCheckbox.closest('tr');
  const writeCb=tr.querySelector('.perm-write'), deleteCb=tr.querySelector('.perm-delete');
  writeCb.disabled=deleteCb.disabled=!viewCheckbox.checked;
  if(!viewCheckbox.checked){ writeCb.checked=false; deleteCb.checked=false; }
}

function permissaoDoUsuario(userId, modulos){
  const base={gerenciarUsuarios:false};
  modulos.forEach(([k])=>base[k]={view:false, write:false, delete:false});
  const salvas=permissoesDoc && permissoesDoc.permissoes && permissoesDoc.permissoes[userId];
  if(salvas){
    modulos.forEach(([k])=>{ if(salvas[k]) base[k]=salvas[k]; });
    if(salvas.gerenciarUsuarios!==undefined) base.gerenciarUsuarios=salvas.gerenciarUsuarios;
  }
  return base;
}

function editarPermissoes(userId){
  const p=projetos.find(x=>x.id===PROJETO_ID);
  const u=usuariosSistema.find(x=>x.id===userId);
  if(!u) return;
  const modulos=modulosDoProjeto(p);
  const perm=permissaoDoUsuario(userId, modulos);
  modal('Permissões de '+u.nome,`
    <p class="card-note" style="margin-bottom:14px">Escolha o que ${escapeHtml(u.nome)} pode ver em cada módulo deste projeto — e, só onde puder ver, se também pode editar ou excluir. Configurações e Editar projeto continuam exclusivos do administrador, sempre.</p>
    <table>
      <thead><tr><th>Módulo</th><th style="text-align:center">Pode visualizar</th><th style="text-align:center">Pode editar</th><th style="text-align:center">Pode excluir</th></tr></thead>
      <tbody>
        ${modulos.map(([k,l])=>`<tr>
          <td>${l}</td>
          <td style="text-align:center"><input type="checkbox" class="perm-view" data-modulo="${k}" ${perm[k].view?'checked':''} onchange="onPermViewChange(this)"></td>
          <td style="text-align:center"><input type="checkbox" class="perm-write" data-modulo="${k}" ${(perm[k].view&&perm[k].write)?'checked':''} ${perm[k].view?'':'disabled'}></td>
          <td style="text-align:center"><input type="checkbox" class="perm-delete" data-modulo="${k}" ${(perm[k].view&&perm[k].delete)?'checked':''} ${perm[k].view?'':'disabled'}></td>
        </tr>`).join('')}
      </tbody>
    </table>
    <label style="display:flex;align-items:center;gap:8px;margin-top:18px;padding-top:16px;border-top:1px solid var(--line);font-size:13px;cursor:pointer">
      <input type="checkbox" id="perm-gerenciar-usuarios" ${perm.gerenciarUsuarios?'checked':''}>
      Pode gerenciar usuários e permissões deste projeto
    </label>
    <p class="card-note" style="margin-top:6px;margin-bottom:0">Passa a poder abrir esta página e editar as permissões de outros usuários — Configurações e Editar projeto continuam fora do alcance, e o administrador nunca é afetado.</p>
    <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--line)">
      <button class="mini-btn mini-btn-danger" onclick="removerAcesso(${userId},'${u.nome.replace(/'/g,"\\'")}')">Remover acesso ao projeto</button>
    </div>
  `,`<button class="btn" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" style="width:auto" onclick="salvarPermissoesModal(${userId})">Salvar permissões</button>`);
}
async function salvarPermissoesModal(userId){
  const permissoes={gerenciarUsuarios: $('#perm-gerenciar-usuarios').checked};
  document.querySelectorAll('.perm-view').forEach(cb=>{ permissoes[cb.dataset.modulo]={view:cb.checked, write:false, delete:false}; });
  // mesmo com a interface já impedindo, garante aqui de novo que write/delete nunca
  // fiquem true sem view (defesa extra, não confia só no estado dos checkboxes) —
  // o backend faz a mesma checagem, então essa é só uma segunda camada
  document.querySelectorAll('.perm-write').forEach(cb=>{ const pm=permissoes[cb.dataset.modulo]; pm.write=pm.view && cb.checked; });
  document.querySelectorAll('.perm-delete').forEach(cb=>{ const pm=permissoes[cb.dataset.modulo]; pm.delete=pm.view && cb.checked; });
  const btn=document.querySelector('#modalRoot .btn-primary');
  btn.disabled=true;
  try{
    permissoesDoc=await Api.permissions.definir(PROJETO_ID, userId, permissoes);
    closeModal();
    renderUsuariosContent();
  }catch(e){
    alert('Não foi possível salvar as permissões: '+e.message);
    btn.disabled=false;
  }
}
async function removerAcesso(userId, nome){
  if(!confirm(`Remover o acesso de "${nome}" a este projeto?`)) return;
  try{
    permissoesDoc=await Api.permissions.remover(PROJETO_ID, userId);
    closeModal();
    renderUsuariosContent();
  }catch(e){
    alert('Não foi possível remover o acesso: '+e.message);
  }
}

function abrirAdicionarUsuario(){
  const jaTemAcesso=new Set(Object.keys((permissoesDoc&&permissoesDoc.permissoes)||{}).map(Number));
  const disponiveis=usuariosSistema.filter(u=>!jaTemAcesso.has(u.id));
  if(!disponiveis.length){
    modal('Adicionar usuário',`<div class="empty">Todos os usuários do sistema já têm algum acesso a este projeto.</div>`,
      `<button class="btn" onclick="closeModal()">Fechar</button>`);
    return;
  }
  modal('Adicionar usuário',`
    <div class="fg full"><label>Usuário</label>
      <select id="add-user-select">${disponiveis.map(u=>`<option value="${u.id}">${escapeHtml(u.nome)} — ${escapeHtml(u.email)}</option>`).join('')}</select>
    </div>
    <p class="card-note" style="margin-top:14px">Depois de escolher, defina o que ele pode ver, editar ou excluir em cada módulo.</p>
  `,`<button class="btn" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" style="width:auto" onclick="continuarAdicionarUsuario()">Continuar</button>`);
}
function continuarAdicionarUsuario(){
  const userId=+$('#add-user-select').value;
  closeModal();
  editarPermissoes(userId);
}

function renderUsuariosContent(){
  const p=projetos.find(x=>x.id===PROJETO_ID);
  const modulos=modulosDoProjeto(p);
  const comAcesso=Object.keys((permissoesDoc&&permissoesDoc.permissoes)||{}).map(Number);
  $('#content').innerHTML=`
  <div class="card">
    <h3>Usuários com acesso a este projeto</h3>
    <p class="card-note">O administrador tem acesso completo e fixo — não muda por aqui. Cada outro usuário tem permissões por módulo, mais a opção de também gerenciar usuários e permissões deste projeto. Configurações e Editar projeto continuam exclusivos do administrador, sempre.</p>
    <table>
      <thead><tr><th>Usuário</th><th>Acesso</th><th></th></tr></thead>
      <tbody>
        <tr>
          <td><b>${escapeHtml(administrador.nome)}</b></td>
          <td><span class="badge b-and">Administrador — acesso completo</span></td>
          <td></td>
        </tr>
        ${comAcesso.map(userId=>{
          const u=usuariosSistema.find(x=>x.id===userId);
          if(!u) return '';
          const perm=permissaoDoUsuario(userId, modulos);
          return `<tr>
            <td><b>${escapeHtml(u.nome)}</b></td>
            <td style="font-size:12px">${resumoAcesso(perm, modulos)}</td>
            <td style="text-align:right"><button class="mini-btn" onclick="editarPermissoes(${userId})">Editar permissões</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="text-align:right;margin-top:18px;padding-top:16px;border-top:1px solid var(--line)">
      <button class="btn-primary" style="width:auto" onclick="abrirAdicionarUsuario()">+ Adicionar usuário</button>
    </div>
  </div>`;
}

async function initUsuariosPage(){
  await requireAuth();
  renderUserChip();
  PROJETO_ID=+new URLSearchParams(window.location.search).get('projeto');
  $('#content').innerHTML = `<div class="empty">Carregando…</div>`;
  let p;
  try{
    [p, usuariosSistema, permissoesDoc, administrador] = await Promise.all([
      Api.projects.buscar(PROJETO_ID),
      Api.users.listar(),
      Api.permissions.obter(PROJETO_ID),
      Api.users.administrador(),
      carregarPermissoes(PROJETO_ID),
    ]);
  }catch(e){
    window.location.href=withRole('projetos.html'); return;
  }
  const idx=projetos.findIndex(x=>x.id===PROJETO_ID);
  if(idx===-1) projetos.push(p); else projetos[idx]=p;

  const autorizado = ROLE==='gestor' || clientePodeGerenciarUsuarios(PROJETO_ID);
  if(!autorizado){ window.location.href=withRole('projetos.html'); return; }

  $('#nav').innerHTML = projectModulosNavHtml(p) + adminNavHtml(p.id,'usuarios', ROLE!=='gestor');
  $('#crumb').textContent='Projetos · '+p.nome;
  $('#pageTitle').textContent='Usuários e Permissões — '+p.nome;
  $('#topActions').innerHTML='';
  renderUsuariosContent();
}
