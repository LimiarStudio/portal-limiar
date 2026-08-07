/* =================== FIREBASE INIT ===================
   Config do Web App do Firebase — não é segredo (a segurança de verdade vem
   das Firestore Security Rules e da própria Firebase Authentication, não de
   esconder isto), por isso pode ficar em texto puro aqui. Este arquivo só
   inicializa o app; carregado depois dos <script> do SDK compat (firebase-app-
   compat.js/firebase-auth-compat.js/firebase-firestore-compat.js) e antes de
   qualquer coisa que use `firebase.auth()`/`firebase.firestore()` — mesma
   posição que js/api.js ocupava antes dele nos <script> de cada página. SDK
   "compat" (não o modular/ES-module) de propósito: o site inteiro é script
   solto sem bundler, e o compat expõe o mesmo `firebase.*` global que
   qualquer outro arquivo aqui já espera poder chamar direto. */
const firebaseConfig = {
  apiKey: "AIzaSyBcnud0ZuzNt066KQa9OUtlc1a7KozjTOc",
  authDomain: "portal-limiar-api.firebaseapp.com",
  projectId: "portal-limiar-api",
  storageBucket: "portal-limiar-api.firebasestorage.app",
  messagingSenderId: "1022331539482",
  appId: "1:1022331539482:web:0d3659c4baf99e75dbc1a3",
  measurementId: "G-4QC3J05C4X",
};
firebase.initializeApp(firebaseConfig);
