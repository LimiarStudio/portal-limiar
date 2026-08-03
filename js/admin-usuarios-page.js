/* =================== ADMIN (SISTEMA): USUÁRIOS ===================
   Cadastro de contas de acesso ao Portal Limiar, em nível de sistema (não de um projeto
   específico — para isso, ver a página "Usuários e Permissões" de cada projeto). Ainda não
   funciona de verdade: falta um banco de dados e um sistema de login real por trás. Sem
   papel fixo por usuário — o administrador é uma conta única e fixa (acesso completo,
   nunca editável/removível por aqui); todo mundo mais é só "um usuário", e o que cada um
   pode fazer em cada projeto é decidido lá, em Usuários e Permissões. */
const ADMINISTRADOR = {nome:'Joyce Santos', email:'joyce@limiar.com.br'};
const USUARIOS_SISTEMA_DEMO = [
  {nome:'João Costa', email:'joao.costa@email.com'},
];

function usuarioIndisponivel(){
  alert('Ainda não temos um banco de dados de usuários — esse cadastro é só uma prévia de como vai funcionar quando o login/cadastro real estiver pronto.');
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
    <p class="card-note">O administrador tem acesso completo e fixo a tudo — não é um papel que se escolhe, e não pode ser removido nem alterado aqui. Todo outro usuário tem acesso a cada projeto de acordo com o que for definido em Usuários e Permissões, dentro do próprio projeto. Esse cadastro ainda é só uma prévia — falta um banco de dados e um sistema de login/cadastro reais por trás.</p>
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
          <td style="text-align:right"><button class="mini-btn" onclick="usuarioIndisponivel()">Editar</button></td>
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
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:18px;padding-top:16px;border-top:1px solid var(--line)">
      <button class="btn-primary" style="width:auto" onclick="usuarioIndisponivel()">+ Adicionar usuário</button>
    </div>
  </div>`;
}
