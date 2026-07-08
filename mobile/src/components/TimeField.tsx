import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "@/store/useThemeStore";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DateTimePicker = require("@react-native-community/datetimepicker").default;

interface TimeFieldProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  style?: object;
}

/** Elle yazmak yerine native saat seçici açan alan. */
export function TimeField({ value, onChange, style }: TimeFieldProps) {
  const colors = useThemeStore((s) => s.colors);
  const [show, setShow] = useState(false);

  const [h, m] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);

  return (
    <>
      <Pressable
        style={[styles.field, { backgroundColor: colors.background, borderColor: colors.border }, style]}
        onPress={() => setShow(true)}
      >
        <Ionicons name="time-outline" size={15} color={colors.textMuted} />
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>{value || "Seç"}</Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={date}
          mode="time"
          is24Hour
          minuteInterval={5}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_e: unknown, d?: Date) => {
            setShow(false);
            if (d) {
              const hh = String(d.getHours()).padStart(2, "0");
              const mm = String(d.getMinutes()).padStart(2, "0");
              onChange(`${hh}:${mm}`);
            }
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
});
