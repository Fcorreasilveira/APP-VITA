# APP VITA

Aplicativo mobile construído com [Expo](https://expo.dev) + React Native + TypeScript, usando o [Expo Router](https://docs.expo.dev/router/introduction/) para navegação.

## Como rodar

```bash
npm install
npm start
```

Isso abre o Expo Dev Tools. A partir dali é possível abrir o app:

- No celular, escaneando o QR code com o app **Expo Go**
- Em um emulador Android: `npm run android`
- Em um simulador iOS: `npm run ios`
- No navegador: `npm run web`

## Estrutura

```
app/
  _layout.tsx   # layout raiz e navegação (Expo Router)
  index.tsx     # tela inicial
assets/         # ícones e imagens do app
app.json        # configuração do Expo (nome, ícone, bundle id, etc.)
```

## Próximos passos

- Definir a identidade visual (ícone, splash screen, cores) em `app.json` e `assets/`
- Adicionar novas telas dentro de `app/`
- Configurar autenticação, API e armazenamento conforme a necessidade do produto
