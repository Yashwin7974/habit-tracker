"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getWorkoutFullHistory,
  deleteWorkoutEntry,
  removeExerciseFromWorkout,
  getCardioFullHistory,
  deleteCardioEntry,
  getSleepFullHistory,
  deleteSleepEntry,
  getHydrationFullHistory,
  deleteHydrationEntry,
  getSpendingFullHistory,
  deleteSpendingEntry,
  WorkoutData,
  CardioData,
  SleepData,
  HydrationHistoryEntry,
  SpendingEntry,
} from "@/lib/firestore";

const TABS = [
  { id: "workout",   label: "Workout",   icon: "fitness_center" },
  { id: "running",   label: "Running",   icon: "directions_run" },
  { id: "walking",   label: "Walking",   icon: "directions_walk" },
  { id: "sleep",     label: "Sleep",     icon: "bedtime" },
  { id: "hydration", label: "Hydration", icon: "water_drop" },
  { id: "spending",  label: "Spending",  icon: "payments" },
];

const SPENDING_ICONS: Record<string, string> = {
  food: "restaurant", transport: "commute", fun: "celebration", other: "more_horiz",
};

const SPLIT_STYLE: Record<string, { border: string; bg: string; text: string; icon: string; label: string }> = {
  push: { border: "border-primary",   bg: "bg-primary/10",   text: "text-primary",   icon: "fitness_center",   label: "Push Day" },
  pull: { border: "border-secondary", bg: "bg-secondary/10", text: "text-secondary", icon: "accessibility_new", label: "Pull Day" },
  legs: { border: "border-tertiary",  bg: "bg-tertiary/10",  text: "text-tertiary",  icon: "directions_run",   label: "Legs Day" },
  arms: { border: "border-error",     bg: "bg-error/10",     text: "text-error",     icon: "sports_gymnastics", label: "Arms Day" },
};

function formatDate(d: string) {
  if (!d) return "";
  const today = new Date().toISOString().split("T")[0];
  const yest  = new Date(Date.now() - 864e5).toISOString().split("T")[0];
  if (d === today) return "Today";
  if (d === yest)  return "Yesterday";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function calcPace(durationMin: number, distanceKm: number) {
  if (!durationMin || !distanceKm) return "--";
  const total = durationMin / distanceKm;
  return `${Math.floor(total)}:${String(Math.round((total % 1) * 60)).padStart(2, "0")}`;
}

// ── small inline delete icon ──────────────────────────────────────────────────
function IconBtn({ onClick, icon = "delete", danger = true }: { onClick: () => void; icon?: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
        danger ? "text-error/40 hover:text-error hover:bg-error/10" : "text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-white/10"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}

// ── confirmation modal ────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="glass-card rounded-[2rem] p-6 relative z-10 w-[90%] max-w-sm space-y-5 fade-in-up">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-error/10 border border-error/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-error text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              delete_forever
            </span>
          </div>
          <h3 className="text-[20px] font-bold text-on-surface">Delete?</h3>
          <p className="text-[14px] text-on-surface-variant">{message}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}   className="flex-1 py-3 rounded-full bg-surface-container-high border border-white/10 text-on-surface font-semibold text-[14px] hover:bg-white/10 transition-all cursor-pointer">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-full bg-error text-on-error font-semibold text-[14px] hover:brightness-110 transition-all cursor-pointer">Delete</button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div className="glass-card rounded-[2rem] p-10 text-center text-on-surface-variant space-y-2">
      <span className="material-symbols-outlined text-4xl block opacity-30">{icon}</span>
      <p className="text-[14px]">{msg}</p>
    </div>
  );
}

function SectionLabel({ icon, label, count, color }: { icon: string; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-1 py-1">
      <span className={`material-symbols-outlined text-[18px] ${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      <span className={`text-[14px] font-bold ${color}`}>{label}</span>
      <span className="text-[11px] font-semibold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full ml-0.5">{count}</span>
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("workout");
  const [loading, setLoading] = useState(false);

  const [workouts,   setWorkouts]   = useState<WorkoutData[]>([]);
  const [cardios,    setCardios]    = useState<CardioData[]>([]);
  const [sleeps,     setSleeps]     = useState<SleepData[]>([]);
  const [hydrations, setHydrations] = useState<HydrationHistoryEntry[]>([]);
  const [spendings,  setSpendings]  = useState<SpendingEntry[]>([]);

  // pending-delete state  { category, id, extra? }
  const [pending, setPending] = useState<{ category: string; id: string; cardioType?: string; exIdx?: number; message: string } | null>(null);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [w, c, s, h, sp] = await Promise.all([
        getWorkoutFullHistory(user.uid, 30),
        getCardioFullHistory(user.uid, 30),
        getSleepFullHistory(user.uid, 30),
        getHydrationFullHistory(user.uid, 30),
        getSpendingFullHistory(user.uid),
      ]);
      setWorkouts(w); setCardios(c); setSleeps(s); setHydrations(h); setSpendings(sp);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const confirmDelete = async () => {
    if (!user || !pending) return;
    const { category, id, cardioType, exIdx } = pending;
    setPending(null);
    try {
      if (category === "workout") {
        await deleteWorkoutEntry(user.uid, id);
        setWorkouts((p) => p.filter((w) => w.date !== id));
      } else if (category === "exercise") {
        // delete single exercise from a workout
        const updated = await removeExerciseFromWorkout(user.uid, id, exIdx!);
        if (updated) {
          setWorkouts((p) => p.map((w) => w.date === id ? updated : w));
        }
      } else if (category === "cardio") {
        await deleteCardioEntry(user.uid, id, cardioType ?? "running");
        setCardios((p) => p.filter((c) => !(c.date === id && c.type === cardioType)));
      } else if (category === "sleep") {
        await deleteSleepEntry(user.uid, id);
        setSleeps((p) => p.filter((s) => s.date !== id));
      } else if (category === "hydration") {
        await deleteHydrationEntry(user.uid, id);
        setHydrations((p) => p.filter((h) => h.date !== id));
      } else if (category === "spending") {
        await deleteSpendingEntry(user.uid, id);
        setSpendings((p) => p.filter((s) => s.id !== id));
      }
    } catch (e) { console.error(e); }
  };

  const qualityStars = (q: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`material-symbols-outlined text-[13px] ${s <= q ? "text-tertiary" : "text-outline"}`}
          style={{ fontVariationSettings: s <= q ? "'FILL' 1" : "'FILL' 0" }}>star</span>
      ))}
    </div>
  );

  const runs  = cardios.filter((c) => c.type === "running");
  const walks = cardios.filter((c) => c.type === "walking");

  return (
    <div className="px-[1.25rem] max-w-lg mx-auto py-4 space-y-[1.5rem] relative">
      <div className="ambient-glow" />

      {/* Header */}
      <section className="pt-4">
        <h2 className="text-[24px] font-bold leading-8 text-on-background mb-1">History</h2>
        <p className="text-[16px] leading-6 text-on-surface-variant">Review and manage your logged entries.</p>
      </section>

      {/* Tab bar */}
      <section>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 border ${
                activeTab === tab.id ? "bg-primary/15 border-primary/40 text-primary" : "bg-surface-container-high border-white/5 text-on-surface-variant hover:bg-white/5"
              }`}>
              <span className="material-symbols-outlined text-[16px]"
                style={{ fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
        </div>
      ) : (
        <section className="space-y-3">

          {/* ══════════════════════════ WORKOUT ══════════════════════════ */}
          {activeTab === "workout" && (
            workouts.length === 0
              ? <EmptyState icon="fitness_center" msg="No workout entries in the last 30 days." />
              : workouts.map((w) => {
                  const s = SPLIT_STYLE[w.type] ?? SPLIT_STYLE.push;
                  const vol = w.exercises?.reduce((acc, e) => acc + e.sets * e.reps * e.weight, 0) ?? 0;
                  return (
                    <div key={w.date} className={`rounded-[2rem] overflow-hidden border ${s.border} bg-surface-container-low`}>

                      {/* ── coloured header ── */}
                      <div className={`${s.bg} px-5 pt-5 pb-4`}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-2xl ${s.bg} border ${s.border} flex items-center justify-center`}>
                              <span className={`material-symbols-outlined text-2xl ${s.text}`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                            </div>
                            <div>
                              <p className={`text-[17px] font-extrabold ${s.text}`}>{s.label}</p>
                              <p className="text-[12px] text-on-surface-variant mt-0.5">{formatDate(w.date)}</p>
                            </div>
                          </div>
                          <IconBtn onClick={() => setPending({ category: "workout", id: w.date, message: "This will delete the entire workout session." })} />
                        </div>

                        {/* ── stats row ── */}
                        <div className="flex gap-5 mt-4 pt-3 border-t border-white/5">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant opacity-70">Duration</p>
                            <p className={`text-[20px] font-extrabold ${s.text}`}>
                              {w.durationMin}<span className="text-[11px] text-on-surface-variant ml-0.5 font-normal">min</span>
                            </p>
                          </div>
                          {vol > 0 && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant opacity-70">Volume</p>
                              <p className="text-[20px] font-extrabold text-on-surface">
                                {vol >= 1000 ? `${(vol / 1000).toFixed(1)}k` : vol}
                                <span className="text-[11px] text-on-surface-variant ml-0.5 font-normal">kg</span>
                              </p>
                            </div>
                          )}
                          {(w.exercises?.length ?? 0) > 0 && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant opacity-70">Exercises</p>
                              <p className="text-[20px] font-extrabold text-on-surface">{w.exercises!.length}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── exercise rows (reps-only, per-row delete) ── */}
                      {w.exercises && w.exercises.length > 0 && (
                        <div className="divide-y divide-white/5 bg-surface-container-low">
                          {w.exercises.map((ex, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-3">
                              {/* colour dot */}
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.text.replace("text-", "bg-")}`} />
                              {/* name */}
                              <span className="text-[14px] font-medium text-on-surface flex-1 min-w-0 truncate">{ex.name}</span>
                              {/* reps pill */}
                              <span className="text-[12px] font-semibold text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded-full flex-shrink-0">
                                {ex.reps} reps
                              </span>
                              {/* weight pill */}
                              <span className={`text-[12px] font-bold ${s.text} bg-surface-container-high px-2.5 py-1 rounded-full flex-shrink-0`}>
                                {ex.weight} kg
                              </span>
                              {/* per-exercise delete */}
                              <IconBtn onClick={() => setPending({
                                category: "exercise",
                                id: w.date,
                                exIdx: i,
                                message: `Remove "${ex.name}" from this session?`,
                              })} />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* notes-only fallback */}
                      {w.notes && !w.exercises?.length && (
                        <p className="px-5 pb-4 text-[12px] text-on-surface-variant bg-surface-container-low line-clamp-2">{w.notes}</p>
                      )}
                    </div>
                  );
                })
          )}

          {/* ══════════════════════════ RUNNING ══════════════════════════ */}
          {activeTab === "running" && (
            runs.length === 0
              ? <EmptyState icon="directions_run" msg="No running sessions in the last 30 days." />
              : (
                <div className="space-y-3">
                  <SectionLabel icon="directions_run" label="Running Sessions" count={runs.length} color="text-primary" />
                  {runs.map((c) => (
                    <div key={`run-${c.date}`} className="glass-card rounded-[2rem] p-5 border border-white/5 border-l-4 border-l-primary">
                      {/* label row */}
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[14px] font-semibold text-on-surface-variant">
                          🏃 Run · {formatDate(c.date)}
                        </p>
                        <IconBtn onClick={() => setPending({ category: "cardio", id: c.date, cardioType: "running", message: "Delete this run session?" })} />
                      </div>
                      {/* stats — identical to cardio page */}
                      <div className="flex justify-between items-center">
                        <div className="text-center">
                          <p className="text-[32px] font-extrabold text-primary leading-none">
                            {c.distanceKm.toFixed(2)}
                            <span className="text-[12px] font-normal text-on-surface-variant block mt-1">km</span>
                          </p>
                        </div>
                        <div className="w-px h-10 bg-white/10" />
                        <div className="text-center">
                          <p className="text-[32px] font-extrabold text-on-surface leading-none">
                            {((c.distanceKm || 0) * 1000).toLocaleString()}
                            <span className="text-[12px] font-normal text-on-surface-variant block mt-1">m</span>
                          </p>
                        </div>
                        <div className="w-px h-10 bg-white/10" />
                        <div className="text-center">
                          <p className="text-[32px] font-extrabold text-secondary leading-none">
                            {c.durationMin}
                            <span className="text-[12px] font-normal text-on-surface-variant block mt-1">min</span>
                          </p>
                        </div>
                        <div className="w-px h-10 bg-white/10" />
                        <div className="text-center">
                          <p className="text-[32px] font-extrabold text-tertiary leading-none">
                            {calcPace(c.durationMin, c.distanceKm)}
                            <span className="text-[12px] font-normal text-on-surface-variant block mt-1">pace</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
          )}

          {/* ══════════════════════════ WALKING ══════════════════════════ */}
          {activeTab === "walking" && (
            walks.length === 0
              ? <EmptyState icon="directions_walk" msg="No walking sessions in the last 30 days." />
              : (
                <div className="space-y-3">
                  <SectionLabel icon="directions_walk" label="Walking Sessions" count={walks.length} color="text-secondary" />
                  {walks.map((c) => (
                    <div key={`walk-${c.date}`} className="glass-card rounded-[2rem] p-5 border border-white/5 border-l-4 border-l-secondary">
                      {/* label row */}
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[14px] font-semibold text-on-surface-variant">
                          🚶 Walk · {formatDate(c.date)}
                        </p>
                        <IconBtn onClick={() => setPending({ category: "cardio", id: c.date, cardioType: "walking", message: "Delete this walk session?" })} />
                      </div>
                      {/* stats — identical to cardio page */}
                      <div className="flex justify-center items-center py-2">
                        <div className="text-center">
                          <p className="text-[36px] font-black text-secondary leading-none">
                            {(c.steps ?? 0).toLocaleString()}
                          </p>
                          <p className="text-[13px] font-medium text-on-surface-variant mt-1">steps logged</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
          )}

          {/* ══════════════════════════ SLEEP ══════════════════════════ */}
          {activeTab === "sleep" && (
            sleeps.length === 0
              ? <EmptyState icon="bedtime" msg="No sleep entries in the last 30 days." />
              : sleeps.map((s) => {
                  const h = s.hours + s.minutes / 60;
                  const ok = h >= 7;
                  return (
                    <div key={s.date} className="glass-card rounded-[2rem] p-5 space-y-3 border border-white/5">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ok ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>
                            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>bedtime</span>
                          </div>
                          <div>
                            <p className="text-[17px] font-bold text-on-surface">{s.hours}h {s.minutes}m</p>
                            <p className="text-[12px] text-on-surface-variant">{formatDate(s.date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${ok ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>
                            {ok ? "Goal ✓" : "< 7h"}
                          </span>
                          <IconBtn onClick={() => setPending({ category: "sleep", id: s.date, message: "Delete this sleep entry?" })} />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pt-1 border-t border-white/5">
                        {qualityStars(s.quality)}
                        {s.bedtime && <span className="text-[12px] text-on-surface-variant ml-auto">{s.bedtime} → {s.wakeTime}</span>}
                      </div>
                    </div>
                  );
                })
          )}

          {/* ══════════════════════════ HYDRATION ══════════════════════════ */}
          {activeTab === "hydration" && (
            hydrations.length === 0
              ? <EmptyState icon="water_drop" msg="No hydration entries in the last 30 days." />
              : hydrations.map((h) => {
                  const pct = Math.min(h.ml / h.goalMl, 1);
                  const ok  = h.ml >= h.goalMl;
                  return (
                    <div key={h.date} className="glass-card rounded-[2rem] p-5 space-y-3 border border-white/5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ok ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
                            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
                          </div>
                          <div>
                            <p className="text-[17px] font-bold text-on-surface">{(h.ml / 1000).toFixed(2)} L</p>
                            <p className="text-[12px] text-on-surface-variant">{formatDate(h.date)} · Goal {(h.goalMl / 1000).toFixed(1)} L</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${ok ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
                            {Math.round(pct * 100)}%{ok ? " ✓" : ""}
                          </span>
                          <IconBtn onClick={() => setPending({ category: "hydration", id: h.date, message: "Delete this hydration entry?" })} />
                        </div>
                      </div>
                      <div className="h-2 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${ok ? "bg-gradient-to-r from-inverse-primary to-primary" : "bg-primary/40"}`}
                          style={{ width: `${pct * 100}%` }} />
                      </div>
                    </div>
                  );
                })
          )}

          {/* ══════════════════════════ SPENDING ══════════════════════════ */}
          {activeTab === "spending" && (
            spendings.length === 0
              ? <EmptyState icon="payments" msg="No spending entries yet." />
              : spendings.map((sp) => (
                  <div key={sp.id} className="glass-card rounded-[2rem] p-5 border border-white/5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary flex-shrink-0">
                          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {SPENDING_ICONS[sp.category] ?? "payments"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[16px] font-bold text-on-surface capitalize">{sp.category}</p>
                          <p className="text-[12px] text-on-surface-variant truncate">
                            {formatDate(sp.date)}{sp.note ? ` · ${sp.note}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <span className="text-[18px] font-bold text-tertiary">₹{sp.amount.toFixed(2)}</span>
                        <IconBtn onClick={() => setPending({ category: "spending", id: sp.id!, message: "Delete this expense?" })} />
                      </div>
                    </div>
                  </div>
                ))
          )}

        </section>
      )}

      {/* Confirm modal */}
      {pending && (
        <ConfirmModal
          message={pending.message}
          onConfirm={confirmDelete}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
