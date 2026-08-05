/* =================== ADMIN (SISTEMA): USUÁRIOS ===================
   Cadastro de contas de acesso ao Portal Limiar, em nível de sistema (não de um projeto
   específico — para isso, ver a página "Usuários e Permissões" de cada projeto). Ainda não
   funciona de verdade: falta um banco de dados e um sistema de login real por trás. Sem
   papel fixo por usuário — o administrador é uma conta única e fixa (acesso completo,
   nunca editável/removível por aqui); todo mundo mais é só "um usuário", e o que cada um
   pode fazer em cada projeto é decidido lá, em Usuários e Permissões.

   Senha é sempre coisa do administrador: só ele define/troca a senha de um usuário (nunca
   o próprio usuário, não há autoatendimento) — e a dele mesmo nunca é editável por aqui,
   em lugar nenhum da tela; só na mão, fora do site (ver backend/src/Seed.js). */
const ADMINISTRADOR = {nome:'Joyce Santos', email:'joyce@limiar.com.br'};
const USUARIOS_SISTEMA_DEMO = [
  {nome:'João Costa', email:'joao.costa@email.com'},
];

function usuarioIndisponivel(){
  alert('Ainda não temos um banco de dados de usuários — esse cadastro é só uma prévia de como vai funcionar quando o login/cadastro real estiver pronto.');
}

// valida como o backend real vai validar (nome/e-mail obrigatórios, senha
// com pelo menos 6 caracteres) antes de mostrar o aviso de "ainda não
// funciona" — a prévia já se comporta como o cadastro de verdade vai se comportar
function adicionarUsuarioPreview(){
  const nome=$('#nu-nome').value.trim(), email=$('#nu-email').value.trim(), senha=$('#nu-senha').value;
  if(!nome||!email){alert('Informe nome e e-mail.');return;}
  if(senha.length<6){alert('A senha precisa ter pelo menos 6 caracteres.');return;}
  usuarioIndisponivel();
}

function editarUsuario(nome, email){
  modal('Editar usuário', `
    <div class="form-grid">
      <div class="fg"><label>Nome</label><input id="eu-nome" value="${escapeHtml(nome)}"></div>
      <div class="fg"><label>E-mail</label><input id="eu-email" type="email" value="${escapeHtml(email)}"></div>
    </div>
    <div class="fg full" style="margin-top:14px"><label>Nova senha</label><input id="eu-senha" type="password" placeholder="Deixe em branco para manter a senha atual" autocomplete="new-password"></div>
    <p class="card-note" style="margin-top:6px;margin-bottom:0">Só o administrador pode definir a senha de um usuário — não existe troca de senha pelo próprio usuário.</p>
  `,`<button class="btn" onclick="closeModal()">Cancelar</button>
     <button class="btn-primary" style="width:auto" onclick="salvarEdicaoUsuarioPreview()">Salvar alterações</button>`);
}
function salvarEdicaoUsuarioPreview(){
  const nome=$('#eu-nome').value.trim(), email=$('#eu-email').value.trim(), senha=$('#eu-senha').value;
  if(!nome||!email){alert('Informe nome e e-mail.');return;}
  if(senha && senha.length<6){alert('A nova senha precisa ter pelo menos 6 caracteres.');return;}
  closeModal();
  usuarioIndisponivel();
}

function initAdminUsuariosPage(){
  requireAuth();
  renderUserChip();
  if(ROLE!=='gestor'){ window.location.href=withRole('projetos.html'); return; }
  buildNavProjetos('usuarios');
  $('#crumb').textContent='Início · Admin';
  $('#pageTitle').textContent='Usuários';
  $('#topActions').innerHTML='';
  $('#content').innerHTML=`
  <div class="card">
    <h3>Usuários do sistema</h3>
    <p class="card-note">O administrador tem acesso completo e fixo a tudo — não é um papel que se escolhe, e não pode ser removido nem alterado aqui (nem a própria senha dele — isso é feito fora do site). Todo outro usuário tem acesso a cada projeto de acordo com o que for definido em Usuários e Permissões, dentro do próprio projeto, e só o administrador pode definir ou trocar a senha de qualquer um deles. Esse cadastro ainda é só uma prévia — falta ligar isso a um banco de dados de verdade.</p>
    <table>
      <thead><tr><th>Nome</th><th>E-mail</th><th></th></tr></thead>
      <tbody>
        <tr>
          <td><b>${ADMINISTRADOR.nome}</b></td>
          <td class="mut">${ADMINISTRADOR.email}</td>
          <td style="text-align:right"><span class="badge b-and">Administrador — acesso completo</span></td>
        </tr>
        ${USUARIOS_SISTEMA_DEMO.map(u=>`<tr>
          <td><b>${u.nome}</b></td>
          <td class="mut">${u.email}</td>
          <td style="text-align:right"><button class="mini-btn" onclick="editarUsuario('${u.nome.replace(/'/g,"\\'")}','${u.email}')">Editar</button></td>
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
      <button class="btn-primary" style="width:auto" onclick="adicionarUsuarioPreview()">+ Adicionar usuário</button>
    </div>
  </div>`;
}
