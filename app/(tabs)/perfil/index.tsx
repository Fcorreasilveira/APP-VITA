import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  Card,
  Chip,
  DangerButton,
  Field,
  PrimaryButton,
  Screen,
  SectionTitle,
  Stat,
} from "../../../src/components/ui";
import {
  ACTIVITY_LABELS,
  calcBMI,
  calcEnergyProfile,
  GOAL_LABELS,
  round1,
} from "../../../src/utils/calc";
import { todayStr } from "../../../src/utils/date";
import {
  addBodyMetric,
  getProfile,
  listBodyMetrics,
  removeBodyMetric,
  saveProfile,
} from "../../../src/storage/repository";
import { ActivityLevel, BodyMetric, Goal, UserProfile } from "../../../src/models/types";
import { colors } from "../../../src/theme";

const ACTIVITY_LEVELS: ActivityLevel[] = [
  "sedentario",
  "leve",
  "moderado",
  "ativo",
  "muito_ativo",
];
const GOALS: Goal[] = ["perder", "manter", "ganhar"];

export default function PerfilScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [newBodyFat, setNewBodyFat] = useState("");

  const load = useCallback(async () => {
    const [p, m] = await Promise.all([getProfile(), listBodyMetrics()]);
    setProfile(p);
    setMetrics(m);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!profile) return null;

  const update = (patch: Partial<UserProfile>) => {
    setProfile({ ...profile, ...patch });
  };

  const persist = async (p: UserProfile) => {
    setProfile(p);
    await saveProfile(p);
  };

  const onSave = async () => {
    await saveProfile(profile);
    Alert.alert("Perfil salvo", "Suas informações foram atualizadas.");
  };

  const onRegisterWeight = async () => {
    const weightKg = parseFloat(newWeight.replace(",", "."));
    if (!weightKg || weightKg <= 0) {
      Alert.alert("Peso inválido", "Informe um peso válido em kg.");
      return;
    }
    const bodyFatPct = newBodyFat
      ? parseFloat(newBodyFat.replace(",", "."))
      : undefined;
    await addBodyMetric({ date: todayStr(), weightKg, bodyFatPct });
    await persist({ ...profile, weightKg, bodyFatPct: bodyFatPct ?? profile.bodyFatPct });
    setNewWeight("");
    setNewBodyFat("");
    load();
  };

  const energy = calcEnergyProfile(profile);
  const bmi = calcBMI(profile.weightKg, profile.heightCm);

  return (
    <Screen>
      <Card>
        <SectionTitle>Seus dados</SectionTitle>
        <Field
          label="Nome"
          value={profile.name}
          onChangeText={(v) => update({ name: v })}
          placeholder="Como podemos te chamar?"
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip
            label="Masculino"
            selected={profile.sex === "M"}
            onPress={() => update({ sex: "M" })}
          />
          <Chip
            label="Feminino"
            selected={profile.sex === "F"}
            onPress={() => update({ sex: "F" })}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Idade"
              keyboardType="numeric"
              value={String(profile.age)}
              onChangeText={(v) => update({ age: Number(v) || 0 })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Altura (cm)"
              keyboardType="numeric"
              value={String(profile.heightCm)}
              onChangeText={(v) => update({ heightCm: Number(v) || 0 })}
            />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Peso atual (kg)"
              keyboardType="numeric"
              value={String(profile.weightKg)}
              onChangeText={(v) => update({ weightKg: Number(v.replace(",", ".")) || 0 })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="% de gordura (opcional)"
              keyboardType="numeric"
              value={profile.bodyFatPct != null ? String(profile.bodyFatPct) : ""}
              onChangeText={(v) =>
                update({ bodyFatPct: v ? Number(v.replace(",", ".")) : undefined })
              }
              placeholder="ex: 18"
            />
          </View>
        </View>

        <Text style={{ fontWeight: "600", color: colors.textSecondary, marginTop: 4 }}>
          Nível de atividade
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ACTIVITY_LEVELS.map((level) => (
            <Chip
              key={level}
              label={ACTIVITY_LABELS[level]}
              selected={profile.activityLevel === level}
              onPress={() => update({ activityLevel: level })}
            />
          ))}
        </View>

        <Text style={{ fontWeight: "600", color: colors.textSecondary, marginTop: 4 }}>
          Objetivo
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {GOALS.map((g) => (
            <Chip
              key={g}
              label={GOAL_LABELS[g]}
              selected={profile.goal === g}
              onPress={() => update({ goal: g })}
            />
          ))}
        </View>

        <Field
          label="Meta de água diária (ml)"
          keyboardType="numeric"
          value={String(profile.waterGoalMl)}
          onChangeText={(v) => update({ waterGoalMl: Number(v) || 0 })}
        />

        <PrimaryButton title="Salvar perfil" onPress={onSave} />
      </Card>

      <Card>
        <SectionTitle>Análise calórica</SectionTitle>
        <View style={{ flexDirection: "row" }}>
          <Stat label="IMC" value={round1(bmi).toString()} />
          <Stat label="TMB (kcal)" value={String(energy.bmr)} />
          <Stat label="Gasto total (kcal)" value={String(energy.tdee)} color={colors.secondary} />
        </View>
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          <Stat label="Meta calórica" value={`${energy.targetKcal} kcal`} color={colors.primary} />
          <Stat label="Proteína" value={`${energy.targetProteinG}g`} color={colors.protein} />
          <Stat label="Carbo" value={`${energy.targetCarbsG}g`} color={colors.carbs} />
          <Stat label="Gordura" value={`${energy.targetFatG}g`} color={colors.fat} />
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          Calculado a partir do seu perfil (TMB via Katch-McArdle quando há %
          de gordura, ou Mifflin-St Jeor) e nível de atividade. Use como
          referência para configurar o plano de dieta.
        </Text>
      </Card>

      <Card>
        <SectionTitle>Registrar peso de hoje</SectionTitle>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Peso (kg)"
              keyboardType="numeric"
              value={newWeight}
              onChangeText={setNewWeight}
              placeholder="ex: 78.5"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="% gordura (opcional)"
              keyboardType="numeric"
              value={newBodyFat}
              onChangeText={setNewBodyFat}
              placeholder="ex: 17"
            />
          </View>
        </View>
        <PrimaryButton title="Registrar" onPress={onRegisterWeight} />
      </Card>

      <Card>
        <SectionTitle>Histórico de composição corporal</SectionTitle>
        {metrics.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>
            Nenhum registro ainda.
          </Text>
        ) : (
          metrics.map((m, idx) => {
            const prev = metrics[idx + 1];
            const delta = prev ? round1(m.weightKg - prev.weightKg) : null;
            return (
              <View
                key={m.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 8,
                  borderBottomWidth: idx === metrics.length - 1 ? 0 : 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ color: colors.textSecondary, width: 90 }}>
                  {m.date}
                </Text>
                <Text style={{ fontWeight: "700", color: colors.textPrimary }}>
                  {m.weightKg} kg
                </Text>
                <Text style={{ color: colors.textSecondary }}>
                  {m.bodyFatPct != null ? `${m.bodyFatPct}% gordura` : "-"}
                </Text>
                <Text
                  style={{
                    color:
                      delta == null
                        ? colors.textSecondary
                        : delta > 0
                        ? colors.danger
                        : colors.primary,
                    fontWeight: "600",
                  }}
                >
                  {delta == null ? "" : delta > 0 ? `+${delta}` : delta}
                </Text>
                <DangerButton
                  title="Excluir"
                  onPress={async () => {
                    await removeBodyMetric(m.id);
                    load();
                  }}
                />
              </View>
            );
          })
        )}
      </Card>
    </Screen>
  );
}
