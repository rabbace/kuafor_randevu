import { create } from "zustand";
import type { Barber, Salon, Service } from "@/types/database";

interface BookingStore {
  selectedSalon: Salon | null;
  selectedService: Service | null;
  selectedBarber: Barber | null;
  selectedSlotStart: Date | null;
  setSalon: (salon: Salon | null) => void;
  setService: (service: Service | null) => void;
  setBarber: (barber: Barber | null) => void;
  setSlotStart: (date: Date | null) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingStore>((set) => ({
  selectedSalon: null,
  selectedService: null,
  selectedBarber: null,
  selectedSlotStart: null,
  setSalon: (selectedSalon) => set({ selectedSalon }),
  setService: (selectedService) => set({ selectedService }),
  setBarber: (selectedBarber) => set({ selectedBarber }),
  setSlotStart: (selectedSlotStart) => set({ selectedSlotStart }),
  reset: () =>
    set({ selectedSalon: null, selectedService: null, selectedBarber: null, selectedSlotStart: null }),
}));
