import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  Card,
  DangerButton,
  EmptyState,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionTitle,
} from "../../../src/components/ui";
import { WorkoutPlan } from "../../../src/models/types";
import {
  listWorkoutPlans,
  removeWorkoutPlan,
} from "../../../src/storage/repository";
import { colors } from "../../../src/theme";

export default function TreinoScreen() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);

  const load = useCallback(async () => {
    setPlans(await listWorkoutPlans());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const muscleSummary = (plan: WorkoutPlan) => {
    const groups = Array.from(new Set(plan.exercises.map((e) => e.muscleGroup)));
    return groups.length ? groups.join(", ") : "Sem exercícios";
  };

  const onDelete = (plan: WorkoutPlan) => {
    Alert.alert("Excluir plano", `Excluir "${plan.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await removeWorkoutPlan(plan.id);
          load();
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle>Meus planos de treino</SectionTitle>
      </View>

      {plans.length === 0 ? (
        <Card>
          <EmptyState text="Você ainda não tem planos de treino. Crie um plano definindo os exercícios e grupos musculares alvo." />
        </Card>
      ) : (
        plans.map((plan) => (
          <Card key={plan.id}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary }}>
              {plan.name}
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              {plan.exercises.length} exercício(s) · {muscleSummary(plan)}
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title="Treinar"
                  onPress={() => router.push(`/treino/executar/${plan.id}`)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SecondaryButton
                  title="Editar"
                  onPress={() => router.push(`/treino/plano/${plan.id}`)}
                />
              </View>
            </View>
            <DangerButton title="Excluir plano" onPress={() => onDelete(plan)} />
          </Card>
        ))
      )}

      <PrimaryButton
        title="+ Novo plano de treino"
        onPress={() => router.push("/treino/plano/novo")}
      />
      <SecondaryButton
        title="Ver histórico de treinos"
        onPress={() => router.push("/treino/historico")}
      />
    </Screen>
  );
}
