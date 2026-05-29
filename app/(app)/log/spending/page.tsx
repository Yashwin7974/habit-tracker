"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { addSpending, getTodaySpending, getWeeklySpending, SpendingEntry } from "@/lib/firestore";

const CATEGORIES = [
  { id: "food", label: "Food", icon: "restaurant" },
  { id: "transport", label: "Transport", icon: "commute" },
  { id: "fun", label: "Fun", icon: "celebration" },
  { id: "other", label: "Other", icon: "more_horiz" },
];

export default function SpendingPage() {
  const { user } = useAuth();
  const [category, setCategory] = useState("food");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [entries, setEntries] = useState<SpendingEntry[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<SpendingEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [data, weekly] = await Promise.all([
      getTodaySpending(user.uid),
      getWeeklySpending(user.uid),
    ]);
    setEntries(data);
    setWeeklyEntries(weekly);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const totalToday = entries.reduce((sum, e) => sum + e.amount, 0);
  const totalWeekly = weeklyEntries.reduce((sum, e) => sum + e.amount, 0);

  // Category breakdown for the week
  const categoryTotals = CATEGORIES.map((cat) => ({
    ...cat,
    total: weeklyEntries.filter((e) => e.category === cat.id).reduce((s, e) => s + e.amount, 0),
  }));
  const maxCatTotal = Math.max(...categoryTotals.map((c) => c.total), 1);
  const topCategory = categoryTotals.sort((a, b) => b.total - a.total)[0];
  const spendingInsightMsg =
    totalWeekly === 0 ? "💡 No spending logged this week!" :
    totalWeekly < 500 ? "🌟 Great spending discipline this week!" :
    totalWeekly < 1500 ? "👍 Moderate spending — keep tracking!" :
    "⚠️ High spend week — review your budget!";


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || saving) return;
    setSaving(true);
    try {
      await addSpending(user.uid, {
        amount: parseFloat(amount),
        category,
        note,
      });
      setSaved(true);
      setAmount("");
      setNote("");
      await load();
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-[1.25rem] max-w-lg mx-auto py-4 space-y-[2rem] relative">
      {/* Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] opacity-50 mix-blend-screen" />
        <div className="absolute bottom-[20%] right-[-10%] w-[30rem] h-[30rem] bg-secondary/10 rounded-full blur-[120px] opacity-40 mix-blend-screen" />
      </div>

      {/* Header */}
      <section className="pt-4 relative z-10">
        <h2 className="text-[24px] font-bold leading-8 text-on-background mb-1">Spending Tracker</h2>
        <p className="text-[16px] leading-6 text-on-surface-variant">Keep track of today&apos;s expenses.</p>
      </section>

      {/* Today's Total */}
      <section className="glass-card rounded-[2rem] p-6 flex items-center justify-between relative z-10">
        <div>
          <p className="text-[14px] font-semibold text-on-surface-variant mb-1">Total Today</p>
          <p className="text-[48px] font-extrabold leading-[56px] tracking-[-0.02em] text-on-surface">
            ₹{totalToday.toFixed(2)}
          </p>
        </div>
        <div className="w-16 h-16 rounded-full bg-tertiary-container/20 flex items-center justify-center text-tertiary">
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
        </div>
      </section>

      {/* Log Form */}
      <section className="glass-panel rounded-[2rem] p-6 flex flex-col gap-6 relative z-10">
        <div>
          <h3 className="text-[20px] font-semibold text-on-surface">Log Spending</h3>
          <p className="text-[14px] font-semibold text-outline">Quick entry</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Categories */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`category-btn flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-[14px] transition-all duration-300 whitespace-nowrap active:scale-95 border border-white/5 ${
                  category === cat.id ? "active" : "bg-surface-variant/50 text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[1.25rem]">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Amount Input */}
          <div className="flex items-center gap-4 recessed-well rounded-xl p-2 pr-4">
            <div className="bg-surface-variant/40 p-3 rounded-lg text-outline">
              <span className="material-symbols-outlined">currency_rupee</span>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full bg-transparent border-none focus:ring-0 text-right text-[32px] font-extrabold text-on-surface placeholder:text-outline-variant/50 p-0 focus:outline-none"
            />
          </div>

          {/* Note */}
          <div className="flex items-center gap-3 bg-surface-container-high/50 rounded-xl px-4 py-3 border border-white/5">
            <span className="material-symbols-outlined text-outline-variant">notes</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)"
              className="w-full bg-transparent border-none focus:ring-0 text-[16px] text-on-surface placeholder:text-outline-variant focus:outline-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !amount}
            className="w-full py-4 rounded-xl bg-secondary text-on-secondary text-[14px] font-semibold shadow-[0_10px_25px_rgba(78,222,163,0.3)] hover:brightness-110 active:scale-[0.98] transition-all duration-300 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
            {saved ? "Added! ✓" : saving ? "Adding…" : "Add Expense"}
          </button>
        </form>
      </section>

      {/* Recent Entries */}
      {entries.length > 0 && (
        <section className="glass-card rounded-[2rem] p-6 relative z-10">
          <h3 className="text-[20px] font-semibold text-on-surface mb-4">Today&apos;s Entries</h3>
          <div className="flex flex-col gap-3">
            {entries.map((entry) => {
              const cat = CATEGORIES.find((c) => c.id === entry.category);
              return (
                <div key={entry.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {cat?.icon ?? "payments"}
                      </span>
                    </div>
                    <div>
                      <p className="text-[16px] font-semibold text-on-surface capitalize">{entry.category}</p>
                      {entry.note && <p className="text-[12px] font-medium text-on-surface-variant">{entry.note}</p>}
                    </div>
                  </div>
                  <span className="text-[20px] font-semibold text-tertiary">₹{entry.amount.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Insights Section */}
      <section className="glass-card rounded-[2rem] p-6 space-y-4 relative z-10">
        <h3 className="text-[20px] font-semibold text-on-surface">Weekly Insights</h3>
        <p className="text-[14px] font-medium text-secondary bg-secondary/10 border border-secondary/20 px-4 py-2 rounded-full text-center">{spendingInsightMsg}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-high/60 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
            <span className="text-[22px] font-extrabold text-on-surface">₹{totalToday.toFixed(0)}</span>
            <span className="text-[10px] font-medium text-on-surface-variant text-center">Today</span>
          </div>
          <div className="bg-surface-container-high/60 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="material-symbols-outlined text-tertiary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
            <span className="text-[22px] font-extrabold text-on-surface">₹{totalWeekly.toFixed(0)}</span>
            <span className="text-[10px] font-medium text-on-surface-variant text-center">This Week</span>
          </div>
        </div>
        {totalWeekly > 0 && (
          <div className="space-y-2">
            <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider">Category Breakdown</p>
            {categoryTotals.map((cat) => (
              cat.total > 0 && (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-tertiary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-[12px] font-medium text-on-surface capitalize">{cat.label}</span>
                      <span className="text-[12px] font-semibold text-tertiary">₹{cat.total.toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-tertiary to-secondary rounded-full transition-all duration-700"
                        style={{ width: `${(cat.total / maxCatTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
