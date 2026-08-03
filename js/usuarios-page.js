/* =================== ADMIN: USUÁRIOS E PERMISSÕES ===================
   usuarios.html define o projeto via ?projeto=N na URL. Em vez de um papel fixo (Gestor/
   Cliente), cada usuário adicionado tem permissões granulares por módulo: pode editar
   (criar/alterar) e pode excluir, independentes uma da outra. Além dos módulos, dá pra
   autorizar alguém a "gerenciar usuários e permissões" deste projeto — passa a enxergar
   esta mesma página, mas nunca Configurações nem Editar projeto, e nunca pode alterar o
   administrador (ele tem acesso completo e fixo, sempre — ver USUARIO_DEMO/permissoesUsuario/
   clientePodeGerenciarUsuarios em helpers.js, compartilhados com projeto-page.js pra liberar
   o link de navegação certo). Convidar gente de verdade ainda depende do sistema de login e
   cadastro, que não existe — por enquanto só o usuário de demonstração fixo do protótipo
   (ver session.js/renderUserChip) pode ter as permissões editadas. */
let PROJETO_ID;

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

function editarPermissoes(pid){
  const p=projetos.find(x=>x.id===pid);
  const modulos=modulosDoProjeto(p);
  const perm=permissoesUsuario(pid, modulos);
  modal('Permissões de '+USUARIO_DEMO,`
    <p class="card-note" style="margin-bottom:14px">Escolha o que ${USUARIO_DEMO} pode ver em cada módulo deste projeto — e, só onde puder ver, se também pode editar ou excluir. Configurações e Editar projeto continuam exclusivos do administrador, sempre.</p>
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
  `,`<button class="btn" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" style="width:auto" onclick="salvarPermissoesModal(${pid})">Salvar permissões</button>`);
}
function salvarPermissoesModal(pid){
  const permissoes={gerenciarUsuarios: $('#perm-gerenciar-usuarios').checked};
  document.querySelectorAll('.perm-view').forEach(cb=>{ permissoes[cb.dataset.modulo]={view:cb.checked, write:false, delete:false}; });
  // even com a interface já impedindo, garante aqui de novo que write/delete nunca
  // fiquem true sem view (defesa extra, não confia só no estado dos checkboxes)
  document.querySelectorAll('.perm-write').forEach(cb=>{ const p=permissoes[cb.dataset.modulo]; p.write=p.view && cb.checked; });
  document.querySelectorAll('.perm-delete').forEach(cb=>{ const p=permissoes[cb.dataset.modulo]; p.delete=p.view && cb.checked; });
  salvarPermissoesUsuario(pid, permissoes);
  closeModal();
  renderUsuariosContent(pid);
}

function convidarUsuario(){
  alert('Disponível quando o sistema de login e cadastro de usuários estiver pronto — por enquanto só dá pra ajustar as permissões do usuário de demonstração.');
}

function renderUsuariosContent(pid){
  const p=projetos.find(x=>x.id===pid);
  const modulos=modulosDoProjeto(p);
  const perm=permissoesUsuario(pid, modulos);
  $('#content').innerHTML=`
  <div class="card">
    <h3>Usuários com acesso a este projeto</h3>
    <p class="card-note">O administrador tem acesso completo e fixo — não muda por aqui. Cada outro usuário tem permissões por módulo, mais a opção de também gerenciar usuários e permissões deste projeto. Configurações e Editar projeto continuam exclusivos do administrador, sempre.</p>
    <table>
      <thead><tr><th>Usuário</th><th>Acesso</th><th></th></tr></thead>
      <tbody>
        <tr>
          <td><b>Joyce Santos</b></td>
          <td><span class="badge b-and">Administrador — acesso completo</span></td>
          <td></td>
        </tr>
        <tr>
          <td><b>${USUARIO_DEMO}</b></td>
          <td style="font-size:12px">${resumoAcesso(perm, modulos)}</td>
          <td style="text-align:right"><button class="mini-btn" onclick="editarPermissoes(${pid})">Editar permissões</button></td>
        </tr>
      </tbody>
    </table>
    <div style="text-align:right;margin-top:18px;padding-top:16px;border-top:1px solid var(--line)">
      <button class="btn-primary" style="width:auto" onclick="convidarUsuario()">+ Adicionar usuário</button>
    </div>
  </div>`;
}

function initUsuariosPage(){
  requireAuth();
  renderUserChip();
  PROJETO_ID=+new URLSearchParams(window.location.search).get('projeto');
  const p=projetos.find(x=>x.id===PROJETO_ID);
  if(!p){ window.location.href=withRole('projetos.html'); return; }
  const autorizado = ROLE==='gestor' || clientePodeGerenciarUsuarios(PROJETO_ID);
  if(!autorizado){ window.location.href=withRole('projetos.html'); return; }
  $('#nav').innerHTML = projectModulosNavHtml(p) + adminNavHtml(p.id,'usuarios', ROLE!=='gestor');
  $('#crumb').textContent='Projetos · '+p.nome;
  $('#pageTitle').textContent='Usuários e Permissões — '+p.nome;
  $('#topActions').innerHTML='';
  renderUsuariosContent(PROJETO_ID);
}
