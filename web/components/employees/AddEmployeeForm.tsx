"use client";

import { useState, useTransition } from "react";
import { addBarberToSalon } from "@/app/actions/appointments";

export function AddEmployeeForm({ salonId }: { salonId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await addBarberToSalon({
        salonId,
        userId: String(formData.get("userId")),
        title: String(formData.get("title") || "Berber"),
        speedMultiplier: Number(formData.get("speedMultiplier") || 1),
        autoApprove: formData.get("autoApprove") === "on",
      });

      setMessage({
        type: result.success ? "success" : "error",
        text: result.message,
      });
    });
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-4 rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white dark:bg-neutral-900 max-w-md"
    >
      <h2 className="text-lg font-semibold">Yeni Çalışan Ekle</h2>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="userId">
          Kullanıcı ID (önceden kayıtlı hesap)
        </label>
        <input
          id="userId"
          name="userId"
          required
          placeholder="uuid"
          className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="title">
          Unvan
        </label>
        <input
          id="title"
          name="title"
          placeholder="Usta Berber, Çırak..."
          className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="speedMultiplier">
          Hız Çarpanı (0.5 hızlı – 2.0 yavaş)
        </label>
        <input
          id="speedMultiplier"
          name="speedMultiplier"
          type="number"
          step="0.05"
          min="0.5"
          max="2"
          defaultValue={1}
          className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
        />
        <p className="text-xs text-neutral-500">
          Örn: 0.8 = usta (hızlı), 1.5 = çırak (yavaş). Final süre = Temel Süre × Çarpan.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="autoApprove" className="rounded" />
        Randevuları otomatik onayla
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary text-white py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? "Ekleniyor..." : "Çalışanı Ekle"}
      </button>

      {message && (
        <p className={message.type === "success" ? "text-sm text-green-600" : "text-sm text-red-500"}>
          {message.text}
        </p>
      )}
    </form>
  );
}
