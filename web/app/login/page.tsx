"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function LoginPage() {
  const supabase = createClient();

  async function signInWith(provider: "google" | "apple") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard/appointments` },
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-white px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo />
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Salon Yönetim Paneline Hoş Geldiniz</h1>
            <p className="mt-1 text-sm text-neutral-500">Randevularını ve çalışanlarını tek yerden yönet.</p>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          <Button
            variant="secondary"
            className="w-full gap-3"
            onClick={() => signInWith("google")}
          >
            <GoogleIcon />
            Google ile Giriş Yap
          </Button>
          <Button
            variant="secondary"
            className="w-full gap-3"
            onClick={() => signInWith("apple")}
          >
            <AppleIcon />
            Apple ile Giriş Yap
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Giriş yaparak Kullanım Şartları ve Gizlilik Politikası'nı kabul edersiniz.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.69-2.26 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.14A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.34-2.14V7.02H2.18A10.99 10.99 0 0 0 1 12c0 1.77.43 3.45 1.18 4.98z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.97 10.97 0 0 0 12 1 10.99 10.99 0 0 0 2.18 7.02l3.66 2.84c.87-2.6 3.3-4.48 6.16-4.48z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.36 1c.1 1.13-.34 2.23-1.04 3.02-.73.83-1.92 1.46-3.05 1.37-.13-1.1.39-2.26 1.08-2.99C14.1 1.55 15.3.97 16.36 1zm3.4 16.6c-.6 1.32-1.34 2.6-2.36 3.7-.85.93-1.92 2.06-3.32 2.07-1.22.02-1.62-.78-3.05-.78-1.43 0-1.87.76-3.04.8-1.32.05-2.32-1.04-3.18-1.98-1.86-2.06-3.3-5.83-1.66-9.36.83-1.78 2.39-2.91 4.07-2.93 1.27-.02 2.07.86 3.13.86 1.05 0 1.5-.86 3.13-.86.99.01 1.96.36 2.7.97-2.33 1.43-2.45 4.4-.42 5.92.4.3.85.53 1 .59z" />
    </svg>
  );
}
