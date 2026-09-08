import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  Card,
  DangerButton,
  EmptyState,
  Field,
  PrimaryButton,
  Screen,
  SectionTitle,
} from "../../../src/components/ui";
import { Food } from "../../../src/models/types";
import { listFoods, removeFood, saveFood } from "../../../src/storage/repository";
import { genId } from "../../../src/utils/id";
import { colors } from "../../../src/theme";

export default function FoodsScreen() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const load = useCallback(async () => {
    setFoods(await listFoods());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onAdd = async () => {
    if (!name.trim() || !kcal) {
      Alert.alert("Dados incompletos", "Informe ao menos o nome e as calorias por 100g.");
      return;
    }
    await saveFood({
      id: genId(),
      name: name.trim(),
      kcal100: Number(kcal.replace(",", ".")) || 0,
      protein100: Number(protein.replace(",", ".")) || 0,
      carbs100: Number(carbs.replace(",", ".")) || 0,
      fat100: Number(fat.replace(",", ".")) || 0,
    });
    setName("");
    setKcal("");
    setProtein("");
    setCarbs("");
    setFat("");
    load();
  };

  return (
    <Screen>
      <Card>
        <SectionTitle>Novo alimento (valores por 100g)</SectionTitle>
        <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex: Peito de frango" />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field label="Kcal" keyboardType="numeric" value={kcal} onChangeText={setKcal} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Proteína (g)" keyboardType="numeric" value={protein} onChangeText={setProtein} />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field label="Carboidrato (g)" keyboardType="numeric" value={carbs} onChangeText={setCarbs} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Gordura (g)" keyboardType="numeric" value={fat} onChangeText={setFat} />
          </View>
        </View>
        <PrimaryButton title="+ Adicionar alimento" onPress={onAdd} />
      </Card>

      <Card>
        <SectionTitle>Meus alimentos</SectionTitle>
        {foods.length === 0 ? (
          <EmptyState text="Nenhum alimento cadastrado ainda." />
        ) : (
          foods.map((food) => (
            <View
              key={food.id}
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
                <Text style={{ fontWeight: "700", color: colors.textPrimary }}>{food.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {food.kcal100} kcal · P{food.protein100}g · C{food.carbs100}g · G{food.fat100}g (por 100g)
                </Text>
              </View>
              <DangerButton
                title="Excluir"
                onPress={async () => {
                  await removeFood(food.id);
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
