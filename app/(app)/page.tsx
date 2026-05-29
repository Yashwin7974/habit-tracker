"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getTodayHydration,
  HydrationData,
  getWorkoutHistory,
  getTodayCardio,
  CardioData,
  getSleepHistory,
  SleepData,
} from "@/lib/firestore";

function RadialProgress({ percent, size = 128 }: { percent: number; size?: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(percent, 1));
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full progress-ring" viewBox="0 0 100 100">
        <circle className="text-surface-container-high stroke-current" cx="50" cy="50" fill="transparent" r={r} strokeWidth="8" />
        <circle
          className="text-primary stroke-current progress-ring__circle"
          cx="50" cy="50" fill="transparent" r={r}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="8"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[24px] font-bold leading-8 text-on-surface">{Math.round(percent * 100)}%</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [hydration, setHydration] = useState<HydrationData>({ ml: 0, goalMl: 2000, glasses: 0, goalGlasses: 8 });
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [cardio, setCardio] = useState<CardioData | null>(null);
  const [sleep, setSleep] = useState<SleepData | null>(null);
  const [streak] = useState(14);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [hyd, workouts, cardioData, sleeps] = await Promise.all([
        getTodayHydration(user.uid),
        getWorkoutHistory(user.uid, 1),
        getTodayCardio(user.uid),
        getSleepHistory(user.uid, 1),
      ]);
      setHydration(hyd);
      setWorkoutDuration(workouts[0]?.durationMin ?? 0);
      setCardio(cardioData);
      setSleep(sleeps[0]?.hours > 0 ? sleeps[0] : null);
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Overall progress: how many of 4 goals are "done"
  const hydrationDone = hydration.ml >= hydration.goalMl ? 1 : hydration.ml / hydration.goalMl;
  const workoutDone = workoutDuration >= 30 ? 1 : workoutDuration / 30;
  
  const cardioDone = cardio
    ? cardio.type === "walking"
      ? (cardio.steps ?? 0) >= 10000 ? 1 : (cardio.steps ?? 0) / 10000
      : (cardio.distanceKm ?? 0) >= 5 ? 1 : (cardio.distanceKm ?? 0) / 5
    : 0;

  const sleepDone = sleep ? (sleep.hours * 60 + sleep.minutes) / 480 : 0;
  const overallPercent = (hydrationDone + workoutDone + cardioDone + sleepDone) / 4;

  const habitCards = [
    {
      title: "Water",
      icon: "water_drop",
      color: "primary",
      href: "/log/hydration",
      value: `${hydration.ml} / ${hydration.goalMl}`,
      unit: "ml",
      progress: hydration.ml / hydration.goalMl,
      type: "bar",
      glowColor: "bg-primary/10",
    },
    {
      title: "Workout",
      icon: "fitness_center",
      color: "secondary",
      href: "/log/workout",
      value: workoutDuration.toString(),
      unit: "min",
      progress: Math.min(workoutDuration / 60, 1),
      type: "bar",
      glowColor: "bg-secondary/10",
    },
    {
      title: "Sleep",
      icon: "bedtime",
      color: "tertiary",
      href: "/log/sleep",
      value: sleep ? `${sleep.hours}h ${sleep.minutes}m` : "--",
      unit: "/ 8h goal",
      progress: sleepDone,
      type: "ring-mini",
      glowColor: "bg-tertiary/10",
    },
    {
      title: "Cardio",
      icon: cardio?.type === "walking" ? "directions_walk" : "directions_run",
      color: "error",
      href: "/log/cardio",
      value: cardio
        ? cardio.type === "walking"
          ? (cardio.steps ?? 0).toLocaleString()
          : `${cardio.distanceKm.toFixed(2)}`
        : "--",
      unit: cardio?.type === "walking" ? "steps" : "km",
      progress: cardioDone,
      type: "bar",
      glowColor: "bg-error/10",
    },
  ];

  return (
    <div className="px-[1.25rem] max-w-5xl mx-auto space-y-[2rem] py-4 relative">
      {/* Daily Progress Card */}
      <section className="glass-card rounded-[2rem] p-[1rem] flex flex-col md:flex-row items-center justify-between gap-6 fade-in-up">
        <div className="flex-1 space-y-2 text-center md:text-left">
          <h2 className="text-[20px] font-semibold leading-7 text-on-surface">Daily Momentum</h2>
          <p className="text-on-surface-variant text-[16px] leading-6">You&apos;re on track! Keep pushing towards your goals.</p>
          <div className="inline-flex items-center gap-1 bg-surface-container-high px-3 py-1 rounded-full border border-white/5 mt-2">
            <span className="material-symbols-outlined text-tertiary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_fire_department
            </span>
            <span className="text-[14px] font-semibold text-tertiary">{streak} Day Streak</span>
          </div>
        </div>
        <RadialProgress percent={overallPercent} size={128} />
      </section>

      {/* Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1rem]">
        {habitCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="glass-card rounded-[2rem] p-[1rem] flex flex-col gap-4 relative overflow-hidden group hover:bg-white/5 transition-all duration-300 active:scale-[0.98]"
          >
            {/* Ambient glow blob */}
            <div className={`absolute -right-4 -top-4 w-24 h-24 ${card.glowColor} rounded-full blur-2xl`} />

            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full bg-${card.color}-container/20 flex items-center justify-center text-${card.color}`}>
                  <span className="material-symbols-outlined">{card.icon}</span>
                </div>
                <h3 className="text-[20px] font-semibold leading-7 text-on-surface">{card.title}</h3>
              </div>
              <div className={`w-8 h-8 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center group-hover:bg-${card.color}-container group-hover:text-on-${card.color}-container transition-colors`}>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[16px] leading-6 text-on-surface-variant">{card.unit}</span>
                <span className={`text-[20px] font-semibold leading-7 text-${card.color}`}>{card.value}</span>
              </div>

              {card.type === "bar" && (
                <div className="h-2 w-full bg-surface-container-lowest rounded-full neomorphic-inner overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r from-inverse-primary to-primary rounded-full transition-all duration-700`}
                    style={{ width: `${Math.min(card.progress * 100, 100)}%` }}
                  />
                </div>
              )}

              {card.type === "ring-mini" && (
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 progress-ring" viewBox="0 0 100 100">
                    <circle className="text-surface-container-high stroke-current" cx="50" cy="50" fill="transparent" r="40" strokeWidth="12" />
                    <circle
                      className="text-tertiary stroke-current progress-ring__circle"
                      cx="50" cy="50" fill="transparent" r="40"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 * (1 - Math.min(card.progress, 1))}
                      strokeLinecap="round"
                      strokeWidth="12"
                    />
                  </svg>
                  <span className="text-[12px] font-medium text-on-surface-variant">Goal: 8h</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </section>

      {/* Spending shortcut */}
      <Link
        href="/log/spending"
        className="glass-card rounded-[2rem] p-[1rem] flex items-center justify-between group hover:bg-white/5 transition-all duration-300 active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-tertiary-container/20 flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
          </div>
          <div>
            <h3 className="text-[20px] font-semibold text-on-surface">Spending</h3>
            <p className="text-[14px] text-on-surface-variant">Log today's expenses</p>
          </div>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">
          arrow_forward
        </span>
      </Link>

      {/* FAB */}
      <Link
        href="/log"
        className="fixed bottom-24 right-[1.25rem] w-14 h-14 rounded-full bg-gradient-to-br from-primary to-inverse-primary text-on-primary glow-pab flex items-center justify-center z-40 transition-transform active:scale-95 hover:scale-105"
      >
        <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'wght' 600" }}>
          add
        </span>
      </Link>
    </div>
  );
}
