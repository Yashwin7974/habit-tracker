"use client";

import Link from "next/link";

const tiles = [
  {
    href: "/log/cardio",
    icon: "directions_run",
    label: "Cardio",
    sublabel: "Track your runs",
    color: "primary",
    glowSide: "-right-4 -top-4",
    glowColor: "bg-primary/10",
    span: "",
  },
  {
    href: "/log/spending",
    icon: "payments",
    label: "Spending",
    sublabel: "Log expenses",
    color: "tertiary",
    glowSide: "-right-4 -bottom-4",
    glowColor: "bg-tertiary/10",
    span: "",
  },
  {
    href: "/log/sleep",
    icon: "bedtime",
    label: "Sleep",
    sublabel: "Night mode insights",
    color: "secondary",
    glowSide: "right-0 top-0",
    glowColor: "bg-secondary/10",
    span: "md:col-span-2",
  },
];

export default function LogHubPage() {
  return (
    <div className="px-[1.25rem] max-w-lg mx-auto w-full md:max-w-4xl md:px-8 py-4">
      <div className="mb-[2rem] pt-4">
        <h2 className="text-[48px] font-extrabold leading-[56px] tracking-[-0.02em] text-on-background mb-2">
          Daily Log
        </h2>
        <p className="text-[16px] leading-6 text-on-surface-variant">
          Track your momentum across key habits.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[1rem]">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className={`glass-card rounded-[2rem] p-[1rem] flex flex-col justify-between items-start text-left group hover:bg-white/5 transition-all duration-300 active:scale-[0.98] relative overflow-hidden h-48 md:h-64 ${tile.span}`}
          >
            <div className={`absolute ${tile.glowSide} w-24 h-24 ${tile.glowColor} rounded-full blur-2xl group-hover:opacity-150 transition-opacity`} />
            <div className={`bg-${tile.color}-container/20 p-3 rounded-full mb-4 text-${tile.color} relative z-10`}>
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {tile.icon}
              </span>
            </div>
            <div className="relative z-10 w-full">
              <h3 className="text-[20px] font-semibold leading-7 text-on-surface mb-1">{tile.label}</h3>
              <div className="flex justify-between items-end w-full border-t border-white/5 pt-4">
                <p className="text-[16px] leading-6 text-on-surface-variant">{tile.sublabel}</p>
                <span className="material-symbols-outlined text-on-surface-variant opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                  arrow_forward
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* FAB */}
      <div className="fixed bottom-[100px] right-[1.25rem] z-40">
        <button className="bg-gradient-to-tr from-primary to-inverse-primary text-on-primary w-14 h-14 rounded-full flex items-center justify-center glow-pab hover:scale-105 active:scale-95 transition-all duration-200">
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>
    </div>
  );
}
