/* =================== SENHAS ===================
   Apps Script não tem bcrypt/scrypt/argon2 embutido — só o que o Utilities
   dá: computeDigest. Por isso o hash aqui é SHA-256 com salt aleatório por
   usuário, não uma função lenta de derivação de chave. É uma segurança
   "razoável contra quem não sabe invadir", não à prova de um ataque sério
   e dedicado (sem stretching, sem rate-limit de tentativas) — proporcional
   ao que foi pedido, não uma promessa de nível bancário. Nunca guardar a
   senha em texto puro em lugar nenhum, só hashSenha_(senha, salt). */
function gerarSalt_(){
  return Utilities.getUuid();
}

function hashSenha_(senha, salt){
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt+senha, Utilities.Charset.UTF_8);
  // computeDigest devolve bytes COM SINAL (-128..127) — precisa converter
  // pra 0..255 antes de virar hex, senão bytes negativos viram lixo
  return bytes.map(function(b){
    const v = (b<0 ? b+256 : b).toString(16);
    return v.length===1 ? '0'+v : v;
  }).join('');
}

function verificarSenha_(senhaDigitada, salt, hashEsperado){
  if(!senhaDigitada || !salt || !hashEsperado) return false;
  return hashSenha_(senhaDigitada, salt) === hashEsperado;
}
