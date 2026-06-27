"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { updateAppointmentStatus } from "@/app/actions/appointments";
import { Button } from "@/components/ui/Button";
import { Card, Badge } from "@/components/ui/Card";
import type { AppointmentWithRelations } from "@/lib/types/database";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Onay Bekliyor", color: "bg-amber-50 text-amber-700" },
  confirmed: { label: "Onaylandı", color: "bg-green-50 text-green-700" },
  rejected: { label: "Reddedildi", color: "bg-red-50 text-red-700" },
  cancelled: { label: "İptal Edildi", color: "bg-neutral-100 text-neutral-600" },
  completed: { label: "Tamamlandı", color: "bg-blue-50 text-blue-700" },
  no_show: { label: "Gelmedi", color: "bg-red-50 text-red-700" },
};

function initialsOf(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

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
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700">
            {initialsOf(appointment.customer.full_name)}
          </div>
          <div>
            <p className="font-medium text-neutral-900">{appointment.customer.full_name ?? "Müşteri"}</p>
            <p className="text-sm text-neutral-500">{appointment.service.name}</p>
          </div>
        </div>
        <Badge className={status.color}>{status.label}</Badge>
      </div>

      <div className="flex flex-col gap-1.5 rounded-lg bg-neutral-50 px-3 py-2.5 text-sm text-neutral-600">
        <div className="flex items-center justify-between">
          <span>Tarih / Saat</span>
          <span className="font-medium text-neutral-900">
            {start.toLocaleDateString("tr-TR")} ·{" "}
            {start.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}–
            {end.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Çalışan</span>
          <span className="font-medium text-neutral-900">
            {appointment.barber.user.full_name ?? appointment.barber.title}
          </span>
        </div>
      </div>

      {appointment.status === "pending" && (
        <div className="flex gap-2">
          <Button className="flex-1" disabled={isPending} onClick={() => handleDecision("confirmed")}>
            Onayla
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={isPending}
            onClick={() => handleDecision("rejected")}
          >
            Reddet
          </Button>
        </div>
      )}

      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
    </Card>
  );
}
