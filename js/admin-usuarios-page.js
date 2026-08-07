/* =================== ADMIN (SISTEMA): USUÁRIOS ===================
   Cadastro de contas de acesso ao Portal Limiar, em nível de sistema (não de um projeto
   específico — para isso, ver a página "Usuários e Permissões" de cada projeto). Sem papel
   fixo por usuário — o administrador é uma conta única e fixa (acesso completo, nunca
   editável/removível por aqui); todo mundo mais é só "um usuário", e o que cada um pode
   fazer em cada projeto é decidido lá, em Usuários e Permissões.

   Senha é sempre coisa do administrador: só ele define/troca a senha de um usuário (nunca
   o próprio usuário, não há autoatendimento) — e a dele mesmo nunca é editável por aqui,
   em lugar nenhum da tela; só na mão, fora do site (ver backend/src/Seed.js). Remover um
   usuário também é só o administrador — perde acesso a todos os projetos imediatamente. */
let administrador = null;
let usuariosSistema = [];

async function adicionarUsuario(){
  const nome=$('#nu-nome').value.trim(), email=$('#nu-email').value.trim(), senha=$('#nu-senha').value;
  if(!nome||!email){alert('Informe nome e e-mail.');return;}
  if(senha.length<6){alert('A senha precisa ter pelo menos 6 caracteres.');return;}
  const btn=$('#nu-btn');
  btn.disabled=true;
  try{
    const novo=await Api.users.criar({nome, email, senha});
    usuariosSistema.push(novo);
    $('#nu-nome').value=''; $('#nu-email').value=''; $('#nu-senha').value='';
    renderAdminUsuariosContent();
  }catch(e){
    alert('Não foi possível adicionar o usuário: '+e.message);
  }finally{
    btn.disabled=false;
  }
}

function editarUsuario(id){
  const u=usuariosSistema.find(x=>x.id===id);
  if(!u) return;
  modal('Editar usuário', `
    <div class="form-grid">
      <div class="fg"><label>Nome</label><input id="eu-nome" value="${escapeHtml(u.nome)}"></div>
      <div class="fg"><label>E-mail</label><input id="eu-email" type="email" value="${escapeHtml(u.email)}"></div>
    </div>
    <div class="fg full" style="margin-top:14px"><label>Nova senha</label><input id="eu-senha" type="password" placeholder="Deixe em branco para manter a senha atual" autocomplete="new-password"></div>
    <p class="card-note" style="margin-top:6px;margin-bottom:0">Só o administrador pode definir a senha de um usuário — não existe troca de senha pelo próprio usuário.</p>
    <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--line)">
      <button class="mini-btn mini-btn-danger" onclick="removerUsuario(${id},'${u.nome.replace(/'/g,"\\'")}')">Remover usuário</button>
    </div>
  `,`<button class="btn" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" style="width:auto" onclick="salvarEdicaoUsuario(${id})">Salvar alterações</button>`);
}
async function salvarEdicaoUsuario(id){
  const nome=$('#eu-nome').value.trim(), email=$('#eu-email').value.trim(), senha=$('#eu-senha').value;
  if(!nome||!email){alert('Informe nome e e-mail.');return;}
  if(senha && senha.length<6){alert('A nova senha precisa ter pelo menos 6 caracteres.');return;}
  const btn=document.querySelector('#modalRoot .btn-primary');
  btn.disabled=true;
  try{
    const atualizado=await Api.users.atualizar(id, {nome, email});
    if(senha) await Api.users.redefinirSenha(id, senha);
    const idx=usuariosSistema.findIndex(x=>x.id===id);
    if(idx!==-1) usuariosSistema[idx]=atualizado;
    closeModal();
    renderAdminUsuariosContent();
  }catch(e){
    alert('Não foi possível salvar as alterações: '+e.message);
    btn.disabled=false;
  }
}
async function removerUsuario(id, nome){
  if(!confirm(`Remover o usuário "${nome}"? Ele perde acesso a todos os projetos imediatamente. Essa ação não pode ser desfeita.`)) return;
  try{
    await Api.users.remover(id);
    usuariosSistema=usuariosSistema.filter(x=>x.id!==id);
    closeModal();
    renderAdminUsuariosContent();
  }catch(e){
    alert('Não foi possível remover o usuário: '+e.message);
  }
}

function renderAdminUsuariosContent(){
  $('#content').innerHTML=`
  <div class="card">
    <h3>Usuários do sistema</h3>
    <p class="card-note">O administrador tem acesso completo e fixo a tudo — não é um papel que se escolhe, e não pode ser removido nem alterado aqui (nem a própria senha dele — isso é feito fora do site). Todo outro usuário tem acesso a cada projeto de acordo com o que for definido em Usuários e Permissões, dentro do próprio projeto, e só o administrador pode definir ou trocar a senha de qualquer um deles, ou removê-lo.</p>
    <table>
      <thead><tr><th>Nome</th><th>E-mail</th><th></th></tr></thead>
      <tbody>
        <tr>
          <td><b>${escapeHtml(administrador.nome)}</b></td>
          <td class="mut">${escapeHtml(administrador.email)}</td>
          <td style="text-align:right"><span class="badge b-and">Administrador — acesso completo</span></td>
        </tr>
        ${usuariosSistema.map(u=>`<tr>
          <td><b>${escapeHtml(u.nome)}</b></td>
          <td class="mut">${escapeHtml(u.email)}</td>
          <td style="text-align:right"><button class="mini-btn" onclick="editarUsuario(${u.id})">Editar</button></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="card">
    <h3>Adicionar usuário</h3>
    <p class="card-note">Convide alguém para acessar o Portal Limiar. O acesso a projetos específicos — e o que cada um pode fazer neles — é definido depois, em Usuários e Permissões, dentro de cada projeto.</p>
    <div class="form-grid">
      <div class="fg"><label>Nome</label><input id="nu-nome" placeholder="Nome completo"></div>
      <div class="fg"><label>E-mail</label><input id="nu-email" type="email" placeholder="nome@email.com"></div>
      <div class="fg full"><label>Senha</label><input id="nu-senha" type="password" placeholder="Mínimo de 6 caracteres" autocomplete="new-password"></div>
    </div>
    <p class="card-note" style="margin-top:10px;margin-bottom:0">A senha é definida aqui, pelo administrador, e só ele pode trocá-la depois — não há troca de senha pelo próprio usuário.</p>
    <div style="display:flex;justify-content:flex-end;margin-top:18px;padding-top:16px;border-top:1px solid var(--line)">
      <button class="btn-primary" id="nu-btn" style="width:auto" onclick="adicionarUsuario()">+ Adicionar usuário</button>
    </div>
  </div>`;
}

async function initAdminUsuariosPage(){
  await requireAuth();
  renderUserChip();
  if(ROLE!=='gestor'){ window.location.href=withRole('projetos.html'); return; }
  buildNavProjetos('usuarios');
  $('#crumb').textContent='Início · Admin';
  $('#pageTitle').textContent='Usuários';
  $('#topActions').innerHTML='';
  $('#content').innerHTML=`<div class="empty">Carregando…</div>`;
  try{
    [administrador, usuariosSistema] = await Promise.all([
      Api.users.administrador(),
      Api.users.listar(),
    ]);
  }catch(e){
    $('#content').innerHTML=`<div class="card"><div class="empty">${escapeHtml(e.message)}</div></div>`;
    return;
  }
  renderAdminUsuariosContent();
}
