"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, name);
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create account";
      setError(msg.replace("Firebase: ", "").replace(/\(.*\)/, "").trim());
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background flex items-center justify-center p-[1.25rem] bg-kinetic-gradient relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

      <main className="w-full max-w-md flex flex-col gap-[2rem] relative z-10 fade-in-up">
        <header className="text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-[0_0_30px_rgba(77,142,255,0.3)]">
            <span className="material-symbols-outlined text-surface-container-lowest text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              bolt
            </span>
          </div>
          <h1 className="text-[48px] font-extrabold leading-[56px] tracking-[-0.02em] text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-secondary italic pr-2">
            Pulse
          </h1>
          <p className="text-[16px] leading-6 text-on-surface-variant">Create your account to get started.</p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-container/40 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl flex flex-col gap-[1rem]"
        >
          {error && (
            <div className="bg-error-container/30 border border-error/30 rounded-xl px-4 py-3 text-error text-[14px]">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold leading-5 text-on-surface-variant ml-2" htmlFor="name">Name</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors">person</span>
              <input
                id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Your name" required
                className="w-full bg-surface-container-lowest/50 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-[16px] text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold leading-5 text-on-surface-variant ml-2" htmlFor="email">Email</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors">mail</span>
              <input
                id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com" required
                className="w-full bg-surface-container-lowest/50 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-[16px] text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold leading-5 text-on-surface-variant ml-2" htmlFor="password">Password</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors">lock</span>
              <input
                id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters" required
                className="w-full bg-surface-container-lowest/50 border border-white/5 rounded-xl py-4 pl-12 pr-12 text-[16px] text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 transition-all shadow-inner"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">{showPassword ? "visibility" : "visibility_off"}</span>
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="mt-4 w-full bg-secondary text-on-secondary text-[20px] font-semibold leading-7 py-4 rounded-xl shadow-[0_10px_25px_rgba(78,222,163,0.4)] hover:shadow-[0_15px_35px_rgba(78,222,163,0.6)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 relative overflow-hidden group disabled:opacity-60"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center justify-center gap-2">
              {loading ? "Creating…" : "Create Account"}
              {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
            </span>
          </button>

          <div className="flex items-center gap-4 my-2">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[12px] font-medium text-outline">or continue with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button
            type="button" onClick={handleGoogle}
            className="w-full bg-surface-container-high hover:bg-surface-bright border border-white/5 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-[14px] font-semibold text-on-surface">Continue with Google</span>
          </button>
        </form>

        <div className="text-center">
          <p className="text-[16px] text-on-surface-variant">
            Already have an account?{" "}
            <Link href="/login" className="text-primary text-[20px] font-semibold hover:opacity-80 transition-opacity ml-1">
              Sign In
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
