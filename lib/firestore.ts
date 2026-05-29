"use client";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Get today's date string in YYYY-MM-DD format
export function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

// Get the last N date keys
export function getLastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

// ───────────────────────────── HYDRATION ─────────────────────────────
 
export interface HydrationData {
  ml: number;
  goalMl: number;
  glasses: number;
  goalGlasses: number;
  updatedAt?: any;
}
 
export async function getTodayHydration(uid: string): Promise<HydrationData> {
  const ref = doc(db, "users", uid, "hydration", getTodayKey());
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    const ml = data.ml ?? (data.glasses ? data.glasses * 250 : 0);
    const goalMl = data.goalMl ?? (data.goalGlasses ? data.goalGlasses * 250 : 2000);
    return {
      ml,
      goalMl,
      glasses: data.glasses ?? Math.round(ml / 250),
      goalGlasses: data.goalGlasses ?? Math.round(goalMl / 250),
    };
  }
  return { ml: 0, goalMl: 2000, glasses: 0, goalGlasses: 8 };
}
 
export async function addWaterMl(uid: string, amountMl: number): Promise<HydrationData> {
  const ref = doc(db, "users", uid, "hydration", getTodayKey());
  const snap = await getDoc(ref);
  let currentMl = 0;
  let goalMl = 2000;
  if (snap.exists()) {
    const data = snap.data();
    currentMl = data.ml ?? (data.glasses ? data.glasses * 250 : 0);
    goalMl = data.goalMl ?? (data.goalGlasses ? data.goalGlasses * 250 : 2000);
  }
  const newMl = currentMl + amountMl;
  const newGlasses = Math.round(newMl / 250);
  const newGoalGlasses = Math.round(goalMl / 250);
 
  const updatedData = {
    ml: newMl,
    goalMl: goalMl,
    glasses: newGlasses,
    goalGlasses: newGoalGlasses,
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, updatedData);
  return updatedData;
}

export async function updateWaterGoalMl(uid: string, newGoalMl: number): Promise<HydrationData> {
  const ref = doc(db, "users", uid, "hydration", getTodayKey());
  const snap = await getDoc(ref);
  let currentMl = 0;
  if (snap.exists()) {
    const data = snap.data();
    currentMl = data.ml ?? (data.glasses ? data.glasses * 250 : 0);
  }
  const newGlasses = Math.round(currentMl / 250);
  const newGoalGlasses = Math.round(newGoalMl / 250);
 
  const updatedData = {
    ml: currentMl,
    goalMl: newGoalMl,
    glasses: newGlasses,
    goalGlasses: newGoalGlasses,
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, updatedData);
  return updatedData;
}

export async function getHydrationHistory(uid: string, days: number = 7): Promise<HydrationData[]> {
  const dateKeys = getLastNDays(days);
  const results: HydrationData[] = [];
  for (const key of dateKeys) {
    const ref = doc(db, "users", uid, "hydration", key);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      const ml = data.ml ?? (data.glasses ? data.glasses * 250 : 0);
      const goalMl = data.goalMl ?? (data.goalGlasses ? data.goalGlasses * 250 : 2000);
      results.push({ ml, goalMl, glasses: data.glasses ?? 0, goalGlasses: data.goalGlasses ?? 8 });
    } else {
      results.push({ ml: 0, goalMl: 2000, glasses: 0, goalGlasses: 8 });
    }
  }
  return results;
}

// ───────────────────────────── WORKOUT ─────────────────────────────

export interface WorkoutData {
  durationMin: number;
  type: string;
  notes: string;
  date: string;
  exercises?: Array<{ name: string; sets: number; reps: number; weight: number }>;
}

export async function logWorkout(uid: string, data: Omit<WorkoutData, "date">): Promise<void> {
  const dateKey = getTodayKey();
  const ref = doc(db, "users", uid, "workout", dateKey);
  await setDoc(ref, { ...data, date: dateKey, updatedAt: serverTimestamp() });
}

export async function getWorkoutHistory(uid: string, days: number = 7): Promise<WorkoutData[]> {
  const dateKeys = getLastNDays(days);
  const results: WorkoutData[] = [];
  for (const key of dateKeys) {
    const ref = doc(db, "users", uid, "workout", key);
    const snap = await getDoc(ref);
    if (snap.exists()) results.push(snap.data() as WorkoutData);
    else results.push({ durationMin: 0, type: "", notes: "", date: key });
  }
  return results;
}

// ───────────────────────────── CARDIO ─────────────────────────────

export interface CardioData {
  distanceKm: number;
  durationMin: number;
  date: string;
  type?: string;
  steps?: number;
}

export async function logCardio(uid: string, data: Omit<CardioData, "date">): Promise<void> {
  const dateKey = getTodayKey();
  const ref = doc(db, "users", uid, "cardio", dateKey);
  await setDoc(ref, { ...data, date: dateKey, updatedAt: serverTimestamp() });
}

export async function getTodayCardio(uid: string): Promise<CardioData | null> {
  const ref = doc(db, "users", uid, "cardio", getTodayKey());
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as CardioData;
  return null;
}

export async function getCardioHistory(uid: string, days: number = 7): Promise<CardioData[]> {
  const dateKeys = getLastNDays(days);
  const results: CardioData[] = [];
  for (const key of dateKeys) {
    const ref = doc(db, "users", uid, "cardio", key);
    const snap = await getDoc(ref);
    if (snap.exists()) results.push({ date: key, ...snap.data() } as CardioData);
    else results.push({ distanceKm: 0, durationMin: 0, date: key, type: "", steps: 0 });
  }
  return results;
}

// ───────────────────────────── SLEEP ─────────────────────────────

export interface SleepData {
  hours: number;
  minutes: number;
  quality: number; // 1-5
  date: string;
  bedtime?: string;
  wakeTime?: string;
}

export async function logSleep(uid: string, data: Omit<SleepData, "date">): Promise<void> {
  const dateKey = getTodayKey();
  const ref = doc(db, "users", uid, "sleep", dateKey);
  await setDoc(ref, { ...data, date: dateKey, updatedAt: serverTimestamp() });
}

export async function getSleepHistory(uid: string, days: number = 7): Promise<SleepData[]> {
  const dateKeys = getLastNDays(days);
  const results: SleepData[] = [];
  for (const key of dateKeys) {
    const ref = doc(db, "users", uid, "sleep", key);
    const snap = await getDoc(ref);
    if (snap.exists()) results.push(snap.data() as SleepData);
    else results.push({ hours: 0, minutes: 0, quality: 0, date: key });
  }
  return results;
}

// ───────────────────────────── SPENDING ─────────────────────────────

export interface SpendingEntry {
  id?: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  createdAt?: Timestamp;
}

export async function addSpending(uid: string, entry: Omit<SpendingEntry, "date" | "id">): Promise<void> {
  const dateKey = getTodayKey();
  const colRef = collection(db, "users", uid, "spending");
  const newRef = doc(colRef);
  await setDoc(newRef, { ...entry, date: dateKey, createdAt: serverTimestamp() });
}

export async function getTodaySpending(uid: string): Promise<SpendingEntry[]> {
  const q = query(
    collection(db, "users", uid, "spending"),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  const snap = await getDocs(q);
  const today = getTodayKey();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as SpendingEntry))
    .filter((e) => e.date === today);
}

export async function getWeeklySpending(uid: string): Promise<SpendingEntry[]> {
  const q = query(
    collection(db, "users", uid, "spending"),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  const snap = await getDocs(q);
  const days = getLastNDays(7);
  const daySet = new Set(days);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as SpendingEntry))
    .filter((e) => daySet.has(e.date));
}
