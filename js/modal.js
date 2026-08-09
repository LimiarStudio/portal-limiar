/* =================== MODAL CORE =================== */
function modal(title,body,foot){
  $('#modalRoot').innerHTML=`<div class="overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal"><div class="modal-head"><h2>${title}</h2><button class="x" onclick="closeModal()">×</button></div>
    <div class="modal-body">${body}</div><div class="modal-foot">${foot}</div></div></div>`;
}
function closeModal(){$('#modalRoot').innerHTML='';}

/* =================== LIGHTBOX (foto ampliada) ===================
   Compartilhado por qualquer tela com fotos clicáveis (RDO, lançamentos do
   financeiro...) — recebe src/legenda prontos em vez de ler de um array
   global da página, pra não acoplar este arquivo (carregado em toda página
   do app) a uma estrutura específica de uma tela só. */
function abrirLightbox(src, cap){
  if(!src) return;
  $('#modalRoot').innerHTML = `<div class="overlay lightbox-overlay" onclick="if(event.target===this)fecharLightbox_()">
    <div class="lightbox-inner">
      <button class="lightbox-close" onclick="fecharLightbox_()">×</button>
      <img class="lightbox-img" src="${src}" alt="${escapeHtml(cap||'')}">
      ${cap?`<div class="lightbox-cap">${escapeHtml(cap)}</div>`:''}
    </div>
  </div>`;
  document.addEventListener('keydown', fecharLightboxNoEsc_);
}
// todo caminho de fechar (x, clique fora, Esc) passa por aqui — só o Esc
// teria caminho próprio pra remover o listener, então centraliza pra não
// vazar um listener de keydown a cada foto aberta
function fecharLightbox_(){
  closeModal();
  document.removeEventListener('keydown', fecharLightboxNoEsc_);
}
function fecharLightboxNoEsc_(e){
  if(e.key==='Escape') fecharLightbox_();
}
