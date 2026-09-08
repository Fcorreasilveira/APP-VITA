import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import {
  Card,
  EmptyState,
  PrimaryButton,
  ProgressBar,
  Screen,
  SecondaryButton,
  SectionTitle,
} from "../../../src/components/ui";
import { DietLogEntry, DietPlan } from "../../../src/models/types";
import { getDietPlan, listDietLogs, removeDietLog } from "../../../src/storage/repository";
import { todayStr } from "../../../src/utils/date";
import { colors } from "../../../src/theme";

export default function DietaScreen() {
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [todayLogs, setTodayLogs] = useState<DietLogEntry[]>([]);

  const load = useCallback(async () => {
    const [p, logs] = await Promise.all([getDietPlan(), listDietLogs()]);
    setPlan(p);
    setTodayLogs(logs.filter((l) => l.date === todayStr()));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!plan) return null;

  const totals = todayLogs.reduce(
    (acc, l) => ({
      kcal: acc.kcal + l.kcal,
      protein: acc.protein + l.proteinG,
      carbs: acc.carbs + l.carbsG,
      fat: acc.fat + l.fatG,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <Screen>
      <Card>
        <SectionTitle>Hoje</SectionTitle>
        <Row label="Calorias" value={`${Math.round(totals.kcal)} / ${plan.targetKcal} kcal`} />
        <ProgressBar value={totals.kcal} max={plan.targetKcal} color={colors.primary} />
        <Row label="Proteína" value={`${Math.round(totals.protein)} / ${plan.targetProteinG} g`} />
        <ProgressBar value={totals.protein} max={plan.targetProteinG} color={colors.protein} />
        <Row label="Carboidrato" value={`${Math.round(totals.carbs)} / ${plan.targetCarbsG} g`} />
        <ProgressBar value={totals.carbs} max={plan.targetCarbsG} color={colors.carbs} />
        <Row label="Gordura" value={`${Math.round(totals.fat)} / ${plan.targetFatG} g`} />
        <ProgressBar value={totals.fat} max={plan.targetFatG} color={colors.fat} />
        <PrimaryButton title="Registrar alimentação" onPress={() => router.push("/dieta/registrar")} />
      </Card>

      <Card>
        <SectionTitle>Plano alimentar</SectionTitle>
        {plan.meals.length === 0 ? (
          <EmptyState text="Você ainda não montou seu plano de refeições." />
        ) : (
          plan.meals.map((meal) => (
            <View key={meal.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{meal.name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {meal.items.length === 0
                  ? "Sem alimentos"
                  : meal.items.map((it) => `${it.foodName} (${it.grams}g)`).join(", ")}
              </Text>
            </View>
          ))
        )}
        <SecondaryButton title="Editar plano alimentar" onPress={() => router.push("/dieta/plano")} />
        <SecondaryButton title="Gerenciar alimentos" onPress={() => router.push("/dieta/alimentos")} />
      </Card>

      <Card>
        <SectionTitle>Registrado hoje</SectionTitle>
        {todayLogs.length === 0 ? (
          <EmptyState text="Nenhum alimento registrado hoje." />
        ) : (
          todayLogs.map((log) => (
            <View
              key={log.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 6,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ color: colors.textPrimary }}>
                {log.foodName} · {log.grams}g
              </Text>
              <Text
                style={{ color: colors.danger, fontWeight: "600" }}
                onPress={async () => {
                  await removeDietLog(log.id);
                  load();
                }}
              >
                remover
              </Text>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: colors.textSecondary }}>{label}</Text>
      <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{value}</Text>
    </View>
  );
}
