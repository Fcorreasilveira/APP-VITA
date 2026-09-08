import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getItem<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const KEYS = {
  profile: "@vita/profile",
  bodyMetrics: "@vita/bodyMetrics",
  workoutPlans: "@vita/workoutPlans",
  workoutLogs: "@vita/workoutLogs",
  cardioSessions: "@vita/cardioSessions",
  cardioLogs: "@vita/cardioLogs",
  foods: "@vita/foods",
  dietPlan: "@vita/dietPlan",
  dietLogs: "@vita/dietLogs",
  waterLogs: "@vita/waterLogs",
} as const;
