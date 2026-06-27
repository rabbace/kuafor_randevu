"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/lib/types/database";

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
) {
  const supabase = createClient();

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/appointments");
  return { success: true, message: "Randevu güncellendi." };
}

export async function addBarberToSalon(input: {
  salonId: string;
  userId: string;
  title: string;
  speedMultiplier: number;
  autoApprove: boolean;
}) {
  const supabase = createClient();

  const { error } = await supabase.from("barbers").insert({
    salon_id: input.salonId,
    user_id: input.userId,
    title: input.title,
    speed_multiplier: input.speedMultiplier,
    auto_approve_appointments: input.autoApprove,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/employees");
  return { success: true, message: "Çalışan eklendi." };
}
