export type Sex = "M" | "F";

export type ActivityLevel =
  | "sedentario"
  | "leve"
  | "moderado"
  | "ativo"
  | "muito_ativo";

export type Goal = "perder" | "manter" | "ganhar";

export type MuscleGroup =
  | "Peito"
  | "Costas"
  | "Ombro"
  | "Bíceps"
  | "Tríceps"
  | "Pernas"
  | "Glúteos"
  | "Abdômen"
  | "Corpo inteiro";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Peito",
  "Costas",
  "Ombro",
  "Bíceps",
  "Tríceps",
  "Pernas",
  "Glúteos",
  "Abdômen",
  "Corpo inteiro",
];

export interface UserProfile {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  waterGoalMl: number;
}

export interface BodyMetric {
  id: string;
  date: string; // yyyy-mm-dd
  weightKg: number;
  bodyFatPct?: number;
}

export interface PlanExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  targetSets: number;
  targetReps: number;
  targetLoadKg?: number;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  exercises: PlanExercise[];
}

export interface WorkoutSetLog {
  reps: number;
  weightKg: number;
}

export interface WorkoutLogEntry {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: WorkoutSetLog[];
}

export interface WorkoutLog {
  id: string;
  planId: string;
  planName: string;
  date: string; // yyyy-mm-dd
  entries: WorkoutLogEntry[];
}

export type CardioType =
  | "Corrida"
  | "Caminhada"
  | "Bicicleta"
  | "Natação"
  | "Elíptico"
  | "Outro";

export interface CardioPlanSession {
  id: string;
  type: CardioType;
  targetDurationMin: number;
  targetDistanceKm?: number;
  notes?: string;
}

export interface CardioLog {
  id: string;
  sessionId?: string;
  type: CardioType;
  date: string; // yyyy-mm-dd
  durationMin: number;
  distanceKm?: number;
  caloriesKcal?: number;
}

export interface Food {
  id: string;
  name: string;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
}

export interface MealItem {
  foodId: string;
  foodName: string;
  grams: number;
}

export interface Meal {
  id: string;
  name: string;
  items: MealItem[];
}

export interface DietPlan {
  targetKcal: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  meals: Meal[];
}

export interface DietLogEntry {
  id: string;
  date: string; // yyyy-mm-dd
  foodId?: string;
  foodName: string;
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  mealName?: string;
}

export interface WaterLogEntry {
  id: string;
  date: string; // yyyy-mm-dd
  ml: number;
}
