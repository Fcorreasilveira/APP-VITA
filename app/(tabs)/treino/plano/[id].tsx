import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  Card,
  Chip,
  DangerButton,
  Field,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionTitle,
} from "../../../../src/components/ui";
import { MUSCLE_GROUPS, MuscleGroup, PlanExercise, WorkoutPlan } from "../../../../src/models/types";
import {
  getWorkoutPlan,
  removeWorkoutPlan,
  saveWorkoutPlan,
} from "../../../../src/storage/repository";
import { genId } from "../../../../src/utils/id";
import { colors } from "../../../../src/theme";

export default function EditWorkoutPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "novo";

  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<PlanExercise[]>([]);

  const [exName, setExName] = useState("");
  const [exGroup, setExGroup] = useState<MuscleGroup>("Peito");
  const [exSets, setExSets] = useState("3");
  const [exReps, setExReps] = useState("10");
  const [exLoad, setExLoad] = useState("");

  useEffect(() => {
    if (!isNew) {
      getWorkoutPlan(id).then((plan) => {
        if (plan) {
          setName(plan.name);
          setExercises(plan.exercises);
        }
      });
    }
  }, [id, isNew]);

  const addExercise = () => {
    if (!exName.trim()) {
      Alert.alert("Nome obrigatório", "Informe o nome do exercício.");
      return;
    }
    const newExercise: PlanExercise = {
      id: genId(),
      name: exName.trim(),
      muscleGroup: exGroup,
      targetSets: Number(exSets) || 1,
      targetReps: Number(exReps) || 1,
      targetLoadKg: exLoad ? Number(exLoad.replace(",", ".")) : undefined,
    };
    setExercises((prev) => [...prev, newExercise]);
    setExName("");
    setExSets("3");
    setExReps("10");
    setExLoad("");
  };

  const removeExercise = (exId: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== exId));
  };

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert("Nome obrigatório", "Dê um nome ao plano de treino.");
      return;
    }
    if (exercises.length === 0) {
      Alert.alert("Adicione exercícios", "O plano precisa de ao menos um exercício.");
      return;
    }
    const plan: WorkoutPlan = {
      id: isNew ? genId() : id,
      name: name.trim(),
      exercises,
    };
    await saveWorkoutPlan(plan);
    router.back();
  };

  const onDelete = () => {
    Alert.alert("Excluir plano", "Tem certeza?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await removeWorkoutPlan(id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Card>
        <Field label="Nome do plano" value={name} onChangeText={setName} placeholder="Ex: Treino A - Peito/Tríceps" />
      </Card>

      <Card>
        <SectionTitle>Exercícios</SectionTitle>
        {exercises.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>Nenhum exercício adicionado ainda.</Text>
        ) : (
          exercises.map((ex) => (
            <View
              key={ex.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{ex.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {ex.muscleGroup} · {ex.targetSets}x{ex.targetReps}
                  {ex.targetLoadKg ? ` · ${ex.targetLoadKg}kg` : ""}
                </Text>
              </View>
              <DangerButton title="Remover" onPress={() => removeExercise(ex.id)} />
            </View>
          ))
        )}
      </Card>

      <Card>
        <SectionTitle>Adicionar exercício</SectionTitle>
        <Field label="Nome do exercício" value={exName} onChangeText={setExName} placeholder="Ex: Supino reto" />
        <Text style={{ fontWeight: "600", color: colors.textSecondary }}>Grupo muscular alvo</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {MUSCLE_GROUPS.map((g) => (
            <Chip key={g} label={g} selected={exGroup === g} onPress={() => setExGroup(g)} />
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field label="Séries" keyboardType="numeric" value={exSets} onChangeText={setExSets} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Repetições" keyboardType="numeric" value={exReps} onChangeText={setExReps} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Carga (kg, opcional)" keyboardType="numeric" value={exLoad} onChangeText={setExLoad} />
          </View>
        </View>
        <SecondaryButton title="+ Adicionar exercício" onPress={addExercise} />
      </Card>

      <PrimaryButton title="Salvar plano" onPress={onSave} />
      {!isNew && <DangerButton title="Excluir plano" onPress={onDelete} />}
    </Screen>
  );
}
