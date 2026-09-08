import { ActivityLevel, Goal, UserProfile } from "../models/types";

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  ativo: 1.725,
  muito_ativo: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentario: "Sedentário",
  leve: "Leve (1-3x/semana)",
  moderado: "Moderado (3-5x/semana)",
  ativo: "Ativo (6-7x/semana)",
  muito_ativo: "Muito ativo (2x/dia)",
};

export const GOAL_LABELS: Record<Goal, string> = {
  perder: "Perder peso",
  manter: "Manter peso",
  ganhar: "Ganhar massa",
};

const GOAL_ADJUSTMENT: Record<Goal, number> = {
  perder: -500,
  manter: 0,
  ganhar: 300,
};

export interface EnergyProfile {
  bmr: number;
  tdee: number;
  targetKcal: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
}

export function calcBMR(profile: UserProfile): number {
  const { weightKg, heightCm, age, sex, bodyFatPct } = profile;
  if (bodyFatPct != null && bodyFatPct > 0) {
    const leanMassKg = weightKg * (1 - bodyFatPct / 100);
    return 370 + 21.6 * leanMassKg;
  }
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "M" ? base + 5 : base - 161;
}

export function calcEnergyProfile(profile: UserProfile): EnergyProfile {
  const bmr = calcBMR(profile);
  const tdee = bmr * ACTIVITY_FACTORS[profile.activityLevel];
  const targetKcal = Math.max(1200, Math.round(tdee + GOAL_ADJUSTMENT[profile.goal]));

  const targetProteinG = Math.round(profile.weightKg * 2);
  const targetFatG = Math.round(profile.weightKg * 1);
  const kcalFromProteinFat = targetProteinG * 4 + targetFatG * 9;
  const targetCarbsG = Math.max(
    0,
    Math.round((targetKcal - kcalFromProteinFat) / 4)
  );

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetKcal,
    targetProteinG,
    targetCarbsG,
    targetFatG,
  };
}

export function calcBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
