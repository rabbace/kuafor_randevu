"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  async function signInWith(provider: "google" | "apple") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard/appointments` },
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-black/10 dark:border-white/10 p-6">
        <h1 className="text-xl font-bold text-center">Salon Yönetim Paneli</h1>
        <button
          onClick={() => signInWith("google")}
          className="w-full rounded-lg border py-2 text-sm font-medium"
        >
          Google ile Giriş Yap
        </button>
        <button
          onClick={() => signInWith("apple")}
          className="w-full rounded-lg border py-2 text-sm font-medium"
        >
          Apple ile Giriş Yap
        </button>
      </div>
    </main>
  );
}
