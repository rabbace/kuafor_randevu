import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import type { TimeSlot } from "@/lib/slotCalculator";

interface SlotPickerProps {
  slots: TimeSlot[];
  selectedStart: Date | null;
  onSelect: (slot: TimeSlot) => void;
}

export function SlotPicker({ slots, selectedStart, onSelect }: SlotPickerProps) {
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
              !item.isAvailable && styles.slotDisabled,
              isSelected && styles.slotSelected,
            ]}
          >
            <Text
              style={[
                styles.slotText,
                !item.isAvailable && styles.slotTextDisabled,
                isSelected && styles.slotTextSelected,
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
  row: { gap: 8, marginBottom: 8 },
  slot: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  slotDisabled: { backgroundColor: "#f2f2f2", borderColor: "#f2f2f2" },
  slotSelected: { backgroundColor: "#6D28D9", borderColor: "#6D28D9" },
  slotText: { fontWeight: "500" },
  slotTextDisabled: { color: "#bbb" },
  slotTextSelected: { color: "#fff" },
});
