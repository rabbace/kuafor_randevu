import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import type { GenderType, UserRole } from "@/types/database";

interface AppUser {
  id: string;
  fullName: string | null;
  role: UserRole;
  gender: GenderType | null;
  loyaltyPoints: number;
}

interface AuthStore {
  session: Session | null;
  user: AppUser | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  signOut: () => set({ session: null, user: null }),
}));
