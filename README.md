# APP VITA

Aplicativo mobile de treino e dieta, construído com [Expo](https://expo.dev) + React Native + TypeScript, usando [Expo Router](https://docs.expo.dev/router/introduction/) para navegação.

## Funcionalidades

- **Treino**: montar planos de treino por grupo muscular (exercícios, séries, repetições, carga alvo), executar o treino registrando peso/reps de cada série e consultar o histórico com volume total.
- **Dieta**: definir metas diárias de calorias e macronutrientes (manual ou calculada a partir do perfil), montar refeições com uma biblioteca de alimentos (kcal/macros por 100g) e registrar a alimentação do dia comparando com a meta.
- **Água**: acompanhar o consumo diário de água com metas e atalhos de registro rápido.
- **Cardio**: planejar sessões (tipo, duração e distância alvo) e registrar a execução real.
- **Perfil e análise calórica**: dados do usuário (idade, altura, peso, % de gordura, nível de atividade e objetivo), histórico de composição corporal e cálculo de TMB/gasto calórico total (TDEE) e meta de calorias/macros.

Todos os dados ficam salvos localmente no dispositivo (AsyncStorage) — não há backend nesta primeira versão.

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
  _layout.tsx           # layout raiz (Expo Router)
  (tabs)/                # navegação em abas
    index.tsx            # dashboard (calorias, água, treino/cardio do dia)
    treino/               # planos, execução e histórico de treino
    dieta/                # plano alimentar, alimentos e registro diário
    cardio/               # planejamento e registro de cardio
    perfil/               # perfil do usuário e análise calórica
src/
  models/types.ts        # tipos de domínio (treino, dieta, cardio, perfil...)
  storage/                # persistência local (AsyncStorage) e repositórios CRUD
  utils/                  # cálculo de TMB/TDEE/macros, datas, ids
  components/ui.tsx       # componentes visuais reutilizáveis
  theme.ts                # cores e espaçamentos
assets/                   # ícones e imagens do app (a definir)
app.json                  # configuração do Expo
```

## Próximos passos sugeridos

- Definir identidade visual (ícone, splash screen) em `assets/` e `app.json`
- Gráficos de evolução (peso, calorias, volume de treino) ao longo do tempo
- Sincronização em nuvem / backend, caso o app precise funcionar em múltiplos dispositivos
- Notificações para lembrar de beber água ou registrar refeições/treinos
