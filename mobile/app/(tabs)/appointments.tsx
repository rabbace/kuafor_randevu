import { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { AdBanner } from "@/components/ads/AdBanner";
import { ContactButtons } from "@/components/contact/ContactButtons";
import type { Appointment, Barber, Service } from "@/types/database";

const STATUS_LABELS: Record<string, string> = {
  pending: "Onay Bekliyor",
  confirmed: "Onaylandı",
  rejected: "Reddedildi",
  cancelled: "İptal Edildi",
  completed: "Tamamlandı",
  no_show: "Gelmedi",
};

export default function AppointmentsScreen() {
  const user = useAuthStore((s) => s.user);
  const colors = useThemeStore((s) => s.colors);
  const isBarber = user?.role === "barber" || user?.role === "salon_owner";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadAppointments() {
    if (!user?.id) return;

    if (isBarber) {
      const { data: barberRow } = await supabase
        .from("barbers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setBarber(barberRow as Barber | null);

      if (barberRow) {
        const [{ data: appts }, { data: svc }] = await Promise.all([
          supabase.from("appointments").select("*").eq("barber_id", barberRow.id).order("start_time"),
          supabase.from("services").select("*").eq("salon_id", barberRow.salon_id),
        ]);
        setAppointments(appts ?? []);
        setServices(svc ?? []);
      }
      return;
    }

    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("customer_id", user.id)
      .order("start_time", { ascending: true });
    setAppointments(data ?? []);
  }

  useEffect(() => {
    loadAppointments();
  }, [user?.id]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isBarber && barber && (
        <Pressable style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => setIsModalOpen(true)}>
          <Text style={styles.addButtonText}>+ Dışarıdan Randevu Ekle</Text>
        </Pressable>
      )}

      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.date, { color: colors.text }]}>
              {new Date(item.start_time).toLocaleString("tr-TR")}
            </Text>
            <Text style={[styles.status, { color: colors.textMuted }]}>{STATUS_LABELS[item.status]}</Text>
            {item.is_manual_entry && (
              <Text style={[styles.manualBadge, { color: colors.primary }]}>
                Elden Girildi · {item.manual_customer_name} {item.manual_customer_phone ? `(${item.manual_customer_phone})` : ""}
              </Text>
            )}
            {!isBarber && barber?.whatsapp_phone && <ContactButtons phone={barber.whatsapp_phone} />}
          </View>
        )}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Henüz randevu yok.</Text>}
      />
      <AdBanner />

      {isBarber && barber && (
        <ManualAppointmentModal
          visible={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          barber={barber}
          services={services}
          onCreated={() => {
            setIsModalOpen(false);
            loadAppointments();
          }}
        />
      )}
    </View>
  );
}

function ManualAppointmentModal({
  visible,
  onClose,
  barber,
  services,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  barber: Barber;
  services: Service[];
  onCreated: () => void;
}) {
  const colors = useThemeStore((s) => s.colors);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState<string | null>(services[0]?.id ?? null);
  const [dateTime, setDateTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate() {
    const service = services.find((s) => s.id === serviceId);
    if (!name.trim() || !service || !dateTime) return;

    const start = new Date(dateTime);
    const end = new Date(start.getTime() + service.base_duration_minutes * 60000);

    setIsSaving(true);
    const { error } = await supabase.from("appointments").insert({
      salon_id: barber.salon_id,
      barber_id: barber.id,
      service_id: service.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "confirmed",
      is_manual_entry: true,
      manual_customer_name: name.trim(),
      manual_customer_phone: phone.trim() || null,
      customer_id: null,
    });
    setIsSaving(false);

    if (!error) {
      setName("");
      setPhone("");
      setDateTime("");
      onCreated();
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Dışarıdan Randevu Ekle</Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Müşteri Adı"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Telefon (opsiyonel)"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Tarih/Saat (YYYY-AA-GG SS:dd)"
            placeholderTextColor={colors.textMuted}
            value={dateTime}
            onChangeText={setDateTime}
          />

          <View style={styles.serviceRow}>
            {services.map((s) => (
              <Pressable
                key={s.id}
                style={[
                  styles.serviceChip,
                  {
                    backgroundColor: serviceId === s.id ? colors.primary : colors.background,
                    borderColor: serviceId === s.id ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setServiceId(s.id)}
              >
                <Text style={{ color: serviceId === s.id ? "#fff" : colors.text, fontSize: 12 }}>{s.name}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.modalActions}>
            <Pressable style={[styles.modalButton, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.text }}>Vazgeç</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={handleCreate}
              disabled={isSaving}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>{isSaving ? "Kaydediliyor..." : "Ekle"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addButton: { margin: 16, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  addButtonText: { color: "#fff", fontWeight: "600" },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  date: { fontWeight: "600", marginBottom: 4 },
  status: {},
  manualBadge: { fontSize: 12, fontWeight: "600" },
  empty: { textAlign: "center", marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCard: { borderRadius: 16, padding: 20, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  serviceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  serviceChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalButton: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
});
