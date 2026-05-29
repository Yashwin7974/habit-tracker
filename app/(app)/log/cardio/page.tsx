"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { logCardio, getTodayCardio, getCardioHistory, CardioData } from "@/lib/firestore";

const CARDIO_TYPES = [
  { id: "running", label: "Running", icon: "directions_run", color: "primary" },
  { id: "walking", label: "Walking", icon: "directions_walk", color: "secondary" },
];

export default function CardioPage() {
  const { user } = useAuth();
  const [cardioType, setCardioType] = useState("running");
  
  // Running fields
  const [distance, setDistance] = useState(5.0);
  const [duration, setDuration] = useState(30);
  
  // Walking fields
  const [steps, setSteps] = useState(5000);
  
  const [todayData, setTodayData] = useState<CardioData | null>(null);
  const [history, setHistory] = useState<CardioData[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [data, hist] = await Promise.all([
      getTodayCardio(user.uid),
      getCardioHistory(user.uid, 7),
    ]);
    setTodayData(data);
    setHistory(hist);
    if (data?.type) {
      setCardioType(data.type);
      if (data.type === "walking" && data.steps) {
        setSteps(data.steps);
      } else if (data.type === "running" && data.distanceKm) {
        setDistance(data.distanceKm);
        setDuration(data.durationMin);
      }
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const pace = duration > 0 && distance > 0
    ? `${Math.floor(duration / distance)}:${String(Math.round(((duration / distance) % 1) * 60)).padStart(2, "0")}`
    : "--";

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      if (cardioType === "running") {
        await logCardio(user.uid, {
          distanceKm: distance,
          durationMin: duration,
          type: "running",
          steps: 0,
        });
      } else {
        await logCardio(user.uid, {
          distanceKm: 0,
          durationMin: 0,
          type: "walking",
          steps: steps,
        });
      }
      setSaved(true);
      await load();
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const activeLabel = cardioType === "running" ? "Run" : "Walk";

  // Insights
  const runDays = history.filter((d) => d.type === "running" && d.distanceKm > 0);
  const walkDays = history.filter((d) => d.type === "walking" && (d.steps ?? 0) > 0);
  const totalDistKm = runDays.reduce((s, d) => s + d.distanceKm, 0);
  const totalSteps = walkDays.reduce((s, d) => s + (d.steps ?? 0), 0);
  const bestRun = runDays.reduce((best, d) => d.distanceKm > best ? d.distanceKm : best, 0);
  const bestWalk = walkDays.reduce((best, d) => (d.steps ?? 0) > best ? (d.steps ?? 0) : best, 0);
  const cardioSessions = history.filter((d) => (d.distanceKm > 0 || (d.steps ?? 0) > 0)).length;
  const insightMsg =
    cardioSessions >= 6 ? "🏆 Incredible week! You're a cardio machine!" :
    cardioSessions >= 4 ? "🔥 Smashing your cardio goals!" :
    cardioSessions >= 2 ? "💟 Good momentum this week!" :
    cardioSessions === 1 ? "👍 First session logged! Keep pushing!" :
    "💡 Start your first cardio session today!";

  return (
    <div className="px-[1.25rem] max-w-lg mx-auto py-4 space-y-[2rem] relative">
      <div className="ambient-glow" />

      {/* Header */}
      <section className="pt-4">
        <h2 className="text-[24px] font-bold leading-8 text-on-background mb-1">Cardio Logging</h2>
        <p className="text-[16px] leading-6 text-on-surface-variant">Log your sessions and track your cardiovascular health.</p>
      </section>

      {/* Cardio Type Selector */}
      <section>
        <div className="grid grid-cols-2 gap-4">
          {CARDIO_TYPES.map((type) => {
            const active = cardioType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setCardioType(type.id)}
                className={`glass-card rounded-[2rem] p-5 flex flex-col items-center justify-center gap-3 transition-all active:scale-95 cursor-pointer border ${
                  active
                    ? type.id === "running"
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-secondary bg-secondary/10 ring-2 ring-secondary/20"
                    : "border-white/5 hover:bg-white/5"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-4xl ${
                    active ? (type.id === "running" ? "text-primary" : "text-secondary") : "text-on-surface-variant"
                  }`}
                >
                  {type.icon}
                </span>
                <span className={`text-[16px] font-bold ${
                  active ? (type.id === "running" ? "text-primary" : "text-secondary") : "text-on-surface-variant"
                }`}>
                  {type.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Today's summary */}
      {todayData && (
        <section className={`glass-card rounded-[2rem] p-6 border-l-4 ${todayData.type === "walking" ? "border-secondary" : "border-primary"} fade-in-up`}>
          <p className="text-[14px] font-semibold text-on-surface-variant mb-3">
            Today&apos;s {todayData.type === "walking" ? "Walk" : "Run"}
          </p>
          
          {todayData.type === "walking" ? (
            /* Walking Summary */
            <div className="flex justify-center items-center py-2">
              <div className="text-center">
                <p className="text-[36px] font-black text-secondary">
                  {(todayData.steps ?? 0).toLocaleString()}
                </p>
                <p className="text-[14px] font-medium text-on-surface-variant">steps logged</p>
              </div>
            </div>
          ) : (
            /* Running Summary */
            <div className="flex justify-between items-center">
              <div className="text-center">
                <p className="text-[32px] font-extrabold text-primary">
                  {todayData.distanceKm.toFixed(2)}
                  <span className="text-[14px] font-normal text-on-surface-variant block">km</span>
                </p>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <p className="text-[32px] font-extrabold text-on-surface">
                  {((todayData.distanceKm || 0) * 1000).toLocaleString()}
                  <span className="text-[14px] font-normal text-on-surface-variant block">m</span>
                </p>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <p className="text-[32px] font-extrabold text-secondary">
                  {todayData.durationMin}
                  <span className="text-[14px] font-normal text-on-surface-variant block">min</span>
                </p>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <p className="text-[32px] font-extrabold text-tertiary">
                  {todayData.durationMin > 0 && todayData.distanceKm > 0
                    ? `${Math.floor(todayData.durationMin / todayData.distanceKm)}:${String(Math.round(((todayData.durationMin / todayData.distanceKm) % 1) * 60)).padStart(2, "0")}`
                    : "--"}
                  <span className="text-[14px] font-normal text-on-surface-variant block">pace/km</span>
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Log Form */}
      <section className="glass-card rounded-[2rem] p-6 flex flex-col gap-6">
        <h3 className="text-[20px] font-semibold text-on-surface">Log a {activeLabel}</h3>

        {cardioType === "running" ? (
          /* Running Logging Inputs */
          <>
            {/* Running Distance */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-baseline">
                <label className="text-[14px] font-semibold text-on-surface-variant">Distance</label>
                <span className="text-[12px] text-primary/85 font-medium">
                  = {(distance * 1000).toLocaleString()} meters
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setDistance(Math.max(0, parseFloat((distance - 0.05).toFixed(2))))}
                  className="w-12 h-12 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center hover:bg-surface-bright transition-colors active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-on-surface">remove</span>
                </button>
                <div className="flex-1 bg-surface-container neomorphic-inner rounded-xl flex items-center justify-center gap-1 relative py-1 px-4">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={distance === 0 ? "" : distance}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setDistance(isNaN(val) ? 0 : val);
                    }}
                    className="w-full bg-transparent text-center text-[32px] font-extrabold text-primary focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[18px] font-normal text-on-surface-variant">km</span>
                </div>
                <button
                  onClick={() => setDistance(parseFloat((distance + 0.05).toFixed(2)))}
                  className="w-12 h-12 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center hover:bg-surface-bright transition-colors active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-on-surface">add</span>
                </button>
              </div>
            </div>

            {/* Running Duration */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-on-surface-variant">Duration (minutes)</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setDuration(Math.max(0, duration - 1))}
                  className="w-12 h-12 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center hover:bg-surface-bright transition-colors active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-on-surface">remove</span>
                </button>
                <div className="flex-1 bg-surface-container neomorphic-inner rounded-xl flex items-center justify-center gap-1 relative py-1 px-4">
                  <input
                    type="number"
                    min="0"
                    value={duration === 0 ? "" : duration}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setDuration(isNaN(val) ? 0 : val);
                    }}
                    className="w-full bg-transparent text-center text-[32px] font-extrabold text-on-surface focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[18px] font-normal text-on-surface-variant">min</span>
                </div>
                <button
                  onClick={() => setDuration(duration + 1)}
                  className="w-12 h-12 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center hover:bg-surface-bright transition-colors active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-on-surface">add</span>
                </button>
              </div>
            </div>

            {/* Running Pace Preview */}
            <div className="flex items-center justify-between px-4 py-3 bg-surface-container-high/50 rounded-xl border border-white/5">
              <span className="text-[14px] font-semibold text-on-surface-variant">Estimated Pace</span>
              <span className="text-[20px] font-semibold text-tertiary">{pace} min/km</span>
            </div>
          </>
        ) : (
          /* Walking Logging Input (Steps, No Duration) */
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-on-surface-variant">Steps</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSteps(Math.max(0, steps - 500))}
                className="w-12 h-12 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center hover:bg-surface-bright transition-colors active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-on-surface">remove</span>
              </button>
              <div className="flex-1 bg-surface-container neomorphic-inner rounded-xl flex items-center justify-center gap-1 relative py-1 px-4">
                <input
                  type="number"
                  min="0"
                  value={steps === 0 ? "" : steps}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setSteps(isNaN(val) ? 0 : val);
                  }}
                  className="w-full bg-transparent text-center text-[32px] font-extrabold text-secondary focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[16px] font-normal text-on-surface-variant">steps</span>
              </div>
              <button
                onClick={() => setSteps(steps + 500)}
                className="w-12 h-12 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center hover:bg-surface-bright transition-colors active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-on-surface">add</span>
              </button>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSave}
          disabled={saving || (cardioType === "running" ? distance === 0 : steps === 0)}
          className={`w-full py-4 rounded-full bg-gradient-to-r text-on-primary text-[16px] font-semibold shadow-lg hover:-translate-y-1 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${
            cardioType === "walking"
              ? "from-secondary to-tertiary shadow-secondary/20 hover:shadow-secondary/30"
              : "from-primary to-inverse-primary shadow-primary/20 hover:shadow-primary/30"
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            {cardioType === "walking" ? "directions_walk" : "directions_run"}
          </span>
          {saved ? `${activeLabel} Logged! ✓` : saving ? "Saving…" : `Log ${activeLabel}`}
        </button>
      </section>

      {/* Insights Section */}
      <section className="glass-card rounded-[2rem] p-6 space-y-4">
        <h3 className="text-[20px] font-semibold text-on-surface">Weekly Insights</h3>
        <p className="text-[14px] font-medium text-secondary bg-secondary/10 border border-secondary/20 px-4 py-2 rounded-full text-center">{insightMsg}</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-container-high/60 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>directions_run</span>
            <span className="text-[22px] font-extrabold text-on-surface">{totalDistKm.toFixed(1)}</span>
            <span className="text-[10px] font-medium text-on-surface-variant text-center">km Run</span>
          </div>
          <div className="bg-surface-container-high/60 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>directions_walk</span>
            <span className="text-[22px] font-extrabold text-on-surface">{totalSteps.toLocaleString()}</span>
            <span className="text-[10px] font-medium text-on-surface-variant text-center">Steps Walk</span>
          </div>
          <div className="bg-surface-container-high/60 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="material-symbols-outlined text-tertiary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
            <span className="text-[22px] font-extrabold text-on-surface">{cardioSessions}</span>
            <span className="text-[10px] font-medium text-on-surface-variant text-center">Sessions</span>
          </div>
        </div>
        {(bestRun > 0 || bestWalk > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {bestRun > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-primary/10 rounded-xl border border-primary/20">
                <span className="text-[12px] font-semibold text-on-surface-variant">Best Run</span>
                <span className="text-[16px] font-bold text-primary">{bestRun.toFixed(2)} km</span>
              </div>
            )}
            {bestWalk > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-secondary/10 rounded-xl border border-secondary/20">
                <span className="text-[12px] font-semibold text-on-surface-variant">Best Walk</span>
                <span className="text-[16px] font-bold text-secondary">{bestWalk.toLocaleString()} steps</span>
              </div>
            )}
          </div>
        )}
        {/* 7-day activity bar */}
        <div className="h-16 flex items-end gap-1.5 pt-2">
          {history.map((d, i) => {
            const hasRun = d.type === "running" && d.distanceKm > 0;
            const hasWalk = d.type === "walking" && (d.steps ?? 0) > 0;
            const active = hasRun || hasWalk;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-sm transition-all duration-500 ${hasRun ? "bg-primary" : hasWalk ? "bg-secondary" : "bg-surface-container-high"}`}
                  style={{ height: active ? "100%" : "8%" }}
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
