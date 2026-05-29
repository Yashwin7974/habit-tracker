"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTodayHydration, addWaterMl, updateWaterGoalMl, getHydrationHistory, HydrationData } from "@/lib/firestore";

export default function HydrationPage() {
  const { user } = useAuth();
  const [data, setData] = useState<HydrationData>({ ml: 0, goalMl: 2000, glasses: 0, goalGlasses: 8 });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [hyd, hist] = await Promise.all([
        getTodayHydration(user.uid),
        getHydrationHistory(user.uid, 7),
      ]);
      setData(hyd);
      setHistory(hist);
      setNewGoal(hyd.goalMl.toString());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddWater = async (amount: number) => {
    if (!user || adding || amount <= 0) return;
    setAdding(true);
    try {
      const updated = await addWaterMl(user.uid, amount);
      setData(updated);
    } finally {
      setAdding(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customAmount);
    if (!isNaN(val) && val > 0) {
      handleAddWater(val);
      setCustomAmount("");
    }
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const val = parseInt(newGoal);
    if (!isNaN(val) && val >= 500 && val <= 10000) {
      setLoading(true);
      try {
        const updated = await updateWaterGoalMl(user.uid, val);
        setData(updated);
        setIsEditingGoal(false);
      } finally {
        setLoading(false);
      }
    }
  };

  const percent = Math.min(data.ml / data.goalMl, 1);
  const waterLiters = (data.ml / 1000).toFixed(2);
  const goalLiters = (data.goalMl / 1000).toFixed(2);

  // For the drop indicators, each drop represents 250ml
  const dropIncrement = 250;
  const totalDrops = Math.ceil(data.goalMl / dropIncrement);
  const filledDrops = Math.floor(data.ml / dropIncrement);

  // Insights computations
  const activeDays = history.filter((d) => d.ml > 0).length;
  const goalDays = history.filter((d) => d.ml >= d.goalMl).length;
  const avgMl = activeDays > 0 ? Math.round(history.reduce((s, d) => s + d.ml, 0) / 7) : 0;
  const streak = (() => {
    let s = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].ml >= history[i].goalMl) s++;
      else break;
    }
    return s;
  })();
  const insightMsg =
    streak >= 7 ? "🏆 Perfect week! Legendary hydration!" :
    streak >= 5 ? "🔥 Almost a perfect week!" :
    streak >= 3 ? "💧 Great streak going!" :
    goalDays >= 1 ? "👍 You hit your goal this week!" :
    "💡 Try to hit your daily water goal!";

  const presets = [
    { label: "Glass", amount: 250, icon: "local_drinking_water" },
    { label: "Bottle", amount: 500, icon: "water_bottle" },
    { label: "Large Bottle", amount: 750, icon: "liquor" },
    { label: "Flask", amount: 1000, icon: "filter_hdr" },
  ];

  return (
    <div className="px-[1.25rem] max-w-lg mx-auto py-4 space-y-[2rem] relative">
      <div className="ambient-glow" />

      {/* Header */}
      <section className="pt-4 flex justify-between items-start">
        <div>
          <h2 className="text-[24px] font-bold leading-8 text-on-background mb-1">Hydration Tracker</h2>
          <p className="text-[16px] leading-6 text-on-surface-variant">Stay on top of your daily water intake.</p>
        </div>
        <button
          onClick={() => setIsEditingGoal(!isEditingGoal)}
          className="w-10 h-10 rounded-full glass-card hover:bg-white/10 flex items-center justify-center text-primary transition-all duration-300 cursor-pointer"
          title="Edit water goal"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isEditingGoal ? "close" : "edit"}
          </span>
        </button>
      </section>

      {/* Goal Edit Panel */}
      {isEditingGoal && (
        <section className="glass-card rounded-[2rem] p-6 fade-in-up">
          <h3 className="text-[20px] font-semibold text-on-surface mb-3">Adjust Water Goal</h3>
          <form onSubmit={handleGoalSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="number"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                min="500"
                max="10000"
                step="50"
                placeholder="Daily goal (e.g. 2500)"
                className="w-full bg-surface-container-lowest border border-white/10 rounded-[1.5rem] px-4 py-3 text-on-surface text-[16px] focus:outline-none focus:border-primary transition-colors pr-12 neomorphic-inner"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[14px]">ml</span>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-on-primary font-semibold px-6 rounded-[1.5rem] hover:bg-primary-dark transition-all duration-300 disabled:opacity-50 cursor-pointer"
            >
              Save
            </button>
          </form>
        </section>
      )}

      {/* Main Card */}
      <section className="glass-card rounded-[2rem] p-6 flex flex-col items-center gap-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-surface-container-high/50 to-transparent pointer-events-none" />

        {/* Big Progress Ring */}
        <div className="relative w-48 h-48 z-10">
          <svg className="w-full h-full progress-ring" viewBox="0 0 100 100">
            <circle className="text-surface-container-high stroke-current" cx="50" cy="50" fill="transparent" r="40" strokeWidth="8" />
            <circle
              className="text-primary stroke-current progress-ring__circle"
              cx="50" cy="50" fill="transparent" r="40"
              strokeDasharray="251.2"
              strokeDashoffset={251.2 * (1 - percent)}
              strokeLinecap="round"
              strokeWidth="8"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              water_drop
            </span>
            <span className="text-[24px] font-bold text-on-surface mt-1">{data.ml}</span>
            <span className="text-[12px] font-medium text-on-surface-variant">/ {data.goalMl} ml</span>
          </div>
        </div>

        {/* Stats */}
        <div className="z-10 w-full flex justify-between px-4">
          <div className="text-center">
            <p className="text-[24px] font-bold text-primary">{waterLiters}L</p>
            <p className="text-[12px] font-medium text-on-surface-variant">Consumed</p>
          </div>
          <div className="w-px bg-white/10" />
          <div className="text-center">
            <p className="text-[24px] font-bold text-on-surface-variant">{goalLiters}L</p>
            <p className="text-[12px] font-medium text-on-surface-variant">Goal</p>
          </div>
          <div className="w-px bg-white/10" />
          <div className="text-center">
            <p className="text-[24px] font-bold text-secondary">{Math.round(percent * 100)}%</p>
            <p className="text-[12px] font-medium text-on-surface-variant">Complete</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="z-10 w-full">
          <div className="h-3 w-full bg-surface-container-lowest rounded-full neomorphic-inner overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-inverse-primary to-primary rounded-full transition-all duration-700"
              style={{ width: `${percent * 100}%` }}
            />
          </div>
        </div>
      </section>

      {/* Preset Log Options */}
      <section className="glass-card rounded-[2rem] p-6 space-y-4">
        <h3 className="text-[20px] font-semibold text-on-surface">Quick Add</h3>
        <div className="grid grid-cols-2 gap-3">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleAddWater(preset.amount)}
              disabled={adding || loading}
              className="glass-card rounded-[1.5rem] p-4 flex flex-col items-center gap-2 hover:bg-white/5 active:scale-[0.98] transition-all duration-300 border border-white/5 group text-center cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-primary text-2xl group-hover:scale-110 transition-transform">
                {preset.icon}
              </span>
              <div>
                <p className="text-[14px] font-semibold text-on-surface">{preset.label}</p>
                <p className="text-[12px] text-on-surface-variant">+{preset.amount} ml</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Custom Add Form */}
      <section className="glass-card rounded-[2rem] p-6">
        <h3 className="text-[20px] font-semibold text-on-surface mb-4">Add Custom Amount</h3>
        <form onSubmit={handleCustomSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              min="1"
              max="2000"
              placeholder="E.g. 350"
              className="w-full bg-surface-container-lowest border border-white/10 rounded-[1.5rem] px-4 py-3 text-on-surface text-[16px] focus:outline-none focus:border-primary transition-colors pr-12 neomorphic-inner"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[14px]">ml</span>
          </div>
          <button
            type="submit"
            disabled={adding || loading || !customAmount}
            className="w-12 h-12 rounded-[1.5rem] bg-primary text-on-primary flex items-center justify-center shadow-[0_4px_15px_rgba(77,142,255,0.3)] hover:shadow-[0_6px_20px_rgba(77,142,255,0.5)] active:scale-95 transition-all duration-300 disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">add</span>
          </button>
        </form>
      </section>

      {/* Water Drops Grid Visualization */}
      <section className="glass-card rounded-[2rem] p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[20px] font-semibold text-on-surface">Milestones</h3>
          <span className="text-[12px] text-on-surface-variant">1 Drop = 250ml</span>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: Math.min(totalDrops, 30) }).map((_, i) => (
            <div
              key={i}
              className={`aspect-square rounded-xl flex items-center justify-center transition-all duration-300 ${
                i < filledDrops
                  ? "bg-primary/30 border border-primary/50 text-primary animate-pulse-glow"
                  : "bg-surface-container-high border border-white/5 text-outline-variant"
              }`}
            >
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: i < filledDrops ? "'FILL' 1" : "'FILL' 0" }}>
                water_drop
              </span>
            </div>
          ))}
        </div>
        {totalDrops > 30 && (
          <p className="text-[12px] text-on-surface-variant text-center mt-3">
            Showing first 30 milestones of {totalDrops} total drops.
          </p>
        )}
      </section>

      {/* Insights Card */}
      <section className="glass-card rounded-[2rem] p-6 space-y-4">
        <h3 className="text-[20px] font-semibold text-on-surface">Weekly Insights</h3>
        <p className="text-[14px] font-medium text-secondary bg-secondary/10 border border-secondary/20 px-4 py-2 rounded-full text-center">{insightMsg}</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-container-high/60 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            <span className="text-[22px] font-extrabold text-on-surface">{streak}</span>
            <span className="text-[10px] font-medium text-on-surface-variant text-center">Day Streak</span>
          </div>
          <div className="bg-surface-container-high/60 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
            <span className="text-[22px] font-extrabold text-on-surface">{goalDays}/7</span>
            <span className="text-[10px] font-medium text-on-surface-variant text-center">Goals Met</span>
          </div>
          <div className="bg-surface-container-high/60 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="material-symbols-outlined text-tertiary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
            <span className="text-[22px] font-extrabold text-on-surface">{avgMl}</span>
            <span className="text-[10px] font-medium text-on-surface-variant text-center">Avg ml/day</span>
          </div>
        </div>
        {/* 7-day mini bar chart */}
        <div className="h-16 flex items-end gap-1.5 pt-2">
          {history.map((d, i) => {
            const h = d.goalMl > 0 ? Math.min((d.ml / d.goalMl), 1) : 0;
            const isGoalMet = d.ml >= d.goalMl;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-sm transition-all duration-500 ${isGoalMet ? "bg-primary" : h > 0 ? "bg-primary/40" : "bg-surface-container-high"}`}
                  style={{ height: `${Math.max(h * 100, 8)}%` }}
                />
                <span className="text-[9px] text-outline-variant">{["M","T","W","T","F","S","S"][i]}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
