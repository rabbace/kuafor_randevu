"use client";

import { useState, useTransition } from "react";
import { addBarberToSalon } from "@/app/actions/appointments";
import { Button } from "@/components/ui/Button";

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
      className="max-w-md space-y-5 rounded-xl border border-neutral-200 bg-white p-5 shadow-card"
    >
      <div>
        <h2 className="text-base font-semibold text-neutral-900">Yeni Çalışan Ekle</h2>
        <p className="text-sm text-neutral-500">Önceden kayıtlı bir kullanıcıyı salonuna çalışan olarak ata.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-700" htmlFor="userId">
          Kullanıcı ID
        </label>
        <input
          id="userId"
          name="userId"
          required
          placeholder="uuid"
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm placeholder:text-neutral-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-700" htmlFor="title">
          Unvan
        </label>
        <input
          id="title"
          name="title"
          placeholder="Usta Berber, Çırak..."
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm placeholder:text-neutral-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-700" htmlFor="speedMultiplier">
          Hız Çarpanı
        </label>
        <input
          id="speedMultiplier"
          name="speedMultiplier"
          type="number"
          step="0.05"
          min="0.5"
          max="2"
          defaultValue={1}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
        />
        <p className="text-xs text-neutral-400">
          0.8 = usta (hızlı), 1.5 = çırak (yavaş). Final süre = Temel Süre × Çarpan.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" name="autoApprove" className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600" />
        Randevuları otomatik onayla
      </label>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Ekleniyor..." : "Çalışanı Ekle"}
      </Button>

      {message && (
        <p className={message.type === "success" ? "text-sm text-green-600" : "text-sm text-red-600"}>
          {message.text}
        </p>
      )}
    </form>
  );
}
