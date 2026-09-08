import { genId } from "../utils/id";
import {
  BodyMetric,
  CardioLog,
  CardioPlanSession,
  DietLogEntry,
  DietPlan,
  Food,
  UserProfile,
  WaterLogEntry,
  WorkoutLog,
  WorkoutPlan,
} from "../models/types";
import { getItem, KEYS, setItem } from "./storage";

export const DEFAULT_PROFILE: UserProfile = {
  name: "",
  sex: "M",
  age: 30,
  heightCm: 170,
  weightKg: 75,
  bodyFatPct: undefined,
  activityLevel: "moderado",
  goal: "manter",
  waterGoalMl: 2500,
};

export const DEFAULT_DIET_PLAN: DietPlan = {
  targetKcal: 2200,
  targetProteinG: 150,
  targetCarbsG: 220,
  targetFatG: 70,
  meals: [],
};

// ---- Profile ----
export async function getProfile(): Promise<UserProfile> {
  return getItem(KEYS.profile, DEFAULT_PROFILE);
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await setItem(KEYS.profile, profile);
}

// ---- Body metrics ----
export async function listBodyMetrics(): Promise<BodyMetric[]> {
  const items = await getItem<BodyMetric[]>(KEYS.bodyMetrics, []);
  return [...items].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function addBodyMetric(
  input: Omit<BodyMetric, "id">
): Promise<BodyMetric> {
  const items = await getItem<BodyMetric[]>(KEYS.bodyMetrics, []);
  const entry: BodyMetric = { id: genId(), ...input };
  await setItem(KEYS.bodyMetrics, [...items, entry]);
  return entry;
}

export async function removeBodyMetric(id: string): Promise<void> {
  const items = await getItem<BodyMetric[]>(KEYS.bodyMetrics, []);
  await setItem(
    KEYS.bodyMetrics,
    items.filter((i) => i.id !== id)
  );
}

// ---- Workout plans ----
export async function listWorkoutPlans(): Promise<WorkoutPlan[]> {
  return getItem(KEYS.workoutPlans, []);
}

export async function getWorkoutPlan(
  id: string
): Promise<WorkoutPlan | undefined> {
  const items = await listWorkoutPlans();
  return items.find((p) => p.id === id);
}

export async function saveWorkoutPlan(plan: WorkoutPlan): Promise<void> {
  const items = await listWorkoutPlans();
  const idx = items.findIndex((p) => p.id === plan.id);
  if (idx >= 0) {
    items[idx] = plan;
  } else {
    items.push(plan);
  }
  await setItem(KEYS.workoutPlans, items);
}

export async function removeWorkoutPlan(id: string): Promise<void> {
  const items = await listWorkoutPlans();
  await setItem(
    KEYS.workoutPlans,
    items.filter((p) => p.id !== id)
  );
}

// ---- Workout logs ----
export async function listWorkoutLogs(): Promise<WorkoutLog[]> {
  const items = await getItem<WorkoutLog[]>(KEYS.workoutLogs, []);
  return [...items].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function addWorkoutLog(
  log: Omit<WorkoutLog, "id">
): Promise<WorkoutLog> {
  const items = await getItem<WorkoutLog[]>(KEYS.workoutLogs, []);
  const entry: WorkoutLog = { id: genId(), ...log };
  await setItem(KEYS.workoutLogs, [...items, entry]);
  return entry;
}

export async function removeWorkoutLog(id: string): Promise<void> {
  const items = await getItem<WorkoutLog[]>(KEYS.workoutLogs, []);
  await setItem(
    KEYS.workoutLogs,
    items.filter((i) => i.id !== id)
  );
}

// ---- Cardio plan sessions ----
export async function listCardioSessions(): Promise<CardioPlanSession[]> {
  return getItem(KEYS.cardioSessions, []);
}

export async function saveCardioSession(
  session: CardioPlanSession
): Promise<void> {
  const items = await listCardioSessions();
  const idx = items.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    items[idx] = session;
  } else {
    items.push(session);
  }
  await setItem(KEYS.cardioSessions, items);
}

export async function removeCardioSession(id: string): Promise<void> {
  const items = await listCardioSessions();
  await setItem(
    KEYS.cardioSessions,
    items.filter((s) => s.id !== id)
  );
}

// ---- Cardio logs ----
export async function listCardioLogs(): Promise<CardioLog[]> {
  const items = await getItem<CardioLog[]>(KEYS.cardioLogs, []);
  return [...items].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function addCardioLog(
  log: Omit<CardioLog, "id">
): Promise<CardioLog> {
  const items = await getItem<CardioLog[]>(KEYS.cardioLogs, []);
  const entry: CardioLog = { id: genId(), ...log };
  await setItem(KEYS.cardioLogs, [...items, entry]);
  return entry;
}

export async function removeCardioLog(id: string): Promise<void> {
  const items = await getItem<CardioLog[]>(KEYS.cardioLogs, []);
  await setItem(
    KEYS.cardioLogs,
    items.filter((i) => i.id !== id)
  );
}

// ---- Foods ----
export async function listFoods(): Promise<Food[]> {
  const items = await getItem<Food[]>(KEYS.foods, []);
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveFood(food: Food): Promise<void> {
  const items = await getItem<Food[]>(KEYS.foods, []);
  const idx = items.findIndex((f) => f.id === food.id);
  if (idx >= 0) {
    items[idx] = food;
  } else {
    items.push(food);
  }
  await setItem(KEYS.foods, items);
}

export async function removeFood(id: string): Promise<void> {
  const items = await getItem<Food[]>(KEYS.foods, []);
  await setItem(
    KEYS.foods,
    items.filter((f) => f.id !== id)
  );
}

// ---- Diet plan ----
export async function getDietPlan(): Promise<DietPlan> {
  return getItem(KEYS.dietPlan, DEFAULT_DIET_PLAN);
}

export async function saveDietPlan(plan: DietPlan): Promise<void> {
  await setItem(KEYS.dietPlan, plan);
}

// ---- Diet logs ----
export async function listDietLogs(): Promise<DietLogEntry[]> {
  return getItem(KEYS.dietLogs, []);
}

export async function addDietLog(
  entry: Omit<DietLogEntry, "id">
): Promise<DietLogEntry> {
  const items = await getItem<DietLogEntry[]>(KEYS.dietLogs, []);
  const log: DietLogEntry = { id: genId(), ...entry };
  await setItem(KEYS.dietLogs, [...items, log]);
  return log;
}

export async function removeDietLog(id: string): Promise<void> {
  const items = await getItem<DietLogEntry[]>(KEYS.dietLogs, []);
  await setItem(
    KEYS.dietLogs,
    items.filter((i) => i.id !== id)
  );
}

// ---- Water logs ----
export async function listWaterLogs(): Promise<WaterLogEntry[]> {
  return getItem(KEYS.waterLogs, []);
}

export async function addWaterLog(ml: number, date: string): Promise<void> {
  const items = await getItem<WaterLogEntry[]>(KEYS.waterLogs, []);
  await setItem(KEYS.waterLogs, [...items, { id: genId(), date, ml }]);
}

export async function removeWaterLog(id: string): Promise<void> {
  const items = await getItem<WaterLogEntry[]>(KEYS.waterLogs, []);
  await setItem(
    KEYS.waterLogs,
    items.filter((i) => i.id !== id)
  );
}
