import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Card, DangerButton, EmptyState, Screen, SectionTitle } from "../../../src/components/ui";
import { WorkoutLog } from "../../../src/models/types";
import { listWorkoutLogs, removeWorkoutLog } from "../../../src/storage/repository";
import { formatDatePtBR } from "../../../src/utils/date";
import { colors } from "../../../src/theme";

function totalVolume(log: WorkoutLog): number {
  return log.entries.reduce(
    (sum, entry) =>
      sum + entry.sets.reduce((s, set) => s + set.reps * set.weightKg, 0),
    0
  );
}

export default function WorkoutHistoryScreen() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  const load = useCallback(async () => {
    setLogs(await listWorkoutLogs());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <SectionTitle>Histórico de treinos</SectionTitle>
      {logs.length === 0 ? (
        <Card>
          <EmptyState text="Nenhum treino registrado ainda." />
        </Card>
      ) : (
        logs.map((log) => (
          <Card key={log.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{log.planName}</Text>
              <Text style={{ color: colors.textSecondary }}>{formatDatePtBR(log.date)}</Text>
            </View>
            <Text style={{ color: colors.textSecondary }}>
              Volume total: {Math.round(totalVolume(log))} kg
            </Text>
            {log.entries.map((entry, i) => (
              <Text key={i} style={{ color: colors.textSecondary, fontSize: 12 }}>
                {entry.exerciseName}: {entry.sets.map((s) => `${s.reps}x${s.weightKg}kg`).join(", ")}
              </Text>
            ))}
            <DangerButton
              title="Excluir registro"
              onPress={async () => {
                await removeWorkoutLog(log.id);
                load();
              }}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
