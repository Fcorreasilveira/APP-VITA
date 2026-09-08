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
  SectionTitle,
} from "../../../src/components/ui";
import { DietLogEntry, DietPlan, Food } from "../../../src/models/types";
import {
  addDietLog,
  getDietPlan,
  listDietLogs,
  listFoods,
  removeDietLog,
} from "../../../src/storage/repository";
import { todayStr } from "../../../src/utils/date";
import { colors } from "../../../src/theme";

function macrosForGrams(food: Food, grams: number) {
  const factor = grams / 100;
  return {
    kcal: food.kcal100 * factor,
    proteinG: food.protein100 * factor,
    carbsG: food.carbs100 * factor,
    fatG: food.fat100 * factor,
  };
}

export default function RegisterFoodScreen() {
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [todayLogs, setTodayLogs] = useState<DietLogEntry[]>([]);

  const [foodId, setFoodId] = useState<string | null>(null);
  const [grams, setGrams] = useState("100");

  const load = useCallback(async () => {
    const [p, f, logs] = await Promise.all([getDietPlan(), listFoods(), listDietLogs()]);
    setPlan(p);
    setFoods(f);
    setTodayLogs(logs.filter((l) => l.date === todayStr()));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const logMealItem = async (mealName: string, mealFoodId: string, mealFoodName: string, mealGrams: number) => {
    const food = foods.find((f) => f.id === mealFoodId);
    if (!food) {
      Alert.alert("Alimento não encontrado", "Esse alimento pode ter sido removido da biblioteca.");
      return;
    }
    const macros = macrosForGrams(food, mealGrams);
    await addDietLog({
      date: todayStr(),
      foodId: food.id,
      foodName: mealFoodName,
      grams: mealGrams,
      kcal: macros.kcal,
      proteinG: macros.proteinG,
      carbsG: macros.carbsG,
      fatG: macros.fatG,
      mealName,
    });
    load();
  };

  const logCustom = async () => {
    const food = foods.find((f) => f.id === foodId);
    const g = Number(grams.replace(",", "."));
    if (!food || !g) {
      Alert.alert("Selecione um alimento", "Escolha um alimento e informe a quantidade em gramas.");
      return;
    }
    const macros = macrosForGrams(food, g);
    await addDietLog({
      date: todayStr(),
      foodId: food.id,
      foodName: food.name,
      grams: g,
      kcal: macros.kcal,
      proteinG: macros.proteinG,
      carbsG: macros.carbsG,
      fatG: macros.fatG,
    });
    setFoodId(null);
    setGrams("100");
    load();
  };

  if (!plan) return null;

  return (
    <Screen>
      {plan.meals.length > 0 && (
        <Card>
          <SectionTitle>Refeições do plano</SectionTitle>
          {plan.meals.map((meal) => (
            <View key={meal.id} style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{meal.name}</Text>
              {meal.items.length === 0 ? (
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Sem alimentos definidos</Text>
              ) : (
                meal.items.map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ color: colors.textSecondary }}>
                      {item.foodName} · {item.grams}g
                    </Text>
                    <Text
                      style={{ color: colors.primary, fontWeight: "700" }}
                      onPress={() => logMealItem(meal.name, item.foodId, item.foodName, item.grams)}
                    >
                      + registrar
                    </Text>
                  </View>
                ))
              )}
            </View>
          ))}
        </Card>
      )}

      <Card>
        <SectionTitle>Adicionar alimento avulso</SectionTitle>
        {foods.length === 0 ? (
          <EmptyState text="Cadastre alimentos na biblioteca para poder registrá-los aqui." />
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {foods.map((f) => (
              <Chip key={f.id} label={f.name} selected={foodId === f.id} onPress={() => setFoodId(f.id)} />
            ))}
          </View>
        )}
        <Field label="Quantidade (g)" keyboardType="numeric" value={grams} onChangeText={setGrams} />
        <PrimaryButton title="Registrar alimento" onPress={logCustom} />
      </Card>

      <Card>
        <SectionTitle>Registrado hoje</SectionTitle>
        {todayLogs.length === 0 ? (
          <EmptyState text="Nada registrado ainda hoje." />
        ) : (
          todayLogs.map((log) => (
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
                <Text style={{ color: colors.textPrimary }}>
                  {log.foodName} · {log.grams}g {log.mealName ? `(${log.mealName})` : ""}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {Math.round(log.kcal)} kcal · P{Math.round(log.proteinG)} C{Math.round(log.carbsG)} G
                  {Math.round(log.fatG)}
                </Text>
              </View>
              <DangerButton
                title="Remover"
                onPress={async () => {
                  await removeDietLog(log.id);
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
