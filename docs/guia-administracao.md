# Guia de Administração — Portal Limiar

Este guia é para você, administradora do Portal Limiar. Ele cobre só as coisas que **não** dá pra fazer direto no site — o dia a dia normal (criar projeto, lançar relatório, editar cronograma...) já está todo lá, sem nada técnico envolvido.

## Índice

1. [O que você já resolve direto pelo site](#1-o-que-você-já-resolve-direto-pelo-site)
2. [Redefinir a senha de alguém (ou encerrar uma conta)](#2-redefinir-a-senha-de-alguém-ou-encerrar-uma-conta)
3. [Emergência: olhar os dados direto](#3-emergência-olhar-os-dados-direto)
4. [O que não é seu — continua com o André](#4-o-que-não-é-seu--continua-com-o-andré)

---

## 1. O que você já resolve direto pelo site

Praticamente tudo do dia a dia já está no próprio Portal Limiar, sem precisar de nada técnico:

- Criar, editar e arquivar projetos
- Criar um usuário novo e definir a senha inicial dele — **Admin → Usuários**
- Dar ou tirar acesso de alguém a um projeto específico — dentro do projeto, **Usuários e Permissões**
- Editar cronograma, financeiro, relatórios semanais (RDOs) e o catálogo de etapas/categorias de cada projeto

Se a tarefa que você precisa fazer está nessa lista, não precisa deste guia — é só usar o site normalmente.

## 2. Redefinir a senha de alguém (ou encerrar uma conta)

**Quando isso é necessário:** alguém esqueceu a senha (o site não tem "esqueci minha senha" de propósito — só a administradora define senha de outra pessoa) ou alguém saiu da equipe e a conta precisa ser encerrada de vez, liberando o e-mail.

Isso não dá pra fazer pelo site — precisa rodar um comando no computador. Uma vez configurado, leva menos de um minuto toda vez que precisar.

### Preparação (só na primeira vez)

1. **Instalar o Node.js.** Baixe em [nodejs.org](https://nodejs.org) (escolha a versão "LTS") e instale normalmente, clicando em "Avançar" até o fim.
2. **Ter a pasta do projeto no computador** (não só no site do Google Drive — precisa estar sincronizada numa pasta de verdade no seu computador).
3. **Confirmar que existe uma pasta chamada `key`** dentro da pasta do projeto, com um arquivo `.json` dentro dela. Esse arquivo é uma credencial poderosa — dá acesso completo aos dados do sistema.

   > ⚠️ **Nunca compartilhe esse arquivo com ninguém, nunca cole o conteúdo dele em e-mail, WhatsApp ou qualquer lugar.** Se desconfiar que alguém teve acesso a ele, avise o André imediatamente.

### Toda vez que precisar

1. Abra o terminal:
   - **Windows:** clique em Iniciar, digite `PowerShell`, abra o "Windows PowerShell"
   - **Mac:** abra o Spotlight (⌘+Espaço), digite `Terminal`, abra
2. Navegue até a pasta certa, digitando (ajustando o caminho pra onde a pasta realmente está no seu computador):
   ```
   cd caminho/até/o/projeto/scripts/firebase-admin
   ```
3. Na primeiríssima vez, rode:
   ```
   npm install
   ```
   (isso instala o que o comando precisa pra funcionar — só é necessário uma vez)
4. Pra **redefinir a senha** de alguém:
   ```
   node gerenciar-usuario.js redefinir-senha email-da-pessoa@exemplo.com NovaSenha123
   ```
   Troque `email-da-pessoa@exemplo.com` pelo e-mail de login da pessoa, e `NovaSenha123` pela nova senha (mínimo 6 caracteres). Avise a pessoa da nova senha por um canal seguro (não por onde qualquer um veria).

5. Pra **encerrar uma conta de vez** (a pessoa saiu da equipe):
   ```
   node gerenciar-usuario.js remover email-da-pessoa@exemplo.com
   ```
   Isso apaga a conta por completo e libera o e-mail. Se você só quer tirar o acesso dela dos projetos (sem apagar a conta), isso já é feito pelo próprio site, em **Admin → Usuários → Remover**.

## 3. Emergência: olhar os dados direto

Use isso **só** se algo estiver visivelmente errado no site, ninguém técnico estiver disponível, e não puder esperar.

1. Acesse [console.firebase.google.com](https://console.firebase.google.com), entre com a conta do Portal Limiar, abra o projeto **portal-limiar-api**.
2. No menu à esquerda, **Firestore Database** — é onde todos os dados do site moram, organizados em pastas (chamadas de "coleções"):

   | O que você vê lá | O que é |
   |---|---|
   | `projects` | os projetos |
   | `users` | nome e e-mail de cada usuário (a senha fica em outro lugar, escondida) |
   | `cronogramas` | o cronograma de cada projeto |
   | `financeiro` | os gastos de cada projeto |
   | `projects` → um projeto → `rdos` | os relatórios semanais daquele projeto |
   | `projectCatalog` | etapas/categorias personalizadas de cada projeto |

   > ⚠️ Editar aqui direto **pula todas as verificações que o site normalmente faz** — é fácil deixar algo inconsistente sem perceber. Prefira sempre esperar ajuda técnica se tiver qualquer dúvida.

## 4. O que não é seu — continua com o André

- Mudanças em como o site funciona (código)
- Atualizações do Apps Script
- Qualquer coisa que pareça quebrada de um jeito estranho — me chama antes de tentar mexer, mesmo que ache que sabe o que fazer

---

*Guia preparado para o Portal Limiar. Em caso de dúvida sobre qualquer passo aqui, chame o André antes de continuar.*
