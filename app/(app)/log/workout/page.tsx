"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { logWorkout, getWorkoutHistory, WorkoutData } from "@/lib/firestore";

const WORKOUT_TYPES = [
  { id: "push", label: "Push", icon: "fitness_center" },
  { id: "pull", label: "Pull", icon: "accessibility_new" },
  { id: "legs", label: "Legs", icon: "directions_run" },
  { id: "arms", label: "Arms", icon: "sports_gymnastics" },
];

const EXERCISES_BY_TYPE: Record<string, string[]> = {
  push: [
    "Bench Press",
    "Incline Dumbbell Press",
    "Overhead Press (OHP)",
    "Lateral Raises",
    "Tricep Pushdowns",
    "Decline Chest Press",
    "Chest Flyes",
    "Tricep Overhead Extension"
  ],
  pull: [
    "Deadlift",
    "Pull-Ups / Chin-Ups",
    "Lat Pulldown",
    "Bent Over Barbell Row",
    "Seated Cable Row",
    "Face Pulls",
    "Barbell Bicep Curls",
    "Dumbbell Hammer Curls"
  ],
  legs: [
    "Barbell Squats",
    "Leg Press",
    "Romanian Deadlifts (RDL)",
    "Leg Extensions",
    "Lying Leg Curls",
    "Calf Raises",
    "Walking Lunges"
  ],
  arms: [
    "Barbell Bicep Curls",
    "Preacher Curls",
    "Skull Crushers",
    "Tricep Pushdowns",
    "Dumbbell Hammer Curls",
    "Concentration Curls",
    "Overhead Tricep Extension",
    "Cable Bicep Curls"
  ]
};

interface LoggedExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export default function WorkoutPage() {
  const { user } = useAuth();
  const [workoutType, setWorkoutType] = useState("push");
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState("");
  const [loggedExercises, setLoggedExercises] = useState<LoggedExercise[]>([]);
  const [history, setHistory] = useState<WorkoutData[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const data = await getWorkoutHistory(user.uid, 7);
    setHistory(data);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleAddExercise = (exerciseName: string) => {
    if (loggedExercises.some((ex) => ex.name === exerciseName)) {
      setShowDropdown(false);
      return; // Already added
    }
    setLoggedExercises((prev) => [
      ...prev,
      { name: exerciseName, sets: 3, reps: 10, weight: 20 },
    ]);
    setShowDropdown(false);
  };

  const handleRemoveExercise = (index: number) => {
    setLoggedExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateExercise = (index: number, key: keyof LoggedExercise, value: number) => {
    setLoggedExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [key]: value } : ex))
    );
  };

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      // Auto-generate note summary from exercises list if present
      let exerciseSummary = "";
      if (loggedExercises.length > 0) {
        exerciseSummary = loggedExercises
          .map((ex) => `${ex.name}: ${ex.sets}x${ex.reps} @ ${ex.weight}kg`)
          .join("\n");
      }
      
      const finalNotes = notes 
        ? (exerciseSummary ? `${exerciseSummary}\n\nNotes: ${notes}` : notes)
        : exerciseSummary;

      await logWorkout(user.uid, {
        durationMin: duration,
        type: workoutType,
        notes: finalNotes,
        exercises: loggedExercises,
      });

      setSaved(true);
      setLoggedExercises([]);
      setNotes("");
      await load();
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const maxDuration = Math.max(...history.map((d) => d.durationMin), 60);
  const availableExercises = EXERCISES_BY_TYPE[workoutType] || [];

  // Insights computations
  const workoutsThisWeek = history.filter((d) => d.durationMin > 0).length;
  const totalVolume = history.reduce((sum, d) => {
    if (d.exercises && d.exercises.length > 0) {
      return sum + d.exercises.reduce((s, ex) => s + ex.sets * ex.reps * ex.weight, 0);
    }
    return sum;
  }, 0);
  const typeFreq: Record<string, number> = {};
  history.forEach((d) => { if (d.type) typeFreq[d.type] = (typeFreq[d.type] || 0) + 1; });
  const topSplit = Object.entries(typeFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const avgDuration = workoutsThisWeek > 0
    ? Math.round(history.filter((d) => d.durationMin > 0).reduce((s, d) => s + d.durationMin, 0) / workoutsThisWeek)
    : 0;
  const insightMsg =
    workoutsThisWeek >= 6 ? "🏆 Beast mode! Elite weekly volume!" :
    workoutsThisWeek >= 4 ? "🔥 Strong week! Consistency is key!" :
    workoutsThisWeek >= 2 ? "💪 Good progress, push for more!" :
    workoutsThisWeek === 1 ? "👍 One session logged! Keep it up!" :
    "💡 No sessions yet — let's get moving!";

  return (
    <div className="px-[1.25rem] max-w-lg mx-auto py-4 space-y-[2rem] relative">
      <div className="ambient-glow" />

      {/* Header */}
      <section className="pt-4">
        <h2 className="text-[24px] font-bold leading-8 text-on-background mb-2">Log Workout</h2>
        <p className="text-[16px] leading-6 text-on-surface-variant">Track your sets, reps, and progress.</p>
      </section>

      {/* Workout Split Selector */}
      <section>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {WORKOUT_TYPES.map((type) => {
            const active = workoutType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => {
                  setWorkoutType(type.id);
                  setLoggedExercises([]); // Clear logged exercises when switching workout split
                }}
                className={`glass-card rounded-[2rem] p-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border ${
                  active ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-white/5 hover:bg-white/5"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-3xl ${active ? "text-primary" : "text-on-surface-variant"}`}
                >
                  {type.icon}
                </span>
                <span className={`text-[14px] font-semibold ${active ? "text-primary" : "text-on-surface-variant"}`}>
                  {type.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Duration Card */}
      <section className="glass-card rounded-[2rem] p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-outline-variant">Duration (minutes)</label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDuration(Math.max(0, duration - 5))}
              className="w-12 h-12 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center text-on-surface hover:bg-surface-bright transition-colors active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined">remove</span>
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
              onClick={() => setDuration(duration + 5)}
              className="w-12 h-12 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center text-on-surface hover:bg-surface-bright transition-colors active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
      </section>

      {/* Exercises Selector Card */}
      <section className="glass-card rounded-[2rem] p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-[20px] font-semibold text-on-surface">Exercises</h3>
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="bg-primary/20 text-primary border border-primary/30 rounded-full px-4 py-1.5 text-[14px] font-medium flex items-center gap-1 hover:bg-primary/30 cursor-pointer transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">add</span> Add Exercise
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl py-2 z-50 max-h-60 overflow-y-auto no-scrollbar glass-card">
                {availableExercises.map((name) => (
                  <button
                    key={name}
                    onClick={() => handleAddExercise(name)}
                    className="w-full px-4 py-2.5 text-left text-on-surface text-[14px] hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    {name}
                  </button>
                ))}
                {availableExercises.length === 0 && (
                  <p className="px-4 py-2 text-on-surface-variant text-[12px] italic text-center">No exercises found</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected Exercises Details List */}
        <div className="space-y-3">
          {loggedExercises.map((ex, index) => (
            <div key={ex.name} className="glass-card rounded-2xl p-4 border border-white/5 space-y-3 relative overflow-hidden animate-fade-in-up">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-on-surface text-[16px] pr-8">{ex.name}</span>
                <button
                  onClick={() => handleRemoveExercise(index)}
                  className="text-error/60 hover:text-error hover:bg-error-container/20 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-90"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>

              {/* Set, Reps, Weight inputs */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-surface-container-lowest/50 rounded-xl p-2 flex flex-col items-center">
                  <span className="text-[10px] text-outline-variant font-medium uppercase mb-1">Sets</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateExercise(index, "sets", Math.max(1, ex.sets - 1))}
                      className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-on-surface hover:bg-white/10 text-[12px] cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-[14px] font-bold text-on-surface w-4 text-center">{ex.sets}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateExercise(index, "sets", ex.sets + 1)}
                      className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-on-surface hover:bg-white/10 text-[12px] cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-surface-container-lowest/50 rounded-xl p-2 flex flex-col items-center">
                  <span className="text-[10px] text-outline-variant font-medium uppercase mb-1">Reps</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateExercise(index, "reps", Math.max(1, ex.reps - 1))}
                      className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-on-surface hover:bg-white/10 text-[12px] cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-[14px] font-bold text-on-surface w-6 text-center">{ex.reps}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateExercise(index, "reps", ex.reps + 1)}
                      className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-on-surface hover:bg-white/10 text-[12px] cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-surface-container-lowest/50 rounded-xl p-2 flex flex-col items-center">
                  <span className="text-[10px] text-outline-variant font-medium uppercase mb-1">Weight (kg)</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateExercise(index, "weight", Math.max(0, ex.weight - 2.5))}
                      className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-on-surface hover:bg-white/10 text-[12px] cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-[14px] font-bold text-on-surface w-10 text-center">{ex.weight}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateExercise(index, "weight", ex.weight + 2.5)}
                      className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-on-surface hover:bg-white/10 text-[12px] cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {loggedExercises.length === 0 && (
            <p className="text-on-surface-variant text-[14px] italic text-center py-4">No exercises added yet. Use the add button above.</p>
          )}
        </div>
      </section>

      {/* Notes and Save Card */}
      <section className="glass-card rounded-[2rem] p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-outline-variant">Extra Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Felt strong, focused on slow negatives..."
            rows={3}
            className="w-full bg-surface-container-lowest/50 border border-white/5 rounded-xl p-4 text-[16px] text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-1 focus:ring-primary neomorphic-inner resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-full bg-gradient-to-r from-primary to-inverse-primary text-on-primary text-[16px] font-semibold shadow-[0_10px_25px_rgba(77,142,255,0.3)] hover:shadow-[0_15px_35px_rgba(77,142,255,0.5)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <span className="material-symbols-outlined">check_circle</span>
          {saved ? "Workout Logged! ✓" : saving ? "Saving…" : "Log Workout"}
        </button>
      </section>

      {/* Insights Section */}
      <section className="glass-card rounded-[2rem] p-6 space-y-4">
        <h3 className="text-[20px] font-semibold text-on-surface">Weekly Insights</h3>
        <p className="text-[14px] font-medium text-secondary bg-secondary/10 border border-secondary/20 px-4 py-2 rounded-full text-center">{insightMsg}</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-container-high/60 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
            <span className="text-[22px] font-extrabold text-on-surface">{workoutsThisWeek}</span>
            <span className="text-[10px] font-medium text-on-surface-variant text-center">Sessions</span>
          </div>
          <div className="bg-surface-container-high/60 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
            <span className="text-[22px] font-extrabold text-on-surface">{avgDuration}m</span>
            <span className="text-[10px] font-medium text-on-surface-variant text-center">Avg Duration</span>
          </div>
          <div className="bg-surface-container-high/60 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="material-symbols-outlined text-tertiary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>sports_score</span>
            <span className="text-[22px] font-extrabold text-on-surface capitalize">{topSplit}</span>
            <span className="text-[10px] font-medium text-on-surface-variant text-center">Top Split</span>
          </div>
        </div>
        {totalVolume > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-surface-container-high/50 rounded-xl border border-white/5">
            <span className="text-[14px] font-semibold text-on-surface-variant">Total Volume (week)</span>
            <span className="text-[18px] font-bold text-primary">{totalVolume.toLocaleString()} kg</span>
          </div>
        )}
      </section>

      {/* 7-Day Sparkline */}
      <section className="glass-card rounded-[2rem] p-6 flex flex-col gap-4">
        <h3 className="text-[20px] font-semibold text-on-surface">Weekly Activity</h3>
        <div className="h-24 w-full flex items-end gap-2">
          {history.map((d, i) => {
            const h = maxDuration > 0 ? (d.durationMin / maxDuration) * 100 : 0;
            const isToday = i === history.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-sm transition-all duration-500 ${isToday ? "bg-secondary" : h > 0 ? "bg-secondary/60" : "bg-surface-container-high"}`}
                  style={{ height: `${Math.max(h, 8)}%` }}
                />
                <span className="text-[10px] text-outline-variant">{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
