import type { Appointment, Barber, Salon, Service } from "@/types/database";

/**
 * Temel Süre × Hız Çarpanı = Final İşlem Süresi (en yakın 5 dakikaya yuvarlanır).
 * Örn: 30dk temel süre, 1.5 çarpan (çırak) -> 45dk. 0.8 çarpan (usta) -> 24dk.
 */
export function calculateFinalDuration(
  baseDurationMinutes: number,
  speedMultiplier: number,
  roundToMinutes = 5
): number {
  const raw = baseDurationMinutes * speedMultiplier;
  return Math.max(roundToMinutes, Math.round(raw / roundToMinutes) * roundToMinutes);
}

export interface TimeSlot {
  start: Date;
  end: Date; // hizmet süresi dahil (buffer hariç)
  isAvailable: boolean;
}

interface GenerateSlotsParams {
  date: Date; // gün (saat kısmı önemsiz)
  salon: Salon;
  barber: Barber;
  services: Service[]; // birden fazla hizmet art arda, aralarında bekleme olmadan yapılır
  existingAppointments: Appointment[]; // o berberin o günkü randevuları (pending + confirmed)
  slotIntervalMinutes?: number; // slot listesi kaç dakikalık adımlarla taranacak
  barberWorkingHours?: { start: string; end: string } | null; // salon saatlerini override eder
}

function parseTimeOnDate(date: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(h, m, 0, 0);
  return result;
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Belirli bir gün için berber + hizmet kombinasyonuna ait müsait/dolu slotları üretir.
 * Her slot, hizmet süresi + tampon süresi (buffer) hesaba katılarak mevcut randevularla
 * çakışıp çakışmadığına göre işaretlenir.
 */
export function generateDailySlots(params: GenerateSlotsParams): TimeSlot[] {
  const {
    date,
    salon,
    barber,
    services,
    existingAppointments,
    slotIntervalMinutes = 15,
    barberWorkingHours,
  } = params;

  if (services.length === 0) return [];

  const dayOfWeek = date.getDay();
  if (!salon.working_days?.includes(dayOfWeek)) {
    return [];
  }

  const workStart = parseTimeOnDate(date, barberWorkingHours?.start ?? salon.start_time);
  const workEnd = parseTimeOnDate(date, barberWorkingHours?.end ?? salon.end_time);

  // Hizmetler art arda tek blokta yapılır: toplam temel süre × hız çarpanı.
  const totalBaseDuration = services.reduce((sum, s) => sum + s.base_duration_minutes, 0);
  const finalDuration = calculateFinalDuration(totalBaseDuration, barber.speed_multiplier);
  const bufferMs = salon.buffer_time_minutes * 60_000;
  const durationMs = finalDuration * 60_000;

  const busyRanges = existingAppointments
    .filter((a) => a.status === "pending" || a.status === "confirmed")
    .map((a) => ({
      start: new Date(a.start_time),
      // Sonraki randevuyla aramıza buffer girsin diye bitişe buffer ekliyoruz.
      end: new Date(new Date(a.end_time).getTime() + bufferMs),
    }));

  const slots: TimeSlot[] = [];
  const stepMs = slotIntervalMinutes * 60_000;

  for (
    let slotStart = new Date(workStart);
    slotStart.getTime() + durationMs <= workEnd.getTime();
    slotStart = new Date(slotStart.getTime() + stepMs)
  ) {
    const slotEnd = new Date(slotStart.getTime() + durationMs);
    // Buffer'ı bu slotun kendisinden önce de hesaba kat: önceki randevunun
    // buffer'ı bittiği an bu slot başlayabilir (busyRanges.end zaten buffer dahil).
    const isAvailable = !busyRanges.some((busy) =>
      rangesOverlap(slotStart, slotEnd, busy.start, busy.end)
    );

    slots.push({ start: slotStart, end: slotEnd, isAvailable });
  }

  return slots;
}
