"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", icon: "dashboard", label: "Home" },
  { href: "/log/workout", icon: "fitness_center", label: "Workout" },
  { href: "/log/hydration", icon: "water_drop", label: "Hydration" },
  { href: "/history", icon: "history", label: "History" },
];

export default function BottomNavBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/log") return pathname === "/log";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 w-full z-50 rounded-t-[1rem] bg-surface-container/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] flex justify-around items-center px-4 py-3">
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all duration-150 active:scale-95 ${
              active
                ? "bg-secondary-container text-on-secondary-container scale-105"
                : "text-outline hover:text-primary"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            <span className="text-[12px] font-medium leading-4 mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
