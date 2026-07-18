# Vila Olinda — App do Time

App do time (partidas, escalação, elenco, estatísticas) rodando como PWA (instalável no celular), com dados salvos no Firebase Firestore.

## Rodar localmente
```
npm install
npm run dev
```

## Publicar
```
npm run build
```
O resultado fica na pasta `dist/`, pronta para hospedar (Vercel, Netlify, etc).

## Configuração do Firebase
As credenciais do projeto Firebase estão em `src/firebaseClient.js`. Elas não são secretas — a segurança real vem das Regras (Rules) do Firestore, configuradas no console do Firebase.
