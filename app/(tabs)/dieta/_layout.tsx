import { Stack } from "expo-router";
import { colors } from "../../../src/theme";

export default function DietaLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.textPrimary,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Dieta" }} />
      <Stack.Screen name="plano" options={{ title: "Plano alimentar" }} />
      <Stack.Screen name="alimentos" options={{ title: "Alimentos" }} />
      <Stack.Screen name="registrar" options={{ title: "Registrar refeição" }} />
    </Stack>
  );
}
