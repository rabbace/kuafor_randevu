import { createClient } from "@/lib/supabase/server";
import { AddEmployeeForm } from "@/components/employees/AddEmployeeForm";
import type { BarberRow, UserRow } from "@/lib/types/database";

export default async function EmployeesPage() {
  const supabase = createClient();

  const { data: authData } = await supabase.auth.getUser();

  const { data: ownerSalon } = await supabase
    .from("salons")
    .select("id, name")
    .eq("owner_id", authData.user?.id ?? "")
    .maybeSingle();

  const { data: barbers } = await supabase
    .from("barbers")
    .select("id, title, speed_multiplier, auto_approve_appointments, user:users!barbers_user_id_fkey(full_name, phone)")
    .eq("salon_id", ownerSalon?.id ?? "");

  type BarberWithUser = BarberRow & { user: Pick<UserRow, "full_name" | "phone"> };
  const list = (barbers ?? []) as unknown as BarberWithUser[];

  return (
    <main className="p-6 space-y-8 max-w-3xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold">Çalışanlar</h1>
        <p className="text-sm text-neutral-500">{ownerSalon?.name}</p>
      </header>

      <section className="space-y-3">
        {list.map((barber) => (
          <div
            key={barber.id}
            className="rounded-xl border border-black/10 dark:border-white/10 p-4 flex items-center justify-between bg-white dark:bg-neutral-900"
          >
            <div>
              <p className="font-medium">{barber.user.full_name}</p>
              <p className="text-sm text-neutral-500">{barber.title}</p>
            </div>
            <div className="text-right text-sm">
              <p>Hız: ×{barber.speed_multiplier}</p>
              <p className="text-neutral-500">
                {barber.auto_approve_appointments ? "Otomatik Onay" : "Manuel Onay"}
              </p>
            </div>
          </div>
        ))}
      </section>

      {ownerSalon && <AddEmployeeForm salonId={ownerSalon.id} />}
    </main>
  );
}
