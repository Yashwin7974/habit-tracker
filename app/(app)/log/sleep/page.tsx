"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { logSleep, getSleepHistory, SleepData } from "@/lib/firestore";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function SleepPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<SleepData[]>([]);
  
  // Bedtime (12h format)
  const [bedHour, setBedHour] = useState(10);
  const [bedMin, setBedMin] = useState(30);
  const [bedAmPm, setBedAmPm] = useState("PM");

  // Wake Time (12h format)
  const [wakeHour, setWakeHour] = useState(7);
  const [wakeMin, setWakeMin] = useState(0);
  const [wakeAmPm, setWakeAmPm] = useState("AM");

  const [quality, setQuality] = useState(4);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const calculateSleepDuration = useCallback((
    bh: number, bm: number, bAmPm: string,
    wh: number, wm: number, wAmPm: string
  ) => {
    // Convert bedtime to 24h
    let bHour24 = bh;
    if (bAmPm === "PM" && bHour24 !== 12) bHour24 += 12;
    if (bAmPm === "AM" && bHour24 === 12) bHour24 = 0;

    // Convert wake time to 24h
    let wHour24 = wh;
    if (wAmPm === "PM" && wHour24 !== 12) wHour24 += 12;
    if (wAmPm === "AM" && wHour24 === 12) wHour24 = 0;

    const t1 = bHour24 * 60 + bm;
    const t2 = wHour24 * 60 + wm;
    
    let diff = t2 - t1;
    if (diff < 0) {
      // crossed midnight
      diff += 24 * 60;
    }
    
    const hr = Math.floor(diff / 60);
    const min = diff % 60;
    return { hours: hr, minutes: min };
  }, []);

  const parseTime = useCallback((timeStr: string) => {
    if (!timeStr) return null;
    // try 12h: "10:30 PM"
    let match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (match) {
      return {
        hour: parseInt(match[1]),
        min: parseInt(match[2]),
        ampm: match[3].toUpperCase(),
      };
    }
    // try 24h: "22:30"
    match = timeStr.match(/^(\d+):(\d+)$/);
    if (match) {
      const h24 = parseInt(match[1]);
      const min = parseInt(match[2]);
      const ampm = h24 >= 12 ? "PM" : "AM";
      let hour = h24 % 12;
      if (hour === 0) hour = 12;
      return { hour, min, ampm };
    }
    return null;
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    const data = await getSleepHistory(user.uid, 7);
    setHistory(data);
    
    // Default to yesterday's values if they exist
    const lastDay = data[data.length - 1];
    if (lastDay && lastDay.bedtime && lastDay.wakeTime) {
      const parsedBed = parseTime(lastDay.bedtime);
      const parsedWake = parseTime(lastDay.wakeTime);
      if (parsedBed) {
        setBedHour(parsedBed.hour);
        setBedMin(parsedBed.min);
        setBedAmPm(parsedBed.ampm);
      }
      if (parsedWake) {
        setWakeHour(parsedWake.hour);
        setWakeMin(parsedWake.min);
        setWakeAmPm(parsedWake.ampm);
      }
      setQuality(lastDay.quality);
    }
  }, [user, parseTime]);

  useEffect(() => { load(); }, [load]);

  const todaySleep = history[history.length - 1];
  const { hours, minutes } = calculateSleepDuration(
    bedHour, bedMin, bedAmPm,
    wakeHour, wakeMin, wakeAmPm
  );
  const totalMinutes = hours * 60 + minutes;
  const goalMinutes = 480; // 8 hours
  const percent = Math.min(totalMinutes / goalMinutes, 1);

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    
    const formattedBedtime = `${bedHour}:${String(bedMin).padStart(2, "0")} ${bedAmPm}`;
    const formattedWaketime = `${wakeHour}:${String(wakeMin).padStart(2, "0")} ${wakeAmPm}`;

    try {
      await logSleep(user.uid, {
        hours,
        minutes,
        quality,
        bedtime: formattedBedtime,
        wakeTime: formattedWaketime
      });
      setSaved(true);
      await load();
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Chart data: max sleep hours to normalize
  const maxHours = Math.max(...history.map((d) => d.hours + d.minutes / 60), 8);
  const chartPoints = history.map((d, i) => {
    const h = d.hours + d.minutes / 60;
    const x = (i / 6) * 100;
    const y = 100 - (h / maxHours) * 90;
    return { x, y, h, date: d.date };
  });
  const pathD = chartPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = `${pathD} L100,100 L0,100 Z`;

  // Sleep insights
  const activeSleepDays = history.filter((d) => d.hours > 0 || d.minutes > 0);
  const avgSleepHours = activeSleepDays.length > 0
    ? activeSleepDays.reduce((s, d) => s + d.hours + d.minutes / 60, 0) / activeSleepDays.length
    : 0;
  const avgQuality = activeSleepDays.length > 0
    ? activeSleepDays.reduce((s, d) => s + d.quality, 0) / activeSleepDays.length
    : 0;
  const goodNights = history.filter((d) => (d.hours + d.minutes / 60) >= 7).length;
  const sleepInsightMsg =
    goodNights >= 6 ? "🌙 Excellent sleep week! Full recovery mode!" :
    goodNights >= 4 ? "😴 Great sleep consistency this week!" :
    goodNights >= 2 ? "💤 Some good nights — aim for 7h+ daily!" :
    goodNights === 1 ? "⚠️ Only one solid night — prioritize sleep!" :
    "💡 Log your sleep to track patterns!";


  return (
    <div className="px-[1.25rem] max-w-lg mx-auto py-4 space-y-[2rem] relative overflow-x-hidden">
      <div className="ambient-glow" />
      <div className="ambient-glow-2" />

      {/* Header */}
      <section className="pt-4">
        <h2 className="text-[24px] font-bold leading-8 text-on-background mb-1">Sleep Analysis</h2>
        <p className="text-[16px] leading-6 text-on-surface-variant">Your night mode insights for better recovery.</p>
      </section>

      {/* Sleep Goal Ring */}
      <section className="glass-card rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-surface-container-high/50 to-transparent pointer-events-none z-0" />
        <div className="z-10 flex flex-col gap-2 text-center md:text-left">
          <h3 className="text-[20px] font-semibold text-on-surface">Daily Sleep Goal</h3>
          <p className="text-[16px] leading-6 text-on-surface-variant">Target: 8h 00m</p>
          <div className="flex items-baseline justify-center md:justify-start gap-1 mt-2">
            <span className="text-[48px] font-extrabold leading-[56px] tracking-[-0.02em] text-primary">
              {todaySleep?.hours ?? hours}
            </span>
            <span className="text-[20px] font-semibold text-primary-fixed-dim">h</span>
            <span className="text-[48px] font-extrabold leading-[56px] tracking-[-0.02em] text-primary ml-2">
              {todaySleep?.minutes ?? minutes}
            </span>
            <span className="text-[20px] font-semibold text-primary-fixed-dim">m</span>
          </div>
        </div>
        <div className="relative w-40 h-40 flex items-center justify-center z-10">
          <svg className="w-full h-full progress-ring" viewBox="0 0 100 100">
            <circle cx="50" cy="50" fill="transparent" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle
              className="progress-ring__circle"
              cx="50" cy="50" fill="transparent" r="40"
              stroke="url(#sleep-gradient)"
              strokeDasharray="251.2"
              strokeDashoffset={251.2 * (1 - percent)}
              strokeLinecap="round"
              strokeWidth="8"
            />
            <defs>
              <linearGradient id="sleep-gradient" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#adc6ff" />
                <stop offset="100%" stopColor="#4edea3" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              bedtime
            </span>
          </div>
        </div>
      </section>

      {/* Stats Bento */}
      <section className="grid grid-cols-2 gap-4">
        <div className="glass-card rounded-[2rem] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <span className="text-[14px] font-semibold text-on-surface-variant">Quality</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[24px] font-bold text-on-surface">{todaySleep?.quality?.toFixed(1) ?? "—"}</span>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  className={`material-symbols-outlined text-sm ${s <= (todaySleep?.quality ?? 0) ? "text-tertiary" : "text-outline"}`}
                  style={{ fontVariationSettings: s <= (todaySleep?.quality ?? 0) ? "'FILL' 1" : "'FILL' 0" }}
                >
                  star
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="glass-card rounded-[2rem] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-secondary">waves</span>
            <span className="text-[14px] font-semibold text-on-surface-variant">Deep Sleep</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[24px] font-bold text-on-surface">
              {todaySleep ? Math.round((todaySleep.hours + todaySleep.minutes / 60) * 0.25) : "—"}
            </span>
            <span className="text-[16px] leading-6 text-on-surface-variant">h est.</span>
          </div>
        </div>
      </section>

      {/* 7-Day Chart */}
      <section className="glass-card rounded-[2rem] p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-[20px] font-semibold text-on-surface">7-Day Trend</h3>
          <span className="text-[12px] font-medium text-secondary bg-secondary-container/20 px-2 py-1 rounded-full">
            Weekly View
          </span>
        </div>
        <div className="h-48 w-full relative mt-2 border-b border-outline-variant/30 flex items-end justify-between px-2 pb-2">
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d={areaD} fill="url(#sleep-area-gradient)" opacity="0.3" />
            <path className="chart-path" d={pathD} fill="none" stroke="#adc6ff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
            <defs>
              <linearGradient id="sleep-area-gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#adc6ff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#adc6ff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          {chartPoints.map((p, i) => p.h > 0 && (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary ring-2 ring-background shadow-[0_0_8px_#adc6ff]"
              style={{ bottom: `${100 - p.y}%`, left: `${p.x}%`, transform: "translate(-50%, 50%)" }}
            />
          ))}
        </div>
        <div className="flex justify-between items-center text-outline-variant text-[12px] font-medium px-2">
          {DAY_LABELS.map((d, i) => (
            <span key={i} className={i === 6 ? "text-primary font-bold" : ""}>{d}</span>
          ))}
        </div>
      </section>

      {/* Insights Section */}
      <section className="glass-card rounded-[2rem] p-6 space-y-4">
        <h3 className="text-[20px] font-semibold text-on-surface">Sleep Insights</h3>
        <p className="text-[14px] font-medium text-secondary bg-secondary/10 border border-secondary/20 px-4 py-2 rounded-full text-center">{sleepInsightMsg}</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-container-high/60 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>bedtime</span>
            <span className="text-[22px] font-extrabold text-on-surface">{avgSleepHours.toFixed(1)}h</span>
            <span className="text-[10px] font-medium text-on-surface-variant text-center">Avg Sleep</span>
          </div>
          <div className="bg-surface-container-high/60 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="material-symbols-outlined text-tertiary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <span className="text-[22px] font-extrabold text-on-surface">{avgQuality.toFixed(1)}</span>
            <span className="text-[10px] font-medium text-on-surface-variant text-center">Avg Quality</span>
          </div>
          <div className="bg-surface-container-high/60 rounded-2xl p-4 flex flex-col items-center gap-1">
            <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>nights_stay</span>
            <span className="text-[22px] font-extrabold text-on-surface">{goodNights}/7</span>
            <span className="text-[10px] font-medium text-on-surface-variant text-center">7h+ Nights</span>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3 bg-surface-container-high/50 rounded-xl border border-white/5">
          <span className="text-[14px] font-semibold text-on-surface-variant">Sleep Goal (nightly)</span>
          <span className="text-[16px] font-bold text-primary">8h 00m</span>
        </div>
      </section>

      {/* Log Sleep Form */}
      <section className="glass-card rounded-[2rem] p-6 flex flex-col gap-6">
        <h3 className="text-[20px] font-semibold text-on-surface">Log Last Night</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bedtime Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-on-surface-variant">Bedtime</label>
            <div className="flex gap-2 items-center bg-surface-container-lowest rounded-xl p-2 border border-white/5 neomorphic-inner">
              <select
                value={bedHour}
                onChange={(e) => setBedHour(Number(e.target.value))}
                className="flex-1 bg-transparent text-center text-[20px] font-bold text-on-surface focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h} className="bg-slate-900 text-on-surface">
                    {h}
                  </option>
                ))}
              </select>
              <span className="text-on-surface-variant font-bold text-[20px]">:</span>
              <select
                value={bedMin}
                onChange={(e) => setBedMin(Number(e.target.value))}
                className="flex-1 bg-transparent text-center text-[20px] font-bold text-on-surface focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-on-surface">
                    {String(m).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <div className="flex bg-surface-container-high rounded-lg p-0.5 border border-white/5 flex-shrink-0">
                {["AM", "PM"].map((t) => {
                  const active = bedAmPm === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBedAmPm(t)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                        active
                          ? "bg-primary text-on-primary shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Wake Time Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-on-surface-variant">Wake Time</label>
            <div className="flex gap-2 items-center bg-surface-container-lowest rounded-xl p-2 border border-white/5 neomorphic-inner">
              <select
                value={wakeHour}
                onChange={(e) => setWakeHour(Number(e.target.value))}
                className="flex-1 bg-transparent text-center text-[20px] font-bold text-on-surface focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h} className="bg-slate-900 text-on-surface">
                    {h}
                  </option>
                ))}
              </select>
              <span className="text-on-surface-variant font-bold text-[20px]">:</span>
              <select
                value={wakeMin}
                onChange={(e) => setWakeMin(Number(e.target.value))}
                className="flex-1 bg-transparent text-center text-[20px] font-bold text-on-surface focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-on-surface">
                    {String(m).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <div className="flex bg-surface-container-high rounded-lg p-0.5 border border-white/5 flex-shrink-0">
                {["AM", "PM"].map((t) => {
                  const active = wakeAmPm === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setWakeAmPm(t)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                        active
                          ? "bg-primary text-on-primary shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Calculated Sleep Time Preview */}
        <div className="flex items-center justify-between px-4 py-3 bg-surface-container-high/50 rounded-xl border border-white/5">
          <span className="text-[14px] font-semibold text-on-surface-variant">Calculated Duration</span>
          <span className="text-[20px] font-bold text-primary">
            {hours}h {minutes}m
          </span>
        </div>

        {/* Quality Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-semibold text-on-surface-variant">Quality (1-5)</label>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setQuality(s)}
                className={`w-12 h-12 rounded-full text-[20px] transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center ${
                  s <= quality
                    ? "bg-tertiary-container/30 border border-tertiary text-tertiary"
                    : "bg-surface-container-high border border-white/10 text-outline-variant"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: s <= quality ? "'FILL' 1" : "'FILL' 0" }}>
                  star
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Log button */}
        <button
          onClick={handleSave}
          disabled={saving || (hours === 0 && minutes === 0)}
          className="w-full py-4 rounded-full bg-primary text-on-primary text-[16px] font-semibold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(173,198,255,0.2)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 disabled:opacity-50 cursor-pointer"
        >
          <span className="material-symbols-outlined">check_circle</span>
          {saved ? "Saved! ✓" : saving ? "Saving…" : "Log Sleep"}
        </button>
      </section>
    </div>
  );
}
