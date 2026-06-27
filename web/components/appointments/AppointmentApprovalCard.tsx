"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { updateAppointmentStatus } from "@/app/actions/appointments";
import type { AppointmentWithRelations } from "@/lib/types/database";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Onay Bekliyor", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Onaylandı", color: "bg-green-100 text-green-800" },
  rejected: { label: "Reddedildi", color: "bg-red-100 text-red-800" },
  cancelled: { label: "İptal Edildi", color: "bg-gray-100 text-gray-800" },
  completed: { label: "Tamamlandı", color: "bg-blue-100 text-blue-800" },
  no_show: { label: "Gelmedi", color: "bg-red-100 text-red-800" },
};

export function AppointmentApprovalCard({
  appointment,
}: {
  appointment: AppointmentWithRelations;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const status = STATUS_LABELS[appointment.status];
  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);

  function handleDecision(decision: "confirmed" | "rejected") {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updateAppointmentStatus(appointment.id, decision);
      if (!result.success) setErrorMessage(result.message);
    });
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 p-4 flex flex-col gap-3 bg-white dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{appointment.customer.full_name ?? "Müşteri"}</p>
          <p className="text-sm text-neutral-500">{appointment.service.name}</p>
        </div>
        <span className={clsx("text-xs px-2 py-1 rounded-full font-medium", status.color)}>
          {status.label}
        </span>
      </div>

      <div className="text-sm text-neutral-600 dark:text-neutral-300">
        <p>
          {start.toLocaleDateString("tr-TR")} ·{" "}
          {start.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}–
          {end.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p>Çalışan: {appointment.barber.user.full_name ?? appointment.barber.title}</p>
      </div>

      {appointment.status === "pending" && (
        <div className="flex gap-2 pt-1">
          <button
            disabled={isPending}
            onClick={() => handleDecision("confirmed")}
            className="flex-1 rounded-lg bg-primary text-white py-2 text-sm font-medium disabled:opacity-50"
          >
            Onayla
          </button>
          <button
            disabled={isPending}
            onClick={() => handleDecision("rejected")}
            className="flex-1 rounded-lg border border-red-500 text-red-500 py-2 text-sm font-medium disabled:opacity-50"
          >
            Reddet
          </button>
        </div>
      )}

      {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
    </div>
  );
}
