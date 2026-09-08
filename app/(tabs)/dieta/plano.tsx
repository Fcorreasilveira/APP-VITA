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
  SecondaryButton,
  SectionTitle,
} from "../../../src/components/ui";
import { DietPlan, Food, Meal } from "../../../src/models/types";
import {
  getDietPlan,
  getProfile,
  listFoods,
  saveDietPlan,
} from "../../../src/storage/repository";
import { calcEnergyProfile } from "../../../src/utils/calc";
import { genId } from "../../../src/utils/id";
import { colors } from "../../../src/theme";

export default function DietPlanScreen() {
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [newMealName, setNewMealName] = useState("");
  const [pickingMealId, setPickingMealId] = useState<string | null>(null);
  const [pickFoodId, setPickFoodId] = useState<string | null>(null);
  const [pickGrams, setPickGrams] = useState("100");

  const load = useCallback(async () => {
    const [p, f] = await Promise.all([getDietPlan(), listFoods()]);
    setPlan(p);
    setFoods(f);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!plan) return null;

  const update = (patch: Partial<DietPlan>) => setPlan({ ...plan, ...patch });

  const useCalculatedTarget = async () => {
    const profile = await getProfile();
    const energy = calcEnergyProfile(profile);
    update({
      targetKcal: energy.targetKcal,
      targetProteinG: energy.targetProteinG,
      targetCarbsG: energy.targetCarbsG,
      targetFatG: energy.targetFatG,
    });
  };

  const addMeal = () => {
    if (!newMealName.trim()) return;
    const meal: Meal = { id: genId(), name: newMealName.trim(), items: [] };
    update({ meals: [...plan.meals, meal] });
    setNewMealName("");
  };

  const removeMeal = (mealId: string) => {
    update({ meals: plan.meals.filter((m) => m.id !== mealId) });
  };

  const confirmAddFood = (mealId: string) => {
    const food = foods.find((f) => f.id === pickFoodId);
    const grams = Number(pickGrams.replace(",", "."));
    if (!food || !grams) {
      Alert.alert("Selecione um alimento", "Escolha um alimento e informe a quantidade em gramas.");
      return;
    }
    update({
      meals: plan.meals.map((m) =>
        m.id === mealId
          ? { ...m, items: [...m.items, { foodId: food.id, foodName: food.name, grams }] }
          : m
      ),
    });
    setPickingMealId(null);
    setPickFoodId(null);
    setPickGrams("100");
  };

  const removeItem = (mealId: string, idx: number) => {
    update({
      meals: plan.meals.map((m) =>
        m.id === mealId ? { ...m, items: m.items.filter((_, i) => i !== idx) } : m
      ),
    });
  };

  const onSave = async () => {
    await saveDietPlan(plan);
    Alert.alert("Plano salvo", "Seu plano alimentar foi atualizado.");
  };

  return (
    <Screen>
      <Card>
        <SectionTitle>Metas diárias</SectionTitle>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Calorias (kcal)"
              keyboardType="numeric"
              value={String(plan.targetKcal)}
              onChangeText={(v) => update({ targetKcal: Number(v) || 0 })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Proteína (g)"
              keyboardType="numeric"
              value={String(plan.targetProteinG)}
              onChangeText={(v) => update({ targetProteinG: Number(v) || 0 })}
            />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Carboidrato (g)"
              keyboardType="numeric"
              value={String(plan.targetCarbsG)}
              onChangeText={(v) => update({ targetCarbsG: Number(v) || 0 })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Gordura (g)"
              keyboardType="numeric"
              value={String(plan.targetFatG)}
              onChangeText={(v) => update({ targetFatG: Number(v) || 0 })}
            />
          </View>
        </View>
        <SecondaryButton title="Usar meta calculada do meu perfil" onPress={useCalculatedTarget} />
      </Card>

      <Card>
        <SectionTitle>Refeições</SectionTitle>
        {plan.meals.map((meal) => (
          <View key={meal.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{meal.name}</Text>
              <DangerButton title="Remover refeição" onPress={() => removeMeal(meal.id)} />
            </View>
            {meal.items.map((item, idx) => (
              <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: colors.textSecondary }}>
                  {item.foodName} · {item.grams}g
                </Text>
                <Text style={{ color: colors.danger }} onPress={() => removeItem(meal.id, idx)}>
                  remover
                </Text>
              </View>
            ))}

            {pickingMealId === meal.id ? (
              <View style={{ marginTop: 6, gap: 6 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {foods.map((f) => (
                    <Chip
                      key={f.id}
                      label={f.name}
                      selected={pickFoodId === f.id}
                      onPress={() => setPickFoodId(f.id)}
                    />
                  ))}
                </View>
                {foods.length === 0 && (
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    Cadastre alimentos na aba "Gerenciar alimentos" primeiro.
                  </Text>
                )}
                <Field label="Quantidade (g)" keyboardType="numeric" value={pickGrams} onChangeText={setPickGrams} />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton title="Confirmar" onPress={() => confirmAddFood(meal.id)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SecondaryButton title="Cancelar" onPress={() => setPickingMealId(null)} />
                  </View>
                </View>
              </View>
            ) : (
              <SecondaryButton title="+ Adicionar alimento" onPress={() => setPickingMealId(meal.id)} />
            )}
          </View>
        ))}

        <Field label="Nova refeição" value={newMealName} onChangeText={setNewMealName} placeholder="Ex: Café da manhã" />
        <SecondaryButton title="+ Adicionar refeição" onPress={addMeal} />
      </Card>

      <PrimaryButton title="Salvar plano alimentar" onPress={onSave} />
    </Screen>
  );
}
