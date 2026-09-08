import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  Card,
  Field,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionTitle,
} from "../../../../src/components/ui";
import { WorkoutLogEntry, WorkoutPlan } from "../../../../src/models/types";
import { addWorkoutLog, getWorkoutPlan } from "../../../../src/storage/repository";
import { todayStr } from "../../../../src/utils/date";
import { colors } from "../../../../src/theme";

interface SetInput {
  reps: string;
  weightKg: string;
}

interface ExerciseExecution {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: WorkoutLogEntry["muscleGroup"];
  sets: SetInput[];
}

export default function ExecuteWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [execution, setExecution] = useState<ExerciseExecution[]>([]);

  useEffect(() => {
    getWorkoutPlan(id).then((p) => {
      if (!p) return;
      setPlan(p);
      setExecution(
        p.exercises.map((ex) => ({
          exerciseId: ex.id,
          exerciseName: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: Array.from({ length: ex.targetSets }, () => ({
            reps: String(ex.targetReps),
            weightKg: ex.targetLoadKg != null ? String(ex.targetLoadKg) : "",
          })),
        }))
      );
    });
  }, [id]);

  const updateSet = (exIdx: number, setIdx: number, patch: Partial<SetInput>) => {
    setExecution((prev) => {
      const next = [...prev];
      const sets = [...next[exIdx].sets];
      sets[setIdx] = { ...sets[setIdx], ...patch };
      next[exIdx] = { ...next[exIdx], sets };
      return next;
    });
  };

  const addSet = (exIdx: number) => {
    setExecution((prev) => {
      const next = [...prev];
      next[exIdx] = {
        ...next[exIdx],
        sets: [...next[exIdx].sets, { reps: "", weightKg: "" }],
      };
      return next;
    });
  };

  const onFinish = async () => {
    if (!plan) return;
    const entries: WorkoutLogEntry[] = execution.map((ex) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      muscleGroup: ex.muscleGroup,
      sets: ex.sets
        .filter((s) => s.reps !== "" && s.weightKg !== "")
        .map((s) => ({
          reps: Number(s.reps) || 0,
          weightKg: Number(s.weightKg.replace(",", ".")) || 0,
        })),
    }));

    const hasAnySet = entries.some((e) => e.sets.length > 0);
    if (!hasAnySet) {
      Alert.alert("Nenhuma série registrada", "Preencha ao menos uma série com peso e repetições.");
      return;
    }

    await addWorkoutLog({
      planId: plan.id,
      planName: plan.name,
      date: todayStr(),
      entries,
    });
    Alert.alert("Treino registrado!", "Volume e cargas salvos no seu histórico.");
    router.back();
  };

  if (!plan) return null;

  return (
    <Screen>
      <Card>
        <SectionTitle>{plan.name}</SectionTitle>
        <Text style={{ color: colors.textSecondary }}>
          Preencha o peso e as repetições realizadas em cada série.
        </Text>
      </Card>

      {execution.map((ex, exIdx) => (
        <Card key={ex.exerciseId}>
          <Text style={{ fontWeight: "700", fontSize: 15, color: colors.textPrimary }}>
            {ex.exerciseName}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
            {ex.muscleGroup}
          </Text>
          {ex.sets.map((set, setIdx) => (
            <View key={setIdx} style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
              <Text style={{ width: 24, color: colors.textSecondary, marginBottom: 10 }}>
                {setIdx + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <Field
                  label="Reps"
                  keyboardType="numeric"
                  value={set.reps}
                  onChangeText={(v) => updateSet(exIdx, setIdx, { reps: v })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Peso (kg)"
                  keyboardType="numeric"
                  value={set.weightKg}
                  onChangeText={(v) => updateSet(exIdx, setIdx, { weightKg: v })}
                />
              </View>
            </View>
          ))}
          <SecondaryButton title="+ Série extra" onPress={() => addSet(exIdx)} />
        </Card>
      ))}

      <PrimaryButton title="Concluir treino" onPress={onFinish} />
    </Screen>
  );
}
