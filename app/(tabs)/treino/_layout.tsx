import { Stack } from "expo-router";
import { colors } from "../../../src/theme";

export default function TreinoLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.textPrimary,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Treino" }} />
      <Stack.Screen name="plano/[id]" options={{ title: "Plano de treino" }} />
      <Stack.Screen
        name="executar/[id]"
        options={{ title: "Executar treino" }}
      />
      <Stack.Screen name="historico" options={{ title: "Histórico" }} />
    </Stack>
  );
}
