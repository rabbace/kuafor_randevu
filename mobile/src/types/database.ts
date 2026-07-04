export type UserRole = "customer" | "salon_owner" | "barber";
export type GenderType = "male" | "female";
export type SalonTargetGender = "male" | "female" | "unisex";
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "completed"
  | "no_show";

export interface Salon {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  target_gender: SalonTargetGender;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  logo_url?: string | null;
  photo_url?: string | null;
  phone?: string | null;
  start_time: string; // "09:00:00"
  end_time: string; // "20:00:00"
  buffer_time_minutes: number;
  working_days: number[]; // 0=Pazar .. 6=Cumartesi
  theme_primary_color: string;
  theme_secondary_color: string;
  is_active?: boolean;
  loyalty_enabled?: boolean;
  loyalty_redeem_amount?: number;
  loyalty_reward_type?: "discount" | "custom";
  loyalty_reward_text?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Barber {
  id: string;
  salon_id: string;
  user_id: string;
  title: string | null;
  speed_multiplier: number;
  auto_approve_appointments: boolean;
  is_active?: boolean;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  whatsapp_phone: string | null;
  created_at?: string;
}

export interface Service {
  id: string;
  salon_id: string;
  name: string;
  base_duration_minutes: number;
  price: number;
}

export interface Appointment {
  id: string;
  customer_id: string | null;
  salon_id: string;
  barber_id: string;
  service_id: string;
  start_time: string; // ISO
  end_time: string; // ISO
  status: AppointmentStatus;
  is_manual_entry: boolean;
  manual_customer_name: string | null;
  manual_customer_phone: string | null;
  total_price?: number | null;
}
