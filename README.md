# VITA — Treino e Dieta

App web (PWA) de treino, dieta, cardio e perfil, com conta na nuvem via Supabase.

## O que já está pronto

- `index.html`, `styles.css`, `app.js` — o app inteiro (single-page app em JS puro).
- `app-cloud.js` — autenticação (e-mail/senha) e sincronização de dados com o Supabase.
- `supabase-config.js` — URL e chave pública do seu projeto Supabase (já preenchidas).
- `supabase/schema.sql` — script SQL que cria a tabela de dados no Supabase.
- `manifest.json`, `icons/`, `sw.js` — PWA instalável, com ícone próprio e atualização de versão automática via service worker.
- `exercise-photos/` — fotos reais dos 70 exercícios do catálogo.

## Passo a passo para colocar no ar

### 1. Banco de dados (Supabase) — já criado

Projeto: `https://yoirelteebttnbligdrl.supabase.co` (já configurado em `supabase-config.js`).

Falta rodar o SQL que cria a tabela de dados:

1. Abra o [painel do Supabase](https://app.supabase.com) → seu projeto → **SQL Editor**.
2. Cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Em **Authentication → Providers**, confirme que **Email** está habilitado (vem habilitado por padrão).
4. (Opcional, recomendado para testar rápido) Em **Authentication → Settings**, você pode desativar "Confirm email" temporariamente para não precisar confirmar e-mail a cada teste de cadastro.

### 2. Publicar no Vercel

1. Crie uma conta em [vercel.com](https://vercel.com) (dá pra entrar direto com sua conta do GitHub).
2. Clique em **Add New → Project** e selecione o repositório `Fcorreasilveira/APP-VITA`.
3. Como é um site estático puro (sem build), pode deixar as configurações padrão — não precisa de "Build Command" nem "Output Directory" especiais (ou configure Build Command vazio e Output Directory como `.`, se o Vercel pedir).
4. Clique em **Deploy**.
5. Em poucos segundos você terá uma URL tipo `app-vita.vercel.app` já funcionando, com HTTPS.
6. (Opcional) Em **Settings → Domains**, você pode ligar um domínio próprio (ex: `vitaapp.com.br`) se tiver um.

Depois disso, **toda vez que uma alteração for enviada (push) para o branch `main`, o Vercel publica a nova versão automaticamente** — é isso que resolve a "atualização de versões" que você pediu.

### 3. Testar

1. Abra a URL publicada.
2. Crie uma conta (e-mail + senha).
3. Complete o onboarding (perfil).
4. Use o app normalmente — os dados agora ficam salvos na nuvem, e abrir a mesma conta em outro aparelho traz os mesmos dados.
5. Para instalar como app: no celular, abra a URL no navegador e use "Adicionar à tela de início" (o ícone e nome do app já vêm configurados).

## Sobre o ícone

O ícone atual (`icons/icon-192.png` e `icons/icon-512.png`) é o mesmo usado durante o desenvolvimento no protótipo. Se quiser um ícone definitivo diferente, é só substituir esses dois arquivos (mantendo os mesmos nomes e tamanhos) e fazer um novo commit.

## Limitações atuals (próximos passos possíveis)

- Login é só e-mail/senha por enquanto (dá pra adicionar Google/Apple depois via Supabase Auth).
- Não está em nenhuma loja de app (App Store / Google Play) — hoje é um PWA instalável pelo navegador. Publicar nas lojas de verdade é um projeto à parte (embrulhar com Capacitor/Cordova, contas de desenvolvedor Apple/Google, etc).
