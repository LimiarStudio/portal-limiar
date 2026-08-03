/* =================== MODAL CORE =================== */
function modal(title,body,foot){
  $('#modalRoot').innerHTML=`<div class="overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal"><div class="modal-head"><h2>${title}</h2><button class="x" onclick="closeModal()">×</button></div>
    <div class="modal-body">${body}</div><div class="modal-foot">${foot}</div></div></div>`;
}
function closeModal(){$('#modalRoot').innerHTML='';}
