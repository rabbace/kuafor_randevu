import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeStore } from "@/store/useThemeStore";
import type { TimeSlot } from "@/lib/slotCalculator";

interface SlotPickerProps {
  slots: TimeSlot[];
  selectedStart: Date | null;
  onSelect: (slot: TimeSlot) => void;
  /** Slot için indirim yüzdesi döner (yoksa 0) — sakin saat indirimleri. */
  discountFor?: (slot: TimeSlot) => number;
}

export function SlotPicker({ slots, selectedStart, onSelect, discountFor }: SlotPickerProps) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <FlatList
      data={slots}
      numColumns={3}
      scrollEnabled={false}
      keyExtractor={(item) => item.start.toISOString()}
      columnWrapperStyle={styles.row}
      renderItem={({ item }) => {
        const isSelected = selectedStart?.getTime() === item.start.getTime();
        const discount = item.isAvailable ? discountFor?.(item) ?? 0 : 0;
        return (
          <Pressable
            disabled={!item.isAvailable}
            onPress={() => onSelect(item)}
            style={[
              styles.slot,
              { backgroundColor: colors.surface, borderColor: colors.border },
              discount > 0 && { borderColor: "#16A34A" },
              !item.isAvailable && { backgroundColor: colors.border + "55", borderColor: "transparent" },
              isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.slotText,
                { color: colors.text },
                !item.isAvailable && { color: colors.textMuted, textDecorationLine: "line-through" },
                isSelected && { color: colors.primaryText, fontWeight: "700" },
              ]}
            >
              {item.start.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
            </Text>
            {discount > 0 && (
              <View style={[styles.discountBadge, { backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : "#16A34A" }]}>
                <Text style={styles.discountText}>%{discount}</Text>
              </View>
            )}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, marginBottom: 10 },
  slot: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
  },
  slotText: { fontWeight: "600", fontSize: 14 },
  discountBadge: {
    position: "absolute",
    top: -7,
    right: 6,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  discountText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});
