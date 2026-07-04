import { create } from "zustand";
import type { SalonRow } from "@/lib/types/database";

interface SalonStore {
  activeSalon: SalonRow | null;
  setActiveSalon: (salon: SalonRow | null) => void;
}

export const useSalonStore = create<SalonStore>((set) => ({
  activeSalon: null,
  setActiveSalon: (salon) => set({ activeSalon: salon }),
}));
