import { Stack } from "expo-router";
import { colors } from "../../../src/theme";

export default function PerfilLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.textPrimary,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Perfil" }} />
    </Stack>
  );
}
