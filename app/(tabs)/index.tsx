import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  Card,
  Field,
  PrimaryButton,
  ProgressBar,
  Screen,
  SecondaryButton,
  SectionTitle,
} from "../../src/components/ui";
import {
  BodyMetric,
  CardioLog,
  DietLogEntry,
  DietPlan,
  UserProfile,
  WaterLogEntry,
  WorkoutLog,
} from "../../src/models/types";
import {
  addWaterLog,
  getDietPlan,
  getProfile,
  listBodyMetrics,
  listCardioLogs,
  listDietLogs,
  listWaterLogs,
  listWorkoutLogs,
} from "../../src/storage/repository";
import { formatDatePtBR, todayStr } from "../../src/utils/date";
import { colors, spacing } from "../../src/theme";

const QUICK_WATER_ML = [200, 300, 500];

export default function HomeScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [dietLogsToday, setDietLogsToday] = useState<DietLogEntry[]>([]);
  const [waterToday, setWaterToday] = useState<WaterLogEntry[]>([]);
  const [workoutToday, setWorkoutToday] = useState<WorkoutLog[]>([]);
  const [cardioToday, setCardioToday] = useState<CardioLog[]>([]);
  const [lastMetric, setLastMetric] = useState<BodyMetric | null>(null);
  const [customWater, setCustomWater] = useState("");

  const load = useCallback(async () => {
    const today = todayStr();
    const [p, plan, dietLogs, water, workouts, cardio, metrics] = await Promise.all([
      getProfile(),
      getDietPlan(),
      listDietLogs(),
      listWaterLogs(),
      listWorkoutLogs(),
      listCardioLogs(),
      listBodyMetrics(),
    ]);
    setProfile(p);
    setDietPlan(plan);
    setDietLogsToday(dietLogs.filter((l) => l.date === today));
    setWaterToday(water.filter((w) => w.date === today));
    setWorkoutToday(workouts.filter((w) => w.date === today));
    setCardioToday(cardio.filter((c) => c.date === today));
    setLastMetric(metrics[0] ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!profile || !dietPlan) return null;

  const kcalToday = dietLogsToday.reduce((s, l) => s + l.kcal, 0);
  const waterMl = waterToday.reduce((s, w) => s + w.ml, 0);

  const onQuickWater = async (ml: number) => {
    await addWaterLog(ml, todayStr());
    load();
  };

  const onCustomWater = async () => {
    const ml = Number(customWater);
    if (!ml || ml <= 0) {
      Alert.alert("Valor inválido", "Informe uma quantidade de água em ml.");
      return;
    }
    await addWaterLog(ml, todayStr());
    setCustomWater("");
    load();
  };

  return (
    <Screen>
      <View>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.textPrimary }}>
          Olá{profile.name ? `, ${profile.name}` : ""} 👋
        </Text>
        <Text style={{ color: colors.textSecondary, textTransform: "capitalize" }}>
          {formatDatePtBR(todayStr())}
        </Text>
      </View>

      <Card>
        <SectionTitle>Calorias</SectionTitle>
        <Text style={{ color: colors.textSecondary }}>
          {Math.round(kcalToday)} / {dietPlan.targetKcal} kcal
        </Text>
        <ProgressBar value={kcalToday} max={dietPlan.targetKcal} color={colors.primary} />
        <SecondaryButton title="Registrar alimentação" onPress={() => router.push("/dieta/registrar")} />
      </Card>

      <Card>
        <SectionTitle>Água</SectionTitle>
        <Text style={{ color: colors.textSecondary }}>
          {waterMl} / {profile.waterGoalMl} ml
        </Text>
        <ProgressBar value={waterMl} max={profile.waterGoalMl} color={colors.water} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          {QUICK_WATER_ML.map((ml) => (
            <View key={ml} style={{ flex: 1 }}>
              <SecondaryButton title={`+${ml}ml`} onPress={() => onQuickWater(ml)} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Outra quantidade (ml)"
              keyboardType="numeric"
              value={customWater}
              onChangeText={setCustomWater}
            />
          </View>
          <View style={{ width: 100 }}>
            <PrimaryButton title="Adicionar" onPress={onCustomWater} />
          </View>
        </View>
      </Card>

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Card style={{ flex: 1 }}>
          <SectionTitle>Treino</SectionTitle>
          <Text style={{ color: workoutToday.length ? colors.primary : colors.textSecondary, fontWeight: "700" }}>
            {workoutToday.length ? "Feito hoje ✅" : "Pendente"}
          </Text>
          <SecondaryButton title="Ir para treino" onPress={() => router.push("/treino")} />
        </Card>
        <Card style={{ flex: 1 }}>
          <SectionTitle>Cardio</SectionTitle>
          <Text style={{ color: cardioToday.length ? colors.primary : colors.textSecondary, fontWeight: "700" }}>
            {cardioToday.length ? "Feito hoje ✅" : "Pendente"}
          </Text>
          <SecondaryButton title="Ir para cardio" onPress={() => router.push("/cardio")} />
        </Card>
      </View>

      <Card>
        <SectionTitle>Composição corporal</SectionTitle>
        {lastMetric ? (
          <Text style={{ color: colors.textSecondary }}>
            Último registro ({formatDatePtBR(lastMetric.date)}): {lastMetric.weightKg} kg
            {lastMetric.bodyFatPct != null ? ` · ${lastMetric.bodyFatPct}% gordura` : ""}
          </Text>
        ) : (
          <Text style={{ color: colors.textSecondary }}>
            Nenhum registro de peso ainda. Adicione no seu perfil.
          </Text>
        )}
        <SecondaryButton title="Ver perfil e análise calórica" onPress={() => router.push("/perfil")} />
      </Card>
    </Screen>
  );
}
