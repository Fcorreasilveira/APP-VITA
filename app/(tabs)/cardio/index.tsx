import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  Card,
  Chip,
  DangerButton,
  EmptyState,
  Field,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionTitle,
} from "../../../src/components/ui";
import { CardioLog, CardioPlanSession, CardioType } from "../../../src/models/types";
import {
  addCardioLog,
  listCardioLogs,
  listCardioSessions,
  removeCardioLog,
  removeCardioSession,
  saveCardioSession,
} from "../../../src/storage/repository";
import { formatDatePtBR, todayStr } from "../../../src/utils/date";
import { genId } from "../../../src/utils/id";
import { colors } from "../../../src/theme";

const CARDIO_TYPES: CardioType[] = [
  "Corrida",
  "Caminhada",
  "Bicicleta",
  "Natação",
  "Elíptico",
  "Outro",
];

export default function CardioScreen() {
  const [sessions, setSessions] = useState<CardioPlanSession[]>([]);
  const [logs, setLogs] = useState<CardioLog[]>([]);

  const [planType, setPlanType] = useState<CardioType>("Corrida");
  const [planDuration, setPlanDuration] = useState("30");
  const [planDistance, setPlanDistance] = useState("");

  const [loggingSessionId, setLoggingSessionId] = useState<string | null>(null);
  const [execDuration, setExecDuration] = useState("");
  const [execDistance, setExecDistance] = useState("");
  const [execCalories, setExecCalories] = useState("");

  const load = useCallback(async () => {
    const [s, l] = await Promise.all([listCardioSessions(), listCardioLogs()]);
    setSessions(s);
    setLogs(l);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addPlan = async () => {
    if (!planDuration) {
      Alert.alert("Duração obrigatória", "Informe a duração alvo em minutos.");
      return;
    }
    await saveCardioSession({
      id: genId(),
      type: planType,
      targetDurationMin: Number(planDuration) || 0,
      targetDistanceKm: planDistance ? Number(planDistance.replace(",", ".")) : undefined,
    });
    setPlanDuration("30");
    setPlanDistance("");
    load();
  };

  const startLogging = (session: CardioPlanSession) => {
    setLoggingSessionId(session.id);
    setExecDuration(String(session.targetDurationMin));
    setExecDistance(session.targetDistanceKm ? String(session.targetDistanceKm) : "");
    setExecCalories("");
  };

  const confirmLog = async (session: CardioPlanSession) => {
    await addCardioLog({
      sessionId: session.id,
      type: session.type,
      date: todayStr(),
      durationMin: Number(execDuration) || 0,
      distanceKm: execDistance ? Number(execDistance.replace(",", ".")) : undefined,
      caloriesKcal: execCalories ? Number(execCalories) : undefined,
    });
    setLoggingSessionId(null);
    load();
  };

  return (
    <Screen>
      <Card>
        <SectionTitle>Planejar sessão de cardio</SectionTitle>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {CARDIO_TYPES.map((t) => (
            <Chip key={t} label={t} selected={planType === t} onPress={() => setPlanType(t)} />
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field label="Duração alvo (min)" keyboardType="numeric" value={planDuration} onChangeText={setPlanDuration} />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Distância alvo (km, opcional)"
              keyboardType="numeric"
              value={planDistance}
              onChangeText={setPlanDistance}
            />
          </View>
        </View>
        <PrimaryButton title="+ Adicionar sessão planejada" onPress={addPlan} />
      </Card>

      <Card>
        <SectionTitle>Sessões planejadas</SectionTitle>
        {sessions.length === 0 ? (
          <EmptyState text="Nenhuma sessão de cardio planejada ainda." />
        ) : (
          sessions.map((s) => (
            <View key={s.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{s.type}</Text>
                <DangerButton
                  title="Remover"
                  onPress={async () => {
                    await removeCardioSession(s.id);
                    load();
                  }}
                />
              </View>
              <Text style={{ color: colors.textSecondary }}>
                {s.targetDurationMin} min{s.targetDistanceKm ? ` · ${s.targetDistanceKm} km` : ""}
              </Text>

              {loggingSessionId === s.id ? (
                <View style={{ gap: 6, marginTop: 6 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Field label="Duração (min)" keyboardType="numeric" value={execDuration} onChangeText={setExecDuration} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field label="Distância (km)" keyboardType="numeric" value={execDistance} onChangeText={setExecDistance} />
                    </View>
                  </View>
                  <Field label="Calorias (kcal, opcional)" keyboardType="numeric" value={execCalories} onChangeText={setExecCalories} />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton title="Confirmar" onPress={() => confirmLog(s)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <SecondaryButton title="Cancelar" onPress={() => setLoggingSessionId(null)} />
                    </View>
                  </View>
                </View>
              ) : (
                <SecondaryButton title="Registrar execução" onPress={() => startLogging(s)} />
              )}
            </View>
          ))
        )}
      </Card>

      <Card>
        <SectionTitle>Histórico de cardio</SectionTitle>
        {logs.length === 0 ? (
          <EmptyState text="Nenhum cardio registrado ainda." />
        ) : (
          logs.map((log) => (
            <View
              key={log.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 6,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: colors.textPrimary }}>
                  {log.type} · {formatDatePtBR(log.date)}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {log.durationMin} min
                  {log.distanceKm ? ` · ${log.distanceKm} km` : ""}
                  {log.caloriesKcal ? ` · ${log.caloriesKcal} kcal` : ""}
                </Text>
              </View>
              <DangerButton
                title="Excluir"
                onPress={async () => {
                  await removeCardioLog(log.id);
                  load();
                }}
              />
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
