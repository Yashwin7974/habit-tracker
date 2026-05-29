"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function TopAppBar() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "P";

  return (
    <header className="fixed top-0 w-full z-50 bg-background/70 backdrop-blur-xl shadow-sm border-b border-white/10 transition-all duration-300 ease-in-out flex justify-between items-center px-[1.25rem] py-[1rem]">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 cursor-pointer hover:opacity-80 transition-opacity">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt="User Profile"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-surface-container-lowest font-bold text-sm">
            {initials}
          </div>
        )}
      </div>

      {/* Title */}
      <h1
        className="text-[24px] font-bold leading-8 tracking-tighter"
        style={{ color: "#adc6ff" }}
      >
        Pulse
      </h1>

      {/* Settings / Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-10 h-10 flex items-center justify-center rounded-full text-primary hover:opacity-80 transition-opacity"
        title="Sign Out"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
          logout
        </span>
      </button>
    </header>
  );
}
