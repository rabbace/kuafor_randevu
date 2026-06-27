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
export type WaitlistStatus = "waiting" | "notified" | "converted" | "expired";

export interface UserRow {
  id: string;
  auth_id: string;
  role: UserRole;
  gender: GenderType | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  loyalty_points: number;
  created_at: string;
  updated_at: string;
}

export interface SalonRow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  target_gender: SalonTargetGender;
  address: string | null;
  city: string | null;
  theme_primary_color: string;
  theme_secondary_color: string;
  start_time: string;
  end_time: string;
  buffer_time_minutes: number;
  working_days: number[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BarberRow {
  id: string;
  salon_id: string;
  user_id: string;
  title: string | null;
  speed_multiplier: number;
  auto_approve_appointments: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ServiceRow {
  id: string;
  salon_id: string;
  name: string;
  description: string | null;
  base_duration_minutes: number;
  price: number;
  target_gender: SalonTargetGender;
  is_active: boolean;
  created_at: string;
}

export interface AppointmentRow {
  id: string;
  customer_id: string;
  salon_id: string;
  barber_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithRelations extends AppointmentRow {
  customer: Pick<UserRow, "id" | "full_name" | "phone" | "avatar_url">;
  barber: Pick<BarberRow, "id" | "title"> & { user: Pick<UserRow, "full_name"> };
  service: Pick<ServiceRow, "id" | "name" | "base_duration_minutes" | "price">;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Partial<UserRow>;
        Update: Partial<UserRow>;
        Relationships: [];
      };
      salons: {
        Row: SalonRow;
        Insert: Partial<SalonRow>;
        Update: Partial<SalonRow>;
        Relationships: [];
      };
      barbers: {
        Row: BarberRow;
        Insert: Partial<BarberRow>;
        Update: Partial<BarberRow>;
        Relationships: [];
      };
      services: {
        Row: ServiceRow;
        Insert: Partial<ServiceRow>;
        Update: Partial<ServiceRow>;
        Relationships: [];
      };
      appointments: {
        Row: AppointmentRow;
        Insert: Partial<AppointmentRow>;
        Update: Partial<AppointmentRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
