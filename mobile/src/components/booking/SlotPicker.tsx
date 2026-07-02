import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import { useThemeStore } from "@/store/useThemeStore";
import type { TimeSlot } from "@/lib/slotCalculator";

interface SlotPickerProps {
  slots: TimeSlot[];
  selectedStart: Date | null;
  onSelect: (slot: TimeSlot) => void;
}

export function SlotPicker({ slots, selectedStart, onSelect }: SlotPickerProps) {
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
        return (
          <Pressable
            disabled={!item.isAvailable}
            onPress={() => onSelect(item)}
            style={[
              styles.slot,
              { backgroundColor: colors.surface, borderColor: colors.border },
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
});
