"use client";

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
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

export interface HydrationHistoryEntry extends HydrationData {
  date: string;
}

export async function getHydrationFullHistory(uid: string, days: number = 30): Promise<HydrationHistoryEntry[]> {
  const dateKeys = getLastNDays(days);
  const results: HydrationHistoryEntry[] = [];
  for (const key of dateKeys) {
    const ref = doc(db, "users", uid, "hydration", key);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      const ml = data.ml ?? (data.glasses ? data.glasses * 250 : 0);
      const goalMl = data.goalMl ?? (data.goalGlasses ? data.goalGlasses * 250 : 2000);
      if (ml > 0) {
        results.push({ date: key, ml, goalMl, glasses: data.glasses ?? 0, goalGlasses: data.goalGlasses ?? 8 });
      }
    }
  }
  return results.reverse(); // newest first
}

export async function deleteHydrationEntry(uid: string, date: string): Promise<void> {
  const ref = doc(db, "users", uid, "hydration", date);
  await deleteDoc(ref);
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

export async function getWorkoutFullHistory(uid: string, days: number = 30): Promise<WorkoutData[]> {
  const dateKeys = getLastNDays(days);
  const results: WorkoutData[] = [];
  for (const key of dateKeys) {
    const ref = doc(db, "users", uid, "workout", key);
    const snap = await getDoc(ref);
    if (snap.exists()) results.push(snap.data() as WorkoutData);
  }
  return results.reverse(); // newest first
}

export async function deleteWorkoutEntry(uid: string, date: string): Promise<void> {
  const ref = doc(db, "users", uid, "workout", date);
  await deleteDoc(ref);
}

export async function removeExerciseFromWorkout(
  uid: string,
  date: string,
  exerciseIndex: number
): Promise<WorkoutData | null> {
  const ref = doc(db, "users", uid, "workout", date);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as WorkoutData;
  const newExercises = (data.exercises ?? []).filter((_, i) => i !== exerciseIndex);
  const updated = { ...data, exercises: newExercises, updatedAt: serverTimestamp() };
  await setDoc(ref, updated);
  return { ...data, exercises: newExercises };
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
  // Use type-specific collections so run and walk never overwrite each other
  const colName = data.type === "walking" ? "cardio_walk" : "cardio_run";
  const ref = doc(db, "users", uid, colName, dateKey);
  await setDoc(ref, { ...data, date: dateKey, updatedAt: serverTimestamp() });
}

export async function getTodayRunCardio(uid: string): Promise<CardioData | null> {
  const ref = doc(db, "users", uid, "cardio_run", getTodayKey());
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as CardioData;
  return null;
}

export async function getTodayWalkCardio(uid: string): Promise<CardioData | null> {
  const ref = doc(db, "users", uid, "cardio_walk", getTodayKey());
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as CardioData;
  return null;
}

// Backward-compat: returns whichever of today's entries exists (run preferred)
export async function getTodayCardio(uid: string): Promise<CardioData | null> {
  const [run, walk] = await Promise.all([
    getTodayRunCardio(uid),
    getTodayWalkCardio(uid),
  ]);
  return run ?? walk;
}

export async function getCardioHistory(uid: string, days: number = 7): Promise<CardioData[]> {
  const dateKeys = getLastNDays(days);
  const results: CardioData[] = [];
  for (const key of dateKeys) {
    const [runSnap, walkSnap] = await Promise.all([
      getDoc(doc(db, "users", uid, "cardio_run", key)),
      getDoc(doc(db, "users", uid, "cardio_walk", key)),
    ]);
    // For the weekly chart, prefer run over walk; if neither, empty
    if (runSnap.exists()) {
      results.push({ date: key, ...runSnap.data() } as CardioData);
    } else if (walkSnap.exists()) {
      results.push({ date: key, ...walkSnap.data() } as CardioData);
    } else {
      results.push({ distanceKm: 0, durationMin: 0, date: key, type: "", steps: 0 });
    }
  }
  return results;
}

export async function getCardioFullHistory(uid: string, days: number = 30): Promise<CardioData[]> {
  const dateKeys = getLastNDays(days);
  const results: CardioData[] = [];
  for (const key of dateKeys) {
    const [runSnap, walkSnap] = await Promise.all([
      getDoc(doc(db, "users", uid, "cardio_run", key)),
      getDoc(doc(db, "users", uid, "cardio_walk", key)),
    ]);
    if (runSnap.exists()) results.push({ date: key, ...runSnap.data() } as CardioData);
    if (walkSnap.exists()) results.push({ date: key, ...walkSnap.data() } as CardioData);
  }
  // Sort newest first, keeping runs before walks on the same day
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

export async function deleteCardioEntry(uid: string, date: string, type: string): Promise<void> {
  const colName = type === "walking" ? "cardio_walk" : "cardio_run";
  const ref = doc(db, "users", uid, colName, date);
  await deleteDoc(ref);
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

export async function getSleepFullHistory(uid: string, days: number = 30): Promise<SleepData[]> {
  const dateKeys = getLastNDays(days);
  const results: SleepData[] = [];
  for (const key of dateKeys) {
    const ref = doc(db, "users", uid, "sleep", key);
    const snap = await getDoc(ref);
    if (snap.exists()) results.push(snap.data() as SleepData);
  }
  return results.reverse(); // newest first
}

export async function deleteSleepEntry(uid: string, date: string): Promise<void> {
  const ref = doc(db, "users", uid, "sleep", date);
  await deleteDoc(ref);
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

export async function getSpendingFullHistory(uid: string): Promise<SpendingEntry[]> {
  const q = query(
    collection(db, "users", uid, "spending"),
    orderBy("createdAt", "desc"),
    limit(200)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SpendingEntry));
}

export async function deleteSpendingEntry(uid: string, entryId: string): Promise<void> {
  const ref = doc(db, "users", uid, "spending", entryId);
  await deleteDoc(ref);
}
